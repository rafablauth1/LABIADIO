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
-- ════════════════════════════════════════════════════════════════
--  LABIADIO — Migration 002: Normas, Planos, Medidores, Grandezas
--  Execute no SQL Editor do Supabase
-- ════════════════════════════════════════════════════════════════

-- ── NORMAS ────────────────────────────────────────────────────────
create table if not exists normas (
  id         uuid primary key default gen_random_uuid(),
  lab_id     uuid references laboratorios(id),
  norma      text not null,
  versao     text,
  titulo     text not null,
  ensaio     text,
  obs        text,
  pdf_path   text,
  pdfs       jsonb default '[]',
  created_at timestamptz default now()
);

alter table normas enable row level security;
create policy if not exists "norma_select" on normas for select
  using (lab_id = get_user_lab_id() or lab_id is null);
create policy if not exists "norma_insert" on normas for insert
  with check (lab_id = get_user_lab_id() or lab_id is null);
create policy if not exists "norma_update" on normas for update
  using (lab_id = get_user_lab_id() or lab_id is null);
create policy if not exists "norma_delete" on normas for delete
  using (lab_id = get_user_lab_id() or lab_id is null);

-- ── PLANOS DE CALIBRAÇÃO ──────────────────────────────────────────
create table if not exists planos_calibracao (
  id            uuid primary key default gen_random_uuid(),
  lab_id        uuid references laboratorios(id),
  tag           text not null,
  laboratorio   text,
  periodicidade integer default 12,
  ultima        date,
  proxima       date,
  ncert         text,
  escopo        text,
  grandezas     text[] default '{}',
  created_at    timestamptz default now()
);

alter table planos_calibracao enable row level security;
create policy if not exists "plan_select" on planos_calibracao for select
  using (lab_id = get_user_lab_id() or lab_id is null);
create policy if not exists "plan_insert" on planos_calibracao for insert
  with check (lab_id = get_user_lab_id() or lab_id is null);
create policy if not exists "plan_update" on planos_calibracao for update
  using (lab_id = get_user_lab_id() or lab_id is null);
create policy if not exists "plan_delete" on planos_calibracao for delete
  using (lab_id = get_user_lab_id() or lab_id is null);

-- ── MEDIDORES AMBIENTAIS ──────────────────────────────────────────
create table if not exists medidores (
  id          uuid primary key default gen_random_uuid(),
  lab_id      uuid references laboratorios(id),
  tipo        text not null,
  descricao   text,
  serie       text,
  patrimonio  text,
  sala        text,
  unidade     text,
  limite_min  decimal(10,3),
  limite_max  decimal(10,3),
  cal_val     date,
  ativo       boolean default true,
  created_at  timestamptz default now()
);

alter table medidores enable row level security;
create policy if not exists "med_select" on medidores for select
  using (lab_id = get_user_lab_id());
create policy if not exists "med_insert" on medidores for insert
  with check (lab_id = get_user_lab_id());
create policy if not exists "med_update" on medidores for update
  using (lab_id = get_user_lab_id());
create policy if not exists "med_delete" on medidores for delete
  using (lab_id = get_user_lab_id());

-- ── GRANDEZAS CUSTOMIZADAS ────────────────────────────────────────
create table if not exists grandezas (
  id         uuid primary key default gen_random_uuid(),
  lab_id     uuid references laboratorios(id),
  nome       text not null,
  simbolo    text,
  unidade    text,
  categoria  text,
  created_at timestamptz default now()
);

alter table grandezas enable row level security;
create policy if not exists "grand_select" on grandezas for select
  using (lab_id = get_user_lab_id());
create policy if not exists "grand_insert" on grandezas for insert
  with check (lab_id = get_user_lab_id());
create policy if not exists "grand_update" on grandezas for update
  using (lab_id = get_user_lab_id());
create policy if not exists "grand_delete" on grandezas for delete
  using (lab_id = get_user_lab_id());
-- ════════════════════════════════════════════════════════════════
--  LABIADIO — Migration 003: Laboratórios e usuário admin
--  Execute no SQL Editor do Supabase
-- ════════════════════════════════════════════════════════════════

-- ── LABORATÓRIOS (um por departamento) ──────────────────────────
insert into laboratorios (id, nome) values
  ('00000000-0000-0000-0000-000000000001', 'EMC'),
  ('00000000-0000-0000-0000-000000000002', 'DOM'),
  ('00000000-0000-0000-0000-000000000003', 'LAIF'),
  ('00000000-0000-0000-0000-000000000004', 'CAL'),
  ('00000000-0000-0000-0000-000000000005', 'TEL'),
  ('00000000-0000-0000-0000-000000000006', 'LML')
