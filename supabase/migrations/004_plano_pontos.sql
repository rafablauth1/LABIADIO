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
