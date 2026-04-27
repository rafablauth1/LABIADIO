# LABIADIO — Guia de Configuração OAuth + Deploy
> Passo a passo para finalizar a Sprint 1

---

## PARTE 1 — Google OAuth (Login Google)

### 1.1 Criar projeto no Google Cloud Console

1. Acesse: **console.cloud.google.com**
2. Clique em **"Select a project"** → **"New Project"**
   - Nome: `LABIADIO`
   - Clique **Create**

3. No menu lateral → **APIs & Services** → **OAuth consent screen**
   - User Type: **External** → Create
   - App name: `LABIADIO`
   - User support email: seu email
   - Developer contact: seu email
   - Clique **Save and Continue** (3x)
   - Clique **Back to Dashboard**

4. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `LABIADIO Web`
   - Authorized redirect URIs → **Add URI**:
     ```
     https://bcndypwyeoymihsxzbsv.supabase.co/auth/v1/callback
     ```
   - Clique **Create**
   - Copie: **Client ID** e **Client Secret**

---

### 1.2 Configurar no Supabase Auth

1. Acesse: **supabase.com/dashboard/project/bcndypwyeoymihsxzbsv**
2. Menu lateral → **Authentication** → **Providers**
3. Clique em **Google**
4. Toggle **Enable** → ON
5. Cole:
   - **Client ID** (do Google Cloud)
   - **Client Secret** (do Google Cloud)
6. Clique **Save**

---

### 1.3 Testar o Login

No terminal do projeto:
```bash
npm run dev
```

Acesse `http://localhost:3000` → clique **Entrar com Google**

✅ Deve redirecionar para o Google, selecionar conta e voltar para `/dashboard`

Se der erro de redirect, verifique se a URI está exata:
```
https://bcndypwyeoymihsxzbsv.supabase.co/auth/v1/callback
```

---

### 1.4 Criar usuário admin no banco

Após fazer login pela primeira vez, execute no **Supabase SQL Editor**:

```sql
-- Criar laboratório EMC
INSERT INTO laboratorios (id, nome, acreditacao)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Laboratório EMC — LABELO PUCRS',
  'CGCRE-123'
) ON CONFLICT DO NOTHING;

-- Vincular seu usuário como admin
-- (substitua o email pelo seu)
INSERT INTO lab_users (id, lab_id, email, nome, role)
SELECT
  auth.users.id,
  'a0000000-0000-0000-0000-000000000001',
  auth.users.email,
  COALESCE(auth.users.raw_user_meta_data->>'full_name', auth.users.email),
  'admin'
FROM auth.users
WHERE auth.users.email = 'SEU_EMAIL@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

---

## PARTE 2 — Deploy na Vercel

### 2.1 Subir o código para o GitHub

No terminal do projeto:
```bash
cd C:\Users\Rafael\Documents\LABIADIO\labiadio-projeto\labiadio

# Inicializar Git
git init
git add .
git commit -m "feat: Sprint 1 - Next.js 14 + Supabase + login page"

# Conectar ao repositório (já criado em github.com/rafablauth1/LABIADIO)
git remote add origin https://github.com/rafablauth1/LABIADIO.git
git branch -M main
git push -u origin main
```

---

### 2.2 Deploy na Vercel

1. Acesse: **vercel.com** → **Add New Project**
2. **Import Git Repository** → selecione `rafablauth1/LABIADIO`
3. **Configure Project:**
   - Framework Preset: **Next.js** (detectado automaticamente)
   - Root Directory: `./` (padrão)
4. **Environment Variables** — adicione TODAS as variáveis:

   | Nome | Valor |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://bcndypwyeoymihsxzbsv.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_IJcwkLJPZFW5AjAHVKhB9g_fGzCbBNZ` |
   | `SUPABASE_SERVICE_ROLE_KEY` | *(valor rotacionado)* |
   | `ANTHROPIC_API_KEY` | *(valor rotacionado)* |
   | `NEXT_PUBLIC_APP_URL` | `https://labiadio.vercel.app` |
   | `NEXT_PUBLIC_APP_NAME` | `LABIADIO` |

5. Clique **Deploy**

---

### 2.3 Adicionar URL de produção no Google OAuth

Depois que a Vercel gerar a URL (ex: `labiadio.vercel.app`):

1. Volte ao Google Cloud Console → Credentials → sua OAuth App
2. **Authorized redirect URIs** → adicionar:
   ```
   https://bcndypwyeoymihsxzbsv.supabase.co/auth/v1/callback
   ```
   (já está — não precisa adicionar de novo)

3. **Authorized JavaScript origins** → adicionar:
   ```
   https://labiadio.vercel.app
   ```

4. No Supabase → **Authentication** → **URL Configuration**
   - **Site URL**: `https://labiadio.vercel.app`
   - **Redirect URLs**: adicionar `https://labiadio.vercel.app/**`

---

### 2.4 Verificar deploy

Acesse `https://labiadio.vercel.app` → deve aparecer a tela de login LABIADIO.

✅ Sprint 1 concluída quando:
- [ ] Login Google funcionando na URL da Vercel
- [ ] Dashboard visível após login
- [ ] Usuário criado no banco com role admin
- [ ] Vercel fazendo redeploy automático a cada push no GitHub

---

## PARTE 3 — Rotacionar Chaves (SEGURANÇA)

As chaves do Supabase e Anthropic foram expostas em chat público.
**Fazer isso ANTES de usar em produção.**

### 3.1 Rotacionar Anthropic API Key

1. Acesse: **console.anthropic.com** → **API Keys**
2. Encontre a chave `sk-ant-api03-CiQwQ9...`
3. Clique nos três pontos → **Delete**
4. **Create Key** → copie a nova chave
5. Atualize no `.env.local` e nas variáveis da Vercel

### 3.2 Rotacionar Supabase Keys

1. Acesse: **supabase.com/dashboard/project/bcndypwyeoymihsxzbsv**
2. **Settings** → **API**
3. **Service Role Key** → clique em **Reveal** → copie e atualize
4. Para gerar uma nova: **Settings** → **API** → scroll até **JWT Settings** → **Generate new JWT secret**
   ⚠️ Isso invalida TODOS os tokens de sessão existentes — todos os usuários precisarão logar novamente.

---

## PARTE 4 — Executar SQL no Supabase

### 4.1 Migration 001 (banco principal)

1. **Supabase Dashboard** → **SQL Editor** → **New query**
2. Cole o conteúdo de: `supabase/migrations/001_init.sql`
3. Clique **Run**
4. Verificar: **Table Editor** → deve aparecer todas as tabelas

### 4.2 Criar bucket Storage

1. **Supabase Dashboard** → **Storage**
2. **New bucket**:
   - Name: `docs`
   - Public bucket: **OFF** (privado)
3. Clique **Save**

### 4.3 Migration 002 (pgvector — fazer na Sprint 4)

Não executar agora. Guardar para quando iniciar a Sprint 4.

---

*LABIADIO · Guia de Configuração · Sprint 1 · Abril 2026*
