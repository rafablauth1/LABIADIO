/**
 * Provider Azure PostgreSQL Flexible Server
 *
 * QUANDO MIGRAR — passos:
 *   1. portal.azure.com → Azure Database for PostgreSQL → Criar servidor
 *   2. Copiar connection string para AZURE_POSTGRES_URL no .env.local
 *   3. Executar as migrations: psql $AZURE_POSTGRES_URL -f supabase/migrations/001_init.sql
 *   4. Instalar: npm install pg @types/pg
 *   5. Substituir o conteúdo de lib/db/index.ts para usar este provider
 *   6. Remover as políticas RLS (não suportadas fora do Supabase) e
 *      implementar autorização no nível da aplicação (middleware Next.js)
 *
 * VARIÁVEIS NECESSÁRIAS:
 *   AZURE_POSTGRES_URL=postgresql://user:pass@servidor.postgres.database.azure.com:5432/labiadio?sslmode=require
 *
 * EXEMPLO DE USO FUTURO (com lib `pg`):
 *
 *   import { Pool } from 'pg'
 *   const pool = new Pool({ connectionString: process.env.AZURE_POSTGRES_URL })
 *   export const query = (text: string, params?: any[]) => pool.query(text, params)
 *
 * DIFERENÇAS DO SUPABASE:
 *   - Sem RLS nativo → usar middleware de autenticação
 *   - Sem supabase.rpc() → usar funções SQL diretas
 *   - Sem Realtime → usar polling ou Azure SignalR
 *   - Sem Storage → usar Azure Blob Storage (ver lib/storage/)
 */

export {}
