-- ════════════════════════════════════════════════════════════════
--  LABIADIO — All Migrations (safe to re-run)
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── LABORATÓRIOS ──────────────────────────────────────────────────
create table if not exists laboratorios (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  cnpj        text,
  acreditacao text,
  created_at  timestamptz default now()
);

-- ── USUÁRIOS ──────────────────────────────────────────────────────
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
  pdf_path    text,
  analise_ia  jsonb,
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
  obs         text,
  created_at  timestamptz default now()
);

-- ── AUXILIARES ────────────────────────────────────────────────────
create table if not exists auxiliares (
  id         uuid primary key default gen_random_uuid(),
  lab_id     uuid references laboratorios(id),
  tag        text not null,
  categoria  text not null,
  descricao  text not null,
  vinculado  text,
  manut      date,
  obs        text,
  photo_url  text,
  created_at timestamptz default now()
);

-- ── CONTROLE DE CHECAGENS ─────────────────────────────────────────
create table if not exists controle_checagens (
  id          uuid primary key default gen_random_uuid(),
  equip_id    uuid references equipamentos(id) on delete cascade,
  lab_id      uuid references laboratorios(id),
  data_prev   date,
  data_real   date,
  status      text default 'pendente',
  obs         text,
  created_at  timestamptz default now()
);

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

-- ── SOFTWARES / FIRMWARES ─────────────────────────────────────────
create table if not exists softwares (
  id         uuid primary key default gen_random_uuid(),
  lab_id     uuid references laboratorios(id),
  equip_tag  text,
  tipo       text,
  nome       text not null,
  versao     text,
  data       date,
  validado   text default 'Pendente',
  obs        text,
  created_at timestamptz default now()
);

-- ── NORMAS ───────────────────────────────────────────────────────
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

-- ── PLANOS DE CALIBRAÇÃO ──────────────────────────────────────────
create table if not exists planos_calibracao (
  id                uuid primary key default gen_random_uuid(),
  lab_id            uuid references laboratorios(id),
  equip_id          uuid references equipamentos(id),
  tag               text not null,
  laboratorio       text,
  periodicidade     integer default 12,
  ultima            date,
  proxima           date,
  ncert             text,
  escopo            text,
  grandezas         text[] default '{}',
  pontos            jsonb  default '[]',
  params_normativos jsonb  default '[]',
  created_at        timestamptz default now()
);

-- ── GRANDEZAS ────────────────────────────────────────────────────
create table if not exists grandezas (
  id         uuid primary key default gen_random_uuid(),
  lab_id     uuid references laboratorios(id),
  nome       text not null,
  simbolo    text,
  unidade    text,
  categoria  text,
  created_at timestamptz default now()
);

-- ── MEDIDORES ────────────────────────────────────────────────────
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

-- ── INSTALAÇÕES ──────────────────────────────────────────────────
create table if not exists instalacoes (
  id         uuid primary key default gen_random_uuid(),
  lab_id     uuid references laboratorios(id),
  predio     text,
  bloco      text,
  sala       text not null,
  area       text,
  equip_id   uuid references equipamentos(id) on delete set null,
  temp_min   decimal(5,2),
  temp_max   decimal(5,2),
  umid_min   decimal(5,2),
  umid_max   decimal(5,2),
  ativo      boolean default true,
  created_at timestamptz default now()
);

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
  created_at     timestamptz default now()
);

-- ── FUNÇÃO: get_user_lab_id ───────────────────────────────────────
create or replace function get_user_lab_id()
returns uuid language sql security definer stable as $$
  select lab_id from lab_users where id = auth.uid() limit 1;
$$;

-- ── RLS ──────────────────────────────────────────────────────────
alter table equipamentos       enable row level security;
alter table certificados       enable row level security;
alter table checagens          enable row level security;
alter table auxiliares         enable row level security;
alter table controle_checagens enable row level security;
alter table manuais            enable row level security;
alter table softwares          enable row level security;
alter table normas             enable row level security;
alter table instrucoes_trabalho enable row level security;
alter table procedimentos      enable row level security;
alter table planos_calibracao  enable row level security;
alter table grandezas          enable row level security;
alter table medidores          enable row level security;
alter table instalacoes        enable row level security;
alter table ambiente_diario    enable row level security;

