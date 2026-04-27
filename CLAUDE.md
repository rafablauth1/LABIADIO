# LABIADIO — CLAUDE.md
> Leia este arquivo no início de cada sessão. Ele é a memória permanente do projeto.

---

## IDENTIDADE DO PROJETO

**Nome:** LABIADIO  
**Slogan:** Quality Management Software for Accredited Laboratories  
**Norma:** ISO/IEC 17025:2017  
**Lab:** EMC — LABELO PUCRS  
**Responsável:** Dionata (técnico) / Rafael (dev)  
**Stack:** Next.js 14 · Supabase · Claude API · Vercel  
**Repo:** github.com/rafablauth1/LABIADIO  
**Pasta:** `C:\Users\Rafael\Documents\LABIADIO\labiadio-projeto\labiadio`

---

## ARQUITETURA

```
Browser
  │
  ▼
Next.js 14 — Vercel (grátis)
  │  app/             ← páginas React (Server Components)
  │  app/api/         ← backend (API Routes, sem servidor separado)
  │  components/      ← UI reutilizável
  │  lib/supabase/    ← cliente browser + servidor
  │
  ├──▶ Supabase (grátis 500MB)
  │      PostgreSQL + RLS por lab
  │      Auth: Google OAuth → Azure AD (futuro)
  │      Storage: bucket "docs" (PDFs)
  │      pgvector: embeddings para RAG (Sprint 4)
  │
  └──▶ Anthropic API (Claude Sonnet 4)
         /api/pdf/analyze  ← PDF base64 → campos JSON
         /api/ai/chat      ← chat com contexto do lab
         /api/ai/embed     ← texto → vetor (Sprint 4)
         /api/ai/audio     ← áudio → prompt (Sprint 7)
```

**Decisão arquitetural:** Next.js monorepo (não separar back/front agora).  
Motivo: MVP rápido, 1 deploy, sem CORS, sem dois repos. Separar depois se necessário.

---

