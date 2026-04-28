-- Migration 009: sensor_pos em instalacoes + correcoes em ambiente_diario
alter table instalacoes
  add column if not exists sensor_pos text
  check (sensor_pos in ('interno', 'externo'))
  default 'interno';

alter table ambiente_diario
  add column if not exists correcoes jsonb;
