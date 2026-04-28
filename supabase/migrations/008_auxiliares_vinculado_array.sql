-- Migration 008: vinculado de text para text[] em auxiliares
alter table auxiliares
  alter column vinculado type text[]
  using case
    when vinculado is null or vinculado = '' then '{}'::text[]
    else array[vinculado]
  end;
