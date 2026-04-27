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
