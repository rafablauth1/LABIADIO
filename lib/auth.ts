/**
 * Abstração de autenticação.
 *
 * AGORA   → Supabase Auth com Microsoft Entra ID via OAuth
 *           (requer configuração no painel Supabase → Auth → Providers → Azure)
 *
 * FUTURO  → NextAuth.js com Azure AD diretamente (sem Supabase)
 *
 * Para migrar:
 *   1. npm install next-auth @auth/core
 *   2. Criar app/api/auth/[...nextauth]/route.ts com AzureAD provider
 *   3. Substituir useSession/signIn do Supabase pelos do NextAuth
 *   4. Variáveis necessárias: AUTH_MICROSOFT_ENTRA_ID_ID,
 *      AUTH_MICROSOFT_ENTRA_ID_SECRET, AUTH_MICROSOFT_ENTRA_ID_ISSUER
 */

export { createClient } from '@/lib/supabase/client'
