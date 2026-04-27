# LABIADIO
**Quality Management Software for Accredited Laboratories · ISO/IEC 17025:2017**

---

## Stack

| Camada | Tecnologia | Por quê |
|--------|-----------|---------|
| Frontend + Backend | **Next.js 14** (App Router) | 1 codebase, 1 deploy, API Routes integradas |
| Banco de dados | **Supabase** (PostgreSQL) | Gratuito, Auth, Storage de PDFs, RLS |
| Deploy | **Vercel** | 1 comando, URL imediata, grátis |
| IA | **Claude API** (Anthropic) | Análise PDF, chat técnico, RAG |
| Estilo | **Tailwind CSS** | Design system consistente |
| Estado | **Zustand** + **React Query** | Estado global + cache de servidor |

---

## Setup em 4 passos

### 1. Pré-requisitos
```bash
node --version   # Precisa de v20+
git --version    # Qualquer versão
```

### 2. Instalar dependências
```bash
cd labiadio
npm install
```

### 3. Configurar variáveis de ambiente
```bash
cp .env.local.example .env.local
# Editar .env.local com seus valores:
```

**Onde pegar cada valor:**

| Variável | Onde encontrar |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

### 4. Rodar o banco de dados
No **SQL Editor do Supabase**, execute o arquivo:
```
supabase/migrations/001_init.sql
```

Também crie o bucket de storage:
- Supabase → Storage → New Bucket
- Nome: `docs`
- Público: **Não**

### 5. Configurar Google OAuth
- Google Cloud Console → APIs → OAuth 2.0
- Authorized redirect URI: `https://SEU_PROJETO.supabase.co/auth/v1/callback`
- Copiar Client ID e Secret para Supabase → Auth → Providers → Google

### 6. Rodar localmente
```bash
npm run dev
# Abre em http://localhost:3000
```

---

## Deploy na Vercel (grátis)

```bash
# 1. Push para GitHub
git init && git add . && git commit -m "initial commit"
git remote add origin https://github.com/SEU_USER/labiadio.git
git push -u origin main

# 2. Vercel
# Acesse vercel.com → Import Project → labiadio
# Adicionar as variáveis de ambiente do .env.local
# Deploy automático!
```

---

## Estrutura do projeto

```
labiadio/
├── app/
│   ├── auth/login/          ← Página de login
│   ├── dashboard/           ← App autenticado
│   │   ├── page.tsx         ← Dashboard principal
│   │   ├── equipamentos/    ← Gestão de padrões
│   │   ├── certificados/    ← Certificados de calibração
│   │   ├── checagens/       ← Checagens intermediárias
│   │   ├── incerteza/       ← Cálculo GUM
│   │   └── ambiente/        ← Controle ambiental
│   └── api/
│       ├── auth/callback/   ← OAuth callback
│       ├── pdf/analyze/     ← Análise PDF com IA ← CORE
│       └── ai/chat/         ← Chat IA técnico   ← CORE
├── components/
│   └── layout/Sidebar.tsx   ← Navegação lateral
├── lib/
│   ├── supabase/            ← Clientes browser e servidor
│   └── utils.ts             ← Helpers (fmt, diasAte, etc.)
├── types/index.ts           ← Tipos TypeScript centrais
└── supabase/migrations/     ← Schema PostgreSQL
```

---

## Roteiro de sessões

| Sessão | Duração | O que fazer |
|--------|---------|-------------|
| **1** | 4h | npm install, .env.local, SQL no Supabase, `npm run dev`, login Google |
| **2** | 4h | Formulário de equipamentos, upload cert + análise IA, listagem |
| **3** | 4h | Checagens intermediárias, incerteza GUM, condições ambientais |
| **4** | 4h | Chat IA com contexto do lab, RAG básico, deploy Vercel |

---

## Mensagem de início de sessão para Claude

```
Claude, Sessão [N] do LABIADIO.
Stack: Next.js 14 + Supabase + Claude API.
Último estado: [descrever o que foi feito].
Próximo objetivo: [o que quer fazer hoje].
```

---

*LABIADIO · Quality Management Software for Accredited Laboratories*
*ISO/IEC 17025:2017 · LABELO PUCRS · 2026*