-- drop + create policies (safe re-run)
drop policy if exists "equip_lab_isolation" on equipamentos;
create policy "equip_lab_isolation" on equipamentos for all
  using (lab_id = get_user_lab_id()) with check (lab_id = get_user_lab_id());

drop policy if exists "cert_lab" on certificados;
create policy "cert_lab" on certificados for all
  using (equip_id in (select id from equipamentos where lab_id = get_user_lab_id()))
  with check (equip_id in (select id from equipamentos where lab_id = get_user_lab_id()));

drop policy if exists "chk_lab" on checagens;
create policy "chk_lab" on checagens for all
  using (equip_id in (select id from equipamentos where lab_id = get_user_lab_id()))
  with check (equip_id in (select id from equipamentos where lab_id = get_user_lab_id()));

drop policy if exists "aux_lab" on auxiliares;
create policy "aux_lab" on auxiliares for all
  using (lab_id = get_user_lab_id()) with check (lab_id = get_user_lab_id());

drop policy if exists "ctrl_lab" on controle_checagens;
create policy "ctrl_lab" on controle_checagens for all
  using (lab_id = get_user_lab_id()) with check (lab_id = get_user_lab_id());

drop policy if exists "manuais_lab" on manuais;
create policy "manuais_lab" on manuais for all
  using (lab_id = get_user_lab_id()) with check (lab_id = get_user_lab_id());

drop policy if exists "sw_lab" on softwares;
create policy "sw_lab" on softwares for all
  using (lab_id = get_user_lab_id()) with check (lab_id = get_user_lab_id());

drop policy if exists "norma_lab" on normas;
create policy "norma_lab" on normas for all
  using (lab_id = get_user_lab_id()) with check (lab_id = get_user_lab_id());

drop policy if exists "it_lab" on instrucoes_trabalho;
create policy "it_lab" on instrucoes_trabalho for all
  using (lab_id = get_user_lab_id()) with check (lab_id = get_user_lab_id());

drop policy if exists "proc_lab" on procedimentos;
create policy "proc_lab" on procedimentos for all
  using (lab_id = get_user_lab_id()) with check (lab_id = get_user_lab_id());

drop policy if exists "plan_lab" on planos_calibracao;
create policy "plan_lab" on planos_calibracao for all
  using (lab_id = get_user_lab_id()) with check (lab_id = get_user_lab_id());

drop policy if exists "grand_lab" on grandezas;
create policy "grand_lab" on grandezas for all
  using (lab_id = get_user_lab_id()) with check (lab_id = get_user_lab_id());

drop policy if exists "med_lab" on medidores;
create policy "med_lab" on medidores for all
  using (lab_id = get_user_lab_id()) with check (lab_id = get_user_lab_id());

drop policy if exists "inst_lab" on instalacoes;
create policy "inst_lab" on instalacoes for all
  using (lab_id = get_user_lab_id()) with check (lab_id = get_user_lab_id());

drop policy if exists "amb_lab" on ambiente_diario;
create policy "amb_lab" on ambiente_diario for all
  using (lab_id = get_user_lab_id()) with check (lab_id = get_user_lab_id());

-- ── STORAGE: bucket docs ──────────────────────────────────────────
drop policy if exists "docs_insert" on storage.objects;
create policy "docs_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'docs');

drop policy if exists "docs_select" on storage.objects;
create policy "docs_select" on storage.objects for select to authenticated
  using (bucket_id = 'docs');

drop policy if exists "docs_update" on storage.objects;
create policy "docs_update" on storage.objects for update to authenticated
  using (bucket_id = 'docs');

drop policy if exists "docs_delete" on storage.objects;
create policy "docs_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'docs');