## AMBIENTE

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ver .env.local>
SUPABASE_SERVICE_ROLE_KEY=<ver .env.local>
ANTHROPIC_API_KEY=<ver .env.local>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=LABIADIO
```

⚠️ **TODO:** Rotacionar ANTHROPIC_API_KEY e SUPABASE keys no console.

---

## BANCO DE DADOS

**Projeto Supabase:** `bcndypwyeoymihsxzbsv`  
**Migration executada:** `supabase/migrations/001_init.sql`

### Tabelas
| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `laboratorios` | Labs cadastrados | — |
| `lab_users` | Usuários + role (admin/tecnico/viewer) | ✅ |
| `equipamentos` | Padrões de trabalho | ✅ |
| `certificados` | Certificados de calibração + PDF | ✅ via equip |
| `checagens` | Planilhas por norma | ✅ via equip |
| `documentos` | Normas, ITs, PQs, manuais | ✅ |
| `ambiente_diario` | Temp/umidade por dia | ✅ |
| `aumento_periodico` | Solicitações §6.4.7 | ✅ via equip |

### RLS — isolamento por lab
```sql
-- Todos os selects/inserts/updates filtrados por:
get_user_lab_id() → lab_users.lab_id WHERE id = auth.uid()
```

### Storage
- **Bucket:** `docs` (privado)
- **Path pattern:** `{lab_id}/{tipo}/{uuid}.pdf`
- **Acesso:** signed URLs temporárias (60min)

---

## DESIGN SYSTEM

### Cores (Tailwind config)
```
navy    #0B0E14   bg principal
navy-2  #141B28   cards, modais
navy-3  #1A2338   inputs, hover
gold    #E8B94B   accent primário — botões, destaques, logo
teal    #22D3C8   accent secundário — links, hover, success states
blue    #3B82F6   informação
green   #10B981   conforme, OK
amber   #F59E0B   atenção, próximo vencer
red     #EF4444   vencido, erro, perigo
```

### Fontes
```
--font-syne:     display (headings, logo, titles)  
--font-figtree:  body (texto geral)  
--font-dm-mono:  mono (tags, labels, código, badges)
```

### Classes utilitárias (globals.css)
```css
.card          → bg navy-2, border branca/7%, rounded-card
.btn-primary   → gradiente gold→yellow-600, texto navy, bold
.btn-secondary → bg navy-2, hover border teal
.btn-danger    → bg red/10, hover bg red
.input         → bg navy, focus border gold + ring gold/20
.badge-gold    → bg gold/10, text gold, border gold/20
.badge-teal    → bg teal/10, text teal
.badge-success → bg green/10, text green
.badge-warning → bg amber/10, text amber
.badge-danger  → bg red/10, text red
.tag-chip      → inline tag de equipamento (fundo gold/10)
.form-section  → label de seção de formulário (mono, gold, uppercase)
.animate-fade-in → fadeIn 0.2s ease
```

---

## ESTRUTURA DE ARQUIVOS

```
labiadio/
├── CLAUDE.md                        ← ESTE ARQUIVO
├── .env.local                       ← variáveis (não commitar!)
├── .env.local.example               ← template público
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js                ← necessário para Tailwind v3
├── tsconfig.json
├── package.json
│
├── app/
│   ├── layout.tsx                   ← root: fonts, metadata, body
│   ├── globals.css                  ← design tokens + @apply classes
│   ├── page.tsx                     ← redirect: login ou dashboard
│   │
│   ├── auth/
│   │   └── login/page.tsx           ← Google OAuth (client component)
│   │
│   ├── dashboard/
│   │   ├── layout.tsx               ← auth guard + Sidebar
│   │   ├── page.tsx                 ← dashboard: stats + alertas
│   │   ├── equipamentos/
│   │   │   ├── page.tsx             ← listagem ✅
│   │   │   ├── novo/page.tsx        ← formulário criar ⏳
│   │   │   └── [id]/page.tsx        ← detalhe + editar ⏳
│   │   ├── certificados/
│   │   │   ├── page.tsx             ← listagem ⏳
│   │   │   └── [id]/page.tsx        ⏳
│   │   ├── checagens/
│   │   │   ├── controle/page.tsx    ⏳
│   │   │   └── realizar/page.tsx    ⏳
│   │   ├── calibracao/page.tsx      ⏳
│   │   ├── incerteza/page.tsx       ⏳
│   │   ├── ambiente/page.tsx        ⏳
│   │   ├── manuais/page.tsx         ⏳
│   │   ├── normas/page.tsx          ⏳
│   │   ├── instrucoes/page.tsx      ⏳
│   │   ├── procedimentos/page.tsx   ⏳
│   │   └── configuracoes/page.tsx   ⏳
│   │
│   └── api/
│       ├── auth/callback/route.ts   ← OAuth callback ✅
│       ├── equip/route.ts           ⏳ GET/POST
│       ├── equip/[id]/route.ts      ⏳ GET/PUT/DELETE
│       ├── certs/route.ts           ⏳
│       ├── certs/[id]/route.ts      ⏳
│       ├── pdf/analyze/route.ts     ← PDF → IA → JSON ✅
│       ├── ai/chat/route.ts         ← chat IA ✅
│       ├── ai/embed/route.ts        ⏳ Sprint 4 (RAG)
│       └── ai/audio/route.ts        ⏳ Sprint 7
│
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx              ✅
│   ├── ui/
│   │   ├── Modal.tsx                ⏳
│   │   ├── Table.tsx                ⏳
│   │   ├── Badge.tsx                ⏳
│   │   ├── PDFUpload.tsx            ⏳
│   │   └── AIChat.tsx               ⏳
│   ├── forms/
│   │   ├── EquipForm.tsx            ⏳
│   │   └── CertForm.tsx             ⏳
│   └── modals/
│       ├── EquipModal.tsx           ⏳
│       └── CertModal.tsx            ⏳
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                ✅ (browser)
│   │   └── server.ts                ✅ (server components)
│   ├── utils.ts                     ✅ (fmt, diasAte, calStatus, addM)
│   └── pdf.ts                       ⏳ (helpers de upload/download)
│
├── store/
│   └── useLabStore.ts               ⏳ (Zustand: equip, certs, ui)
│
├── types/
│   └── index.ts                     ✅ (todos os tipos)
│
├── supabase/
│   └── migrations/
│       ├── 001_init.sql             ✅ executado
│       └── 002_pgvector.sql         ⏳ Sprint 4
│
└── public/
    └── labiadio-legado.html         ← referência visual completa
