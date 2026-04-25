/**
 * Provider NextAuth.js + Microsoft Entra ID
 *
 * QUANDO MIGRAR — passos completos:
 *
 *   1. npm install next-auth
 *
 *   2. Criar arquivo: app/api/auth/[...nextauth]/route.ts
 *      ─────────────────────────────────────────────────
 *      import NextAuth from 'next-auth'
 *      import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'
 *
 *      const handler = NextAuth({
 *        providers: [
 *          MicrosoftEntraID({
 *            clientId:     process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
 *            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
 *            issuer:       process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
 *          }),
 *        ],
 *        callbacks: {
 *          session({ session, token }) {
 *            // adicionar lab_id ao session via DB lookup
 *            return session
 *          },
 *        },
 *      })
 *      export { handler as GET, handler as POST }
 *      ─────────────────────────────────────────────────
 *
 *   3. Atualizar app/auth/login/page.tsx:
 *      import { signIn } from 'next-auth/react'
 *      signIn('microsoft-entra-id', { callbackUrl: '/dashboard' })
 *
 *   4. Atualizar app/dashboard/layout.tsx para usar getServerSession()
 *
 *   5. Variáveis de ambiente necessárias:
 *      AUTH_SECRET=chave-aleatoria-32-chars (openssl rand -base64 32)
 *      AUTH_MICROSOFT_ENTRA_ID_ID=client-id-do-app-azure
 *      AUTH_MICROSOFT_ENTRA_ID_SECRET=client-secret-do-app-azure
 *      AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/TENANT_ID/v2.0
 *
 *   6. Azure App Registration (portal.azure.com):
 *      - Redirect URI: https://seudominio.com/api/auth/callback/microsoft-entra-id
 *      - Permissões: openid, email, profile, User.Read
 *      - Tipos de conta: "Accounts in this organizational directory only (PUCRS)"
 *
 * FILTRAR APENAS @pucrs.br:
 *   No callback signIn:
 *     if (!profile?.email?.endsWith('@pucrs.br')) return false
 */

export {}
