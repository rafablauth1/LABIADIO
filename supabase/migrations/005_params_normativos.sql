-- ════════════════════════════════════════════════════════════════
--  LABIADIO — Migration 005: Parâmetros Normativos no Plano
--  Execute no SQL Editor do Supabase
-- ════════════════════════════════════════════════════════════════

alter table planos_calibracao
  add column if not exists params_normativos jsonb default '[]';
