-- ════════════════════════════════════════════════════════════════
--  LABIADIO — Schema PostgreSQL / Supabase
--  Execute no SQL Editor do Supabase
-- ════════════════════════════════════════════════════════════════

-- Extensão para UUIDs
create extension if not exists "pgcrypto";

-- ── LABORATÓRIOS ──────────────────────────────────────────────────
create table if not exists laboratorios (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  cnpj        text,
  acreditacao text,
  created_at  timestamptz default now()
);

-- ── USUÁRIOS (mapeamento auth.users → lab + role) ─────────────────
create table if not exists lab_users (
  id         uuid primary key references auth.users(id) on delete cascade,
  lab_id     uuid references laboratorios(id),
  email      text not null,
  nome       text,
  role       text not null default 'tecnico' check (role in ('admin','tecnico','viewer')),
  avatar_url text,
  created_at timestamptz default now()
);

-- ── EQUIPAMENTOS ──────────────────────────────────────────────────
create table if not exists equipamentos (
  id         uuid primary key default gen_random_uuid(),
  lab_id     uuid references laboratorios(id),
  tag        text not null,
  descricao  text not null,
  tipo       text not null,
  fabricante text,
  serie      text,
  patrimonio text,
  local      text default 'Sala EMC',
  status     text not null default 'ativo' check (status in ('ativo','calibrar','fora')),
  status_obs text,
  normas     text[] default '{}',
  cal_data   date,
  cal_val    date,
  cal_per    integer default 12,
  chk_per    integer default 6,
  lab_cal    text,
  ncert      text,
  obs        text,
  photo_url  text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (lab_id, tag)
);

-- ── CERTIFICADOS ──────────────────────────────────────────────────
create table if not exists certificados (
  id          uuid primary key default gen_random_uuid(),
  equip_id    uuid references equipamentos(id) on delete cascade,
  numero      text not null,
  laboratorio text,
  emissao     date,
  acreditacao text,
  obs         text,
  pdf_path    text,   -- path no Supabase Storage (bucket: docs)
  analise_ia  jsonb,  -- campos extraídos pela IA
  created_at  timestamptz default now()
);

-- ── CHECAGENS ─────────────────────────────────────────────────────
create table if not exists checagens (
  id          uuid primary key default gen_random_uuid(),
  equip_id    uuid references equipamentos(id) on delete cascade,
  norma       text,
  data        date not null,
  tecnico     text,
  temperatura decimal(5,2),
  umidade     decimal(5,2),
  resultado   text not null default 'Conforme'
                check (resultado in ('Conforme','Não conforme','Parcialmente conforme')),
  medidos     jsonb default '{}',
  obs         text,
  created_at  timestamptz default now()
);

-- ── DOCUMENTOS (normas, ITs, PQs, manuais) ───────────────────────
create table if not exists documentos (
  id         uuid primary key default gen_random_uuid(),
  lab_id     uuid references laboratorios(id),
  tipo       text not null check (tipo in ('norma','manual','it','proc','cert','outro')),
  nome       text not null,
  codigo     text,
  versao     text,
  pdf_path   text,
  metadados  jsonb default '{}',
  created_at timestamptz default now()
);

-- ── AMBIENTE DIÁRIO ───────────────────────────────────────────────
create table if not exists ambiente_diario (
  id         uuid primary key default gen_random_uuid(),
  lab_id     uuid references laboratorios(id),
  data       date not null,
  temp_max   decimal(5,2) not null,
  temp_min   decimal(5,2),
  umidade    decimal(5,2) not null,
  pressao    decimal(7,2),
  local      text,
  tecnico    text,
  obs        text,
  created_at timestamptz default now(),
  unique (lab_id, data)
);

-- ── AUMENTO DE PERIODICIDADE ──────────────────────────────────────
create table if not exists aumento_periodico (
  id           uuid primary key default gen_random_uuid(),
  equip_id     uuid references equipamentos(id) on delete cascade,
  per_atual    integer not null,
  per_proposto integer not null,
  justificativa text not null,
  norma_base   text,
  status       text not null default 'Em análise'
                 check (status in ('Em análise','Aprovado','Reprovado','Pendente')),
  pdf_path     text,
  created_at   timestamptz default now()
);

-- ════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY — cada lab só vê seus dados
-- ════════════════════════════════════════════════════════════════

-- Função helper para pegar lab_id do usuário atual
create or replace function get_user_lab_id()
returns uuid language sql security definer as $$
  select lab_id from lab_users where id = auth.uid()
$$;

-- EQUIPAMENTOS
alter table equipamentos enable row level security;
create policy "equip_lab_isolation" on equipamentos
  using (lab_id = get_user_lab_id());
create policy "equip_insert" on equipamentos for insert
  with check (lab_id = get_user_lab_id());
create policy "equip_update" on equipamentos for update
  using (lab_id = get_user_lab_id());
create policy "equip_delete" on equipamentos for delete
  using (lab_id = get_user_lab_id());

-- CERTIFICADOS (herdam via equipamento)
alter table certificados enable row level security;
create policy "cert_lab_isolation" on certificados
  using (equip_id in (select id from equipamentos where lab_id = get_user_lab_id()));

-- CHECAGENS
alter table checagens enable row level security;
create policy "chk_lab_isolation" on checagens
  using (equip_id in (select id from equipamentos where lab_id = get_user_lab_id()));

-- DOCUMENTOS
alter table documentos enable row level security;
create policy "doc_lab_isolation" on documentos
  using (lab_id = get_user_lab_id());

-- AMBIENTE
alter table ambiente_diario enable row level security;
create policy "amb_lab_isolation" on ambiente_diario
  using (lab_id = get_user_lab_id());

-- ════════════════════════════════════════════════════════════════
--  TRIGGER: atualizar updated_at automaticamente
-- ════════════════════════════════════════════════════════════════
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_equip_updated_at
  before update on equipamentos
  for each row execute function update_updated_at();

-- ════════════════════════════════════════════════════════════════
--  STORAGE BUCKET para PDFs
--  (Execute no Dashboard Supabase → Storage)
-- ════════════════════════════════════════════════════════════════
-- insert into storage.buckets (id, name, public) values ('docs', 'docs', false);
