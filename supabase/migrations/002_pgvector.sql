-- ════════════════════════════════════════════════════════════════
--  LABIADIO — Migration 002: pgvector + RAG
--  Execute no SQL Editor do Supabase ANTES da Sprint 4
-- ════════════════════════════════════════════════════════════════

-- Habilitar extensão pgvector
create extension if not exists vector;

-- ── Adicionar coluna embedding à tabela documentos ───────────────
alter table documentos
  add column if not exists conteudo_texto text,     -- texto extraído do PDF
  add column if not exists embedding      vector(1536), -- embedding Claude/OpenAI
  add column if not exists chunk_index    integer default 0, -- para docs grandes
  add column if not exists token_count    integer;  -- para controle de contexto

-- ── Índice para busca por similaridade (IVFFlat) ─────────────────
-- Melhor para datasets < 1M vetores. Usar HNSW para > 1M.
create index if not exists idx_doc_embedding
  on documentos
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ── Tabela de chunks (para documentos longos) ────────────────────
-- Documentos grandes são divididos em chunks de ~500 tokens
create table if not exists documento_chunks (
  id          uuid primary key default gen_random_uuid(),
  doc_id      uuid references documentos(id) on delete cascade,
  lab_id      uuid references laboratorios(id),
  chunk_index integer not null,
  conteudo    text not null,
  embedding   vector(1536),
  token_count integer,
  created_at  timestamptz default now()
);

-- Índice de busca nos chunks
create index if not exists idx_chunk_embedding
  on documento_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RLS nos chunks
alter table documento_chunks enable row level security;
create policy "chunks_lab_isolation" on documento_chunks
  using (lab_id = get_user_lab_id());

-- ── Tabela de histórico de chat ───────────────────────────────────
create table if not exists chat_historico (
  id          uuid primary key default gen_random_uuid(),
  lab_id      uuid references laboratorios(id),
  user_id     uuid references auth.users(id),
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  fontes      jsonb default '[]', -- docs usados como contexto
  created_at  timestamptz default now()
);

alter table chat_historico enable row level security;
create policy "chat_lab_isolation" on chat_historico
  using (lab_id = get_user_lab_id());

-- ── Função de busca semântica por chunks ─────────────────────────
create or replace function match_chunks(
  query_embedding vector(1536),
  match_count     int      default 5,
  p_lab_id        uuid     default null
)
returns table (
  id         uuid,
  doc_id     uuid,
  conteudo   text,
  similarity float,
  doc_nome   text,
  doc_tipo   text
)
language sql stable as $$
  select
    dc.id,
    dc.doc_id,
    dc.conteudo,
    1 - (dc.embedding <=> query_embedding) as similarity,
    d.nome  as doc_nome,
    d.tipo  as doc_tipo
  from documento_chunks dc
  join documentos d on d.id = dc.doc_id
  where
    dc.lab_id = coalesce(p_lab_id, get_user_lab_id())
    and dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding) > 0.5  -- threshold mínimo
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

-- ── Função de busca semântica por documento completo ─────────────
create or replace function match_documents(
  query_embedding vector(1536),
  match_count     int  default 5,
  p_lab_id        uuid default null
)
returns table (
  id         uuid,
  nome       text,
  tipo       text,
  conteudo   text,
  similarity float
)
language sql stable as $$
  select
    d.id,
    d.nome,
    d.tipo,
    d.conteudo_texto,
    1 - (d.embedding <=> query_embedding) as similarity
  from documentos d
  where
    d.lab_id = coalesce(p_lab_id, get_user_lab_id())
    and d.embedding is not null
    and 1 - (d.embedding <=> query_embedding) > 0.5
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- ── Tabela de tarefas (para Áudio → Prompt, Sprint 7) ────────────
create table if not exists tarefas (
  id           uuid primary key default gen_random_uuid(),
  lab_id       uuid references laboratorios(id),
  criado_por   uuid references auth.users(id),
  titulo       text not null,
  descricao    text,
  responsavel  text,
  prazo        date,
  status       text default 'pendente' check (status in ('pendente','em_andamento','concluido','cancelado')),
  origem       text check (origem in ('manual','audio','ia','sistema')),
  audio_id     uuid,  -- referência ao áudio que gerou a tarefa
  equip_tag    text,  -- equipamento relacionado (se houver)
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table tarefas enable row level security;
create policy "tarefas_lab_isolation" on tarefas
  using (lab_id = get_user_lab_id());
create policy "tarefas_insert" on tarefas for insert
  with check (lab_id = get_user_lab_id());
create policy "tarefas_update" on tarefas for update
  using (lab_id = get_user_lab_id());

create trigger trg_tarefas_updated_at
  before update on tarefas
  for each row execute function update_updated_at();

-- ── Tabela de áudios transcritos (Sprint 7) ──────────────────────
create table if not exists audios (
  id            uuid primary key default gen_random_uuid(),
  lab_id        uuid references laboratorios(id),
  enviado_por   uuid references auth.users(id),
  nome_arquivo  text,
  duracao_seg   integer,
  transcricao   text,
  resumo        text,
  decisoes      jsonb default '[]',  -- array de strings
  prompt_gerado text,
  status        text default 'processando' check (status in ('processando','concluido','erro')),
  created_at    timestamptz default now()
);

alter table audios enable row level security;
create policy "audios_lab_isolation" on audios
  using (lab_id = get_user_lab_id());

-- ── Tabela de formulários (Sprint 6) ─────────────────────────────
create table if not exists formularios (
  id           uuid primary key default gen_random_uuid(),
  lab_id       uuid references laboratorios(id),
  criado_por   uuid references auth.users(id),
  aprovado_por uuid references auth.users(id),
  titulo       text not null,
  descricao    text,
  status       text default 'rascunho' check (status in ('rascunho','aguardando_aprovacao','aprovado','devolvido','publicado')),
  estrutura    jsonb default '{}',   -- campos, seções, validações geradas pela IA
  comentarios  text,                  -- feedback do ADMIN ao devolver
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table formularios enable row level security;
create policy "form_lab_isolation" on formularios
  using (lab_id = get_user_lab_id());

create trigger trg_forms_updated_at
  before update on formularios
  for each row execute function update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- FIM DA MIGRATION 002
-- Verificar com: select * from pg_extension where extname = 'vector';
-- ═══════════════════════════════════════════════════════════════
