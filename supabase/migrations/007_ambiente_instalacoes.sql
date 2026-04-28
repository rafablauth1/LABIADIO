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
