/**
 * Abstração de banco de dados.
 *
 * AGORA   → Supabase (PostgreSQL gerenciado)
 * FUTURO  → Azure PostgreSQL Flexible Server
 *
 * Para migrar: implemente lib/db/providers/azure-postgres.ts
 * e altere DB_PROVIDER=azure no .env.local.
 * Nenhum componente precisa mudar — só este arquivo.
 *
 * Compatibilidade de schema: as migrations em supabase/migrations/
 * são SQL padrão PostgreSQL e rodam sem alteração no Azure.
 */

export { createClient } from '@/lib/supabase/client'
export { createClient as createServerClient } from '@/lib/supabase/server'
