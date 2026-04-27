-- ════════════════════════════════════════════════════════════════
--  LABIADIO — Migration 006: Tabelas de documentos + Storage
--  Execute no SQL Editor do Supabase
-- ════════════════════════════════════════════════════════════════

-- ── MANUAIS ──────────────────────────────────────────────────────
create table if not exists manuais (
  id         uuid primary key default gen_random_uuid(),
  lab_id     uuid references laboratorios(id),
  equip_tag  text,
  tipo       text not null default 'Manual do Usuário',
  titulo     text not null,
  revisao    text,
  pdf_path   text,
  created_at timestamptz default now()
);
alter table manuais enable row level security;
create policy if not exists "manuais_lab" on manuais for all
  using  (lab_id = get_user_lab_id())
  with check (lab_id = get_user_lab_id());

-- ── INSTRUÇÕES DE TRABALHO ────────────────────────────────────────
create table if not exists instrucoes_trabalho (
  id           uuid primary key default gen_random_uuid(),
  lab_id       uuid references laboratorios(id),
  codigo       text not null,
  revisao      text,
  titulo       text not null,
  tags         text,
  data         date,
  aprovado_por text,
  status       text default 'Vigente',
  pdf_path     text,
  created_at   timestamptz default now()
);
alter table instrucoes_trabalho enable row level security;
create policy if not exists "it_lab" on instrucoes_trabalho for all
  using  (lab_id = get_user_lab_id())
  with check (lab_id = get_user_lab_id());

-- ── PROCEDIMENTOS ─────────────────────────────────────────────────
create table if not exists procedimentos (
  id           uuid primary key default gen_random_uuid(),
  lab_id       uuid references laboratorios(id),
  codigo       text not null,
  versao       text,
  descricao    text not null,
  normas       text[] default '{}',
  padroes      text,
  data         date,
  aprovado_por text,
  escopo       text,
  pdf_path     text,
  created_at   timestamptz default now()
);
alter table procedimentos enable row level security;
create policy if not exists "proc_lab" on procedimentos for all
  using  (lab_id = get_user_lab_id())
  with check (lab_id = get_user_lab_id());

-- ── STORAGE: bucket docs — políticas de acesso ────────────────────
-- (o bucket precisa ser criado manualmente no dashboard se não existir)
create policy if not exists "docs_insert" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'docs');

create policy if not exists "docs_select" on storage.objects for select
  to authenticated
  using (bucket_id = 'docs');

create policy if not exists "docs_update" on storage.objects for update
  to authenticated
  using (bucket_id = 'docs');

create policy if not exists "docs_delete" on storage.objects for delete
  to authenticated
  using (bucket_id = 'docs');
