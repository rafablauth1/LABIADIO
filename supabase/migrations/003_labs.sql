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