on conflict (id) do update set nome = excluded.nome;

-- ── USUÁRIO ADMIN (Rafael) ───────────────────────────────────────
-- Substitua o email abaixo caso necessário.
-- Se o usuário ainda não fez login, rode APÓS o primeiro login.
insert into lab_users (id, lab_id, email, nome, role)
select
  au.id,
  '00000000-0000-0000-0000-000000000001',   -- lab principal: EMC
  au.email,
  coalesce(au.raw_user_meta_data->>'full_name', au.email),
  'admin'
from auth.users au
where au.email = 'rafablauth1@gmail.com'
on conflict (id) do update
  set role   = 'admin',
      lab_id = '00000000-0000-0000-0000-000000000001';
-- ════════════════════════════════════════════════════════════════
--  LABIADIO — Migration 004: Pontos no Plano de Calibração
--  Execute no SQL Editor do Supabase
-- ════════════════════════════════════════════════════════════════

-- Adiciona coluna de pontos de calibração (array de objetos JSON)
alter table planos_calibracao
  add column if not exists pontos jsonb default '[]';

-- Adiciona equip_id como FK opcional para join direto (retrocompatível)
alter table planos_calibracao
  add column if not exists equip_id uuid references equipamentos(id) on delete set null;
-- ════════════════════════════════════════════════════════════════
--  LABIADIO — Migration 005: Parâmetros Normativos no Plano
--  Execute no SQL Editor do Supabase
-- ════════════════════════════════════════════════════════════════

alter table planos_calibracao
  add column if not exists params_normativos jsonb default '[]';
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
-- ════════════════════════════════════════════════════════════════
--  LABIADIO — Migration 007: Instalações e Ambiente Diário
--  Execute no SQL Editor do Supabase
-- ════════════════════════════════════════════════════════════════

-- ── INSTALAÇÕES (salas monitoradas) ──────────────────────────────
create table if not exists instalacoes (
  id         uuid primary key default gen_random_uuid(),
  lab_id     uuid references laboratorios(id),
  predio     text,
  bloco      text,
  sala       text not null,
  area       text,
  equip_id   uuid references equipamentos(id) on delete set null,  -- termohigrômetro vinculado
  temp_min   decimal(5,2),
  temp_max   decimal(5,2),
  umid_min   decimal(5,2),
  umid_max   decimal(5,2),
  ativo      boolean default true,
  created_at timestamptz default now()
);

alter table instalacoes enable row level security;
create policy if not exists "inst_select" on instalacoes for select using (lab_id = get_user_lab_id());
create policy if not exists "inst_insert" on instalacoes for insert with check (lab_id = get_user_lab_id());
create policy if not exists "inst_update" on instalacoes for update using (lab_id = get_user_lab_id());
create policy if not exists "inst_delete" on instalacoes for delete using (lab_id = get_user_lab_id());

-- ── AMBIENTE DIÁRIO ───────────────────────────────────────────────
create table if not exists ambiente_diario (
  id             uuid primary key default gen_random_uuid(),
  lab_id         uuid references laboratorios(id),
  instalacao_id  uuid references instalacoes(id) on delete set null,
  data           date not null,
  temp_max       decimal(5,2),
  temp_min       decimal(5,2),
  umidade        decimal(5,2),
  pressao        decimal(7,2),
  tecnico        text,
  obs            text,
  created_at     timestamptz default now(),
  unique (lab_id, instalacao_id, data)
);

alter table ambiente_diario enable row level security;
create policy if not exists "amb_select" on ambiente_diario for select using (lab_id = get_user_lab_id());
create policy if not exists "amb_insert" on ambiente_diario for insert with check (lab_id = get_user_lab_id());
create policy if not exists "amb_update" on ambiente_diario for update using (lab_id = get_user_lab_id());
create policy if not exists "amb_delete" on ambiente_diario for delete using (lab_id = get_user_lab_id());

-- Adicionar colunas a tabelas existentes (caso já existam)
alter table ambiente_diario add column if not exists lab_id uuid references laboratorios(id);
alter table ambiente_diario add column if not exists instalacao_id uuid references instalacoes(id) on delete set null;