```

**Legenda:** ✅ criado · ⏳ pendente

---

## SPRINTS

### Status atual
| Sprint | Semana | Status | Objetivo |
|--------|--------|--------|----------|
| **S1** | 1 | 🔄 Em andamento | MVP Online |
| **S2** | 2 | ⏳ Planejado | Equipamentos + PDF Analyzer |
| **S3** | 3 | ⏳ Planejado | Checagens + GUM + Ambiente |
| **S4** | 4 | ⏳ Planejado | IA Consultora RAG |
| **S5** | 5+ | ⏳ Futuro | Auth Microsoft |
| **S6** | 6+ | ⏳ Futuro | Builder Formulários IA |
| **S7** | 7+ | ⏳ Futuro | Áudio → Prompt + Relatórios |

### Sprint 1 — checklist
- [x] Next.js 14 + TypeScript configurado
- [x] Schema PostgreSQL criado (Supabase)
- [x] Chaves .env.local configuradas
- [x] postcss.config.js criado (Tailwind funcionando)
- [x] Página de login com dark theme renderizando
- [ ] Login Google OAuth funcionando de ponta a ponta
- [ ] SQL executado no Supabase SQL Editor
- [ ] Bucket `docs` criado no Storage
- [ ] Push para GitHub (rafablauth1/LABIADIO)
- [ ] Deploy na Vercel com variáveis de ambiente
- [ ] Chaves rotacionadas (Anthropic + Supabase)

### DoD (Definição de Pronto)
Uma sprint está concluída quando:
1. Funciona na URL pública da Vercel
2. Dados persistem no Supabase (sobrevive reload)
3. RLS testado com 2 usuários diferentes
4. Feature de IA testada com doc real do lab
5. Validado pelo Dionata
6. Revisão 30min com gestão

---

## DADOS DO LAB EMC (referência)

O arquivo `public/labiadio-legado.html` tem TODOS os dados reais.

**Equipamentos cadastrados (32):**
- Tags: 1528EMC, 1196EMC, 1429EMC, 1907EMC, 3055EMC...
- Normas: IEC 61000-4-2, 4-3, 4-4, 4-5, 4-6, 4-8, 4-11...

**Laboratórios de calibração:**
- DARE (certs R00xx-20xx)
- CHOMA (certs E0xxx-20xx)
- IMETRO (certs J20xx...)
- SERV (certs S24-xxx)

**Periodicidade padrão:** 12 meses (maioria), 6 meses (sensores críticos)

---

## PADRÕES DE CÓDIGO

### Server Components (padrão Next.js 14)
```tsx
// Busca direto no servidor — sem useEffect, sem loading state manual
export default async function Page() {
  const supabase = createClient()  // lib/supabase/server.ts
  const { data } = await supabase.from('equipamentos').select('*')
  return <div>{data?.map(...)}</div>
}
```

### Client Components (formulários, interatividade)
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
// Usar para: forms, modais, estado local, eventos do browser
```

### API Routes
```ts
// app/api/*/route.ts
import { createClient } from '@/lib/supabase/server'
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  // ...
}
```

### Importações
```ts
import { createClient } from '@/lib/supabase/server'  // server
import { createClient } from '@/lib/supabase/client'  // browser
import { fmt, diasAte, calStatus, addM } from '@/lib/utils'
import type { Equipamento, Certificado } from '@/types'
```

---

## NOTAS IMPORTANTES

1. **NUNCA** usar `localStorage` — dados vão para o Supabase
2. **SEMPRE** verificar auth antes de qualquer operação de escrita
3. **PDFs** → Supabase Storage bucket `docs`, nunca base64 em banco
4. **Status do equipamento** `fora`/`calibrar` → excluir de alertas de vencimento
5. **RLS** → toda query já filtra por lab_id automaticamente
6. **Datas** → sempre `YYYY-MM-DD` no banco, usar `fmt()` para exibir DD/MM/YYYY
7. **Tags** → uppercase, ex: `1528EMC` — usar `.tag-chip` para exibir

---

*Última atualização: Abril 2026 · Sprint 1 em andamento*
