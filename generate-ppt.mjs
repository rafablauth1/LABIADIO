import PptxGenJS from 'pptxgenjs'

const prs = new PptxGenJS()
prs.layout = 'LAYOUT_WIDE'
prs.author = 'LABIADIO'
prs.company = 'PUCRS / LABELO'
prs.title = 'LABIADIO — Sistema de Gestão de Equipamentos'

// ── TEMA ────────────────────────────────────────────────────────────
const BG      = '070A10'
const NAVY    = '0D1117'
const GOLD    = 'C9A94A'
const GOLD_L  = 'F5D27A'
const WHITE   = 'FFFFFF'
const WHITE40 = '9CA3AF'
const SUCCESS = '22C55E'
const TEAL    = '22D3C8'
const DANGER  = 'EF4444'
const WARN    = 'F59E0B'

function slide(title, eyebrow) {
  const s = prs.addSlide()
  s.background = { color: BG }
  if (eyebrow) {
    s.addText(eyebrow.toUpperCase(), {
      x: 0.5, y: 0.35, w: 12, h: 0.2,
      fontSize: 7, bold: true, color: GOLD,
      charSpacing: 4, fontFace: 'Courier New',
    })
  }
  if (title) {
    s.addText(title, {
      x: 0.5, y: 0.55, w: 12, h: 0.55,
      fontSize: 22, bold: true, color: WHITE, fontFace: 'Arial',
    })
  }
  // linha dourada
  s.addShape(prs.ShapeType.rect, { x: 0.5, y: 1.15, w: 1.8, h: 0.04, fill: { color: GOLD } })
  return s
}

function bullet(s, items, opts = {}) {
  const { x = 0.5, y = 1.4, w = 12, color = WHITE40, size = 11, gap = 0.34 } = opts
  items.forEach((item, i) => {
    const [icon, ...rest] = typeof item === 'string' ? ['•', item] : [item.icon || '•', item.text]
    s.addText([
      { text: icon + '  ', options: { color: GOLD, bold: true } },
      { text: rest.join(''), options: { color } },
    ], { x, y: y + i * gap, w, h: 0.3, fontSize: size, fontFace: 'Arial' })
  })
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 1 — CAPA
// ════════════════════════════════════════════════════════════════════
{
  const s = prs.addSlide()
  s.background = { color: BG }
  // gradiente dourado no topo
  s.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: GOLD } })
  // logo text
  s.addText([
    { text: 'LABI', options: { color: WHITE, bold: true } },
    { text: 'ADIO', options: { color: GOLD_L, bold: true } },
  ], { x: 1, y: 1.6, w: 11, h: 1.2, fontSize: 72, fontFace: 'Arial', align: 'center' })

  s.addText('Sistema de Gestão de Equipamentos de Medição', {
    x: 1, y: 2.9, w: 11, h: 0.4,
    fontSize: 16, color: WHITE40, align: 'center', fontFace: 'Arial',
  })
  s.addText('ISO/IEC 17025:2017 · LABELO/PUCRS', {
    x: 1, y: 3.35, w: 11, h: 0.3,
    fontSize: 11, color: GOLD, align: 'center', fontFace: 'Courier New', charSpacing: 3,
  })
  // linha
  s.addShape(prs.ShapeType.rect, { x: 3.5, y: 3.75, w: 6.33, h: 0.03, fill: { color: GOLD } })

  s.addText('Abril · 2026', {
    x: 1, y: 3.9, w: 11, h: 0.3,
    fontSize: 11, color: WHITE40, align: 'center', fontFace: 'Courier New',
  })
  s.addShape(prs.ShapeType.rect, { x: 0, y: 7.45, w: 13.33, h: 0.08, fill: { color: GOLD } })
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 2 — O QUE É
// ════════════════════════════════════════════════════════════════════
{
  const s = slide('O que é o LABIADIO?', 'Visão Geral')
  s.addText(
    'Plataforma web completa para gestão de equipamentos de medição em laboratórios acreditados pela ISO/IEC 17025:2017.',
    { x: 0.5, y: 1.35, w: 12, h: 0.6, fontSize: 13, color: WHITE40, fontFace: 'Arial' }
  )
  const cards = [
    { title: 'Equipamentos', sub: 'Cadastro, fotos, calibração,\nchecagens e status em tempo real', color: GOLD },
    { title: 'Documentação', sub: 'Certificados, manuais, ITs,\nprocedimentos e normas', color: TEAL },
    { title: 'IA Integrada', sub: 'Análise automática de PDFs\npor Claude (Anthropic)', color: SUCCESS },
    { title: 'Ambiente', sub: 'Controle de condições\nambientais por sala', color: WARN },
  ]
  cards.forEach((c, i) => {
    const x = 0.5 + i * 3.1
    s.addShape(prs.ShapeType.rect, { x, y: 2.1, w: 2.9, h: 2.5,
      fill: { color: NAVY }, line: { color: c.color, width: 1.5 }, rectRadius: 0.1 })
    s.addShape(prs.ShapeType.rect, { x, y: 2.1, w: 0.08, h: 2.5, fill: { color: c.color } })
    s.addText(c.title, { x: x + 0.2, y: 2.25, w: 2.6, h: 0.35, fontSize: 13, bold: true, color: WHITE, fontFace: 'Arial' })
    s.addText(c.sub, { x: x + 0.2, y: 2.65, w: 2.6, h: 1.6, fontSize: 10, color: WHITE40, fontFace: 'Arial' })
  })
  s.addText('Tecnologias: Next.js 14 · TypeScript · Supabase · Tailwind CSS · Claude AI', {
    x: 0.5, y: 4.8, w: 12, h: 0.3, fontSize: 9, color: GOLD, fontFace: 'Courier New', charSpacing: 1,
  })
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 3 — MÓDULOS IMPLEMENTADOS
// ════════════════════════════════════════════════════════════════════
{
  const s = slide('Módulos Implementados', 'Funcionalidades')
  const modulos = [
    { icon: '⚙', label: 'Equipamentos', items: ['Cadastro com foto', 'Ficha integrada', 'Status de calibração', 'Multi-padrões auxiliares'] },
    { icon: '📋', label: 'Certificados', items: ['Registro com PDF', 'Análise por IA', 'Filtro por ano', 'Atualiza cal. automático'] },
    { icon: '📖', label: 'Manuais & Docs', items: ['Vinculado ao equipamento', 'Análise por IA', 'ITs e procedimentos', 'Documentos normativos'] },
    { icon: '✅', label: 'Checagens', items: ['Controle por IT CHK', 'Importação Excel', 'Critério automático', 'Histórico por equipamento'] },
    { icon: '🌡', label: 'Ambiente', items: ['Instalações por sala', 'Limites temp/umidade', 'Alerta em tempo real', 'Planilha mensal'] },
    { icon: '🤖', label: 'IA (Claude AI)', items: ['Análise de certificados', 'Extração de manuais', 'IT CHK automática', 'Múltiplos providers'] },
  ]
  modulos.forEach((m, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = 0.4 + col * 4.15
    const y = 1.45 + row * 2.55
    s.addShape(prs.ShapeType.rect, { x, y, w: 3.9, h: 2.35,
      fill: { color: NAVY }, line: { color: '1E2A38', width: 1 }, rectRadius: 0.08 })
    s.addText(m.icon + '  ' + m.label, {
      x: x + 0.18, y: y + 0.12, w: 3.5, h: 0.35,
      fontSize: 12, bold: true, color: WHITE, fontFace: 'Arial',
    })
    m.items.forEach((item, j) => {
      s.addText('· ' + item, {
        x: x + 0.18, y: y + 0.52 + j * 0.38, w: 3.5, h: 0.32,
        fontSize: 10, color: WHITE40, fontFace: 'Arial',
      })
    })
  })
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 4 — FICHA DO EQUIPAMENTO
// ════════════════════════════════════════════════════════════════════
{
  const s = slide('Ficha do Equipamento', 'Módulo Principal')
  bullet(s, [
    { icon: '📷', text: 'Foto do equipamento ao lado das informações de identificação' },
    { icon: '🏷', text: 'TAG, fabricante, Nº série, patrimônio e localização' },
    { icon: '📅', text: 'Status de calibração em tempo real (vencido / a vencer / em dia)' },
    { icon: '📄', text: '6 mini-abas: Certificados · Checagens · Auxiliares · Manuais · Softwares · Plano Cal.' },
    { icon: '🔍', text: 'Filtro por ano com separadores visuais em cada aba' },
    { icon: '✏', text: 'Editar e excluir registros direto da ficha (lápis/lixeira no hover)' },
    { icon: '⚡', text: 'Ao salvar certificado → atualiza automaticamente datas de calibração do equipamento' },
    { icon: '🔗', text: 'Auxiliares com múltiplos padrões vinculados via checkbox com busca' },
  ], { y: 1.4, gap: 0.56 })
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 5 — IA INTEGRADA
// ════════════════════════════════════════════════════════════════════
{
  const s = slide('Análise por IA (Claude AI)', 'Inteligência Artificial')
  s.addText('Upload de PDF → IA lê o documento → preenche os campos automaticamente', {
    x: 0.5, y: 1.35, w: 12, h: 0.4, fontSize: 13, color: WHITE40, fontFace: 'Arial',
  })
  const docs = [
    { tipo: 'Certificado de Calibração', campos: 'Nº certificado · Laboratório · Data de emissão · Acreditação' },
    { tipo: 'Manual Técnico', campos: 'Título · Tipo (usuário/serviço/calibração) · Revisão' },
    { tipo: 'Instrução de Trabalho (IT)', campos: 'Código · Título · Tags de equipamentos · Aprovador' },
    { tipo: 'IT CHK (Checagem)', campos: 'TAG · Grandezas · Self-test · Processo · Normas de referência' },
    { tipo: 'Procedimento de Checagem', campos: 'Código · Normas · Parâmetros · Aprovador' },
    { tipo: 'Documento Normativo', campos: 'Designação · Versão/ano · Título · Tipo de ensaio' },
  ]
  docs.forEach((d, i) => {
    const y = 1.85 + i * 0.82
    s.addShape(prs.ShapeType.rect, { x: 0.5, y, w: 12.3, h: 0.7,
      fill: { color: NAVY }, line: { color: '1A3040', width: 1 }, rectRadius: 0.06 })
    s.addText(d.tipo, { x: 0.75, y: y + 0.08, w: 4.5, h: 0.28, fontSize: 11, bold: true, color: TEAL, fontFace: 'Arial' })
    s.addText('Extrai: ' + d.campos, { x: 5.3, y: y + 0.08, w: 7.3, h: 0.5, fontSize: 10, color: WHITE40, fontFace: 'Arial' })
  })
  s.addText('Provider configurável via .env — Anthropic (padrão) · Azure OpenAI · Google Gemini', {
    x: 0.5, y: 6.85, w: 12, h: 0.28, fontSize: 9, color: GOLD, fontFace: 'Courier New', charSpacing: 1,
  })
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 6 — CONDIÇÕES AMBIENTAIS
// ════════════════════════════════════════════════════════════════════
{
  const s = slide('Condições Ambientais', 'Monitoramento por Sala')
  bullet(s, [
    { icon: '🏢', text: 'Instalações cadastradas por: Prédio → Bloco → Sala → Área' },
    { icon: '🌡', text: 'Termohigrômetro vinculado à instalação (selecionado da lista de equipamentos)' },
    { icon: '⚠', text: 'Limites de temperatura e umidade configuráveis por sala' },
    { icon: '📊', text: 'Planilha mensal com 31 dias — valores fora do limite ficam em vermelho' },
    { icon: '📅', text: 'Calendário mensal — dias com alerta exibidos com borda vermelha' },
    { icon: '🔔', text: 'Alerta em tempo real ao digitar valores fora dos limites no registro' },
    { icon: '🔒', text: 'Registros por lab com isolamento via RLS (Row Level Security)' },
  ], { y: 1.45, gap: 0.6 })
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 7 — ESTADO ATUAL / PROGRESSO
// ════════════════════════════════════════════════════════════════════
{
  const s = slide('Estado Atual do Projeto', 'Progresso')
  const sprints = [
    { id: 'S1', nome: 'MVP Online',           pct: 100, status: 'concluido' },
    { id: 'S2', nome: 'Módulos & Registros',  pct: 100, status: 'concluido' },
    { id: 'S3', nome: 'Integração & Checagens', pct: 100, status: 'concluido' },
    { id: 'S4', nome: 'Fotos, IA & Ambiente', pct: 100, status: 'concluido' },
    { id: 'S5', nome: 'Infraestrutura Azure', pct: 40,  status: 'iniciado' },
    { id: 'S6', nome: 'IA Consultora',        pct: 0,   status: 'planejado' },
    { id: 'S7', nome: 'Builder de Documentos', pct: 0,  status: 'planejado' },
    { id: 'S8', nome: 'Relatórios Executivos', pct: 0,  status: 'planejado' },
  ]
  const colorMap = { concluido: SUCCESS, iniciado: GOLD, planejado: '374151' }
  const labelMap = { concluido: 'CONCLUÍDO', iniciado: 'EM ANDAMENTO', planejado: 'PLANEJADO' }

  sprints.forEach((sp, i) => {
    const y = 1.42 + i * 0.7
    const barW = 7.5
    const filledW = barW * (sp.pct / 100)
    const c = colorMap[sp.status]
    s.addText(sp.id, { x: 0.5, y, w: 0.55, h: 0.35, fontSize: 9, bold: true, color: GOLD, fontFace: 'Courier New' })
    s.addText(sp.nome, { x: 1.1, y, w: 4.2, h: 0.35, fontSize: 10, color: WHITE, fontFace: 'Arial' })
    s.addShape(prs.ShapeType.rect, { x: 5.4, y: y + 0.1, w: barW, h: 0.18, fill: { color: '1E2A38' }, rectRadius: 0.04 })
    if (filledW > 0) s.addShape(prs.ShapeType.rect, { x: 5.4, y: y + 0.1, w: filledW, h: 0.18, fill: { color: c }, rectRadius: 0.04 })
    s.addText(sp.pct + '%', { x: 13.0, y, w: 0.6, h: 0.35, fontSize: 9, bold: true, color: c, fontFace: 'Courier New', align: 'right' })
  })

  const total = Math.round(sprints.reduce((a, s) => a + s.pct, 0) / sprints.length)
  s.addShape(prs.ShapeType.rect, { x: 0.5, y: 6.9, w: 12.3, h: 0.45, fill: { color: NAVY }, rectRadius: 0.06 })
  s.addText(`Progresso total do projeto: ${total}%  ·  4 de 8 sprints concluídas`, {
    x: 0.7, y: 6.95, w: 12, h: 0.3, fontSize: 10, bold: true, color: GOLD_L, fontFace: 'Arial',
  })
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 8 — ROADMAP
// ════════════════════════════════════════════════════════════════════
{
  const s = slide('Roadmap — Próximas Fases', 'Planejamento')
  const fases = [
    {
      id: 'S5', nome: 'Infraestrutura Azure', periodo: 'Mai/Jun 2026', cor: GOLD,
      items: ['App Registration Azure Entra ID', 'PostgreSQL Flexible Server', 'Azure Blob Storage', 'Autenticação Microsoft 365'],
    },
    {
      id: 'S6', nome: 'IA Consultora', periodo: 'Jun 2026', cor: TEAL,
      items: ['Conformidade ISO 17025 por equipamento', 'Alertas inteligentes por histórico', 'Geração automática de IT CHK', 'Chat contextualizado com dados do lab'],
    },
    {
      id: 'S7', nome: 'Builder de Documentos', periodo: 'Jul 2026', cor: SUCCESS,
      items: ['Gerador de ITs e procedimentos', 'Templates PUCRS com assinatura digital', 'Exportação PDF e Word'],
    },
    {
      id: 'S8', nome: 'Relatórios Executivos', periodo: 'Ago 2026', cor: WARN,
      items: ['Dashboard gerencial com KPIs', 'Exportação Excel de checagens', 'Notificações e-mail Office 365'],
    },
  ]
  fases.forEach((f, i) => {
    const x = 0.4 + i * 3.1
    s.addShape(prs.ShapeType.rect, { x, y: 1.45, w: 2.9, h: 4.8,
      fill: { color: NAVY }, line: { color: f.cor, width: 1.5 }, rectRadius: 0.1 })
    s.addShape(prs.ShapeType.rect, { x, y: 1.45, w: 2.9, h: 0.06, fill: { color: f.cor } })
    s.addText(f.id, { x: x + 0.12, y: 1.55, w: 0.5, h: 0.28, fontSize: 9, bold: true, color: f.cor, fontFace: 'Courier New' })
    s.addText(f.nome, { x: x + 0.12, y: 1.85, w: 2.65, h: 0.35, fontSize: 11, bold: true, color: WHITE, fontFace: 'Arial' })
    s.addText(f.periodo, { x: x + 0.12, y: 2.22, w: 2.65, h: 0.25, fontSize: 9, color: f.cor, fontFace: 'Courier New' })
    f.items.forEach((item, j) => {
      s.addText('→ ' + item, { x: x + 0.12, y: 2.62 + j * 0.68, w: 2.65, h: 0.58, fontSize: 9.5, color: WHITE40, fontFace: 'Arial' })
    })
  })
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 9 — ESTIMATIVA DO PROJETO
// ════════════════════════════════════════════════════════════════════
{
  const s = slide('Estimativa do Projeto Final', 'Projeção')
  // Tabela de esforço
  const rows = [
    { fase: 'S1–S4 (Concluído)', esforco: '~160h', custo: 'R$ 19.200', status: 'FEITO', c: SUCCESS },
    { fase: 'S5 — Azure (parcial)', esforco: '~40h rem.', custo: 'R$ 4.800', status: 'EM ANDAMENTO', c: GOLD },
    { fase: 'S6 — IA Consultora', esforco: '~80h', custo: 'R$ 9.600', status: 'PLANEJADO', c: WHITE40 },
    { fase: 'S7 — Builder Docs', esforco: '~60h', custo: 'R$ 7.200', status: 'PLANEJADO', c: WHITE40 },
    { fase: 'S8 — Relatórios', esforco: '~60h', custo: 'R$ 7.200', status: 'PLANEJADO', c: WHITE40 },
    { fase: 'TOTAL DO PROJETO', esforco: '~400h', custo: 'R$ 48.000', status: '', c: GOLD_L, bold: true },
  ]
  const headers = ['FASE', 'ESFORÇO', 'CUSTO EST.', 'STATUS']
  const cols = [0.5, 6.5, 8.5, 10.5]
  const colW = [5.8, 1.8, 1.8, 2.3]

  s.addShape(prs.ShapeType.rect, { x: 0.5, y: 1.38, w: 12.3, h: 0.38, fill: { color: GOLD }, rectRadius: 0 })
  headers.forEach((h, i) => {
    s.addText(h, { x: cols[i] + 0.12, y: 1.44, w: colW[i], h: 0.28,
      fontSize: 9, bold: true, color: BG, fontFace: 'Courier New', charSpacing: 1 })
  })
  rows.forEach((r, i) => {
    const y = 1.78 + i * 0.62
    const bg = r.bold ? '1A2233' : (i % 2 === 0 ? NAVY : '111827')
    s.addShape(prs.ShapeType.rect, { x: 0.5, y, w: 12.3, h: 0.58, fill: { color: bg } })
    s.addText(r.fase, { x: cols[0] + 0.12, y: y + 0.12, w: colW[0], h: 0.35,
      fontSize: r.bold ? 11 : 10, bold: r.bold, color: r.bold ? GOLD_L : WHITE, fontFace: 'Arial' })
    s.addText(r.esforco, { x: cols[1] + 0.12, y: y + 0.12, w: colW[1], h: 0.35,
      fontSize: 10, bold: r.bold, color: r.c, fontFace: 'Courier New' })
    s.addText(r.custo, { x: cols[2] + 0.12, y: y + 0.12, w: colW[2], h: 0.35,
      fontSize: 10, bold: r.bold, color: r.c, fontFace: 'Courier New' })
    if (r.status) s.addText(r.status, { x: cols[3] + 0.12, y: y + 0.14, w: colW[3], h: 0.3,
      fontSize: 8, bold: true, color: r.c, fontFace: 'Courier New', charSpacing: 1 })
  })
  s.addText('* Estimativa baseada em R$ 120/h · Inclui desenvolvimento, testes e entrega', {
    x: 0.5, y: 7.0, w: 12, h: 0.28, fontSize: 9, color: WHITE40, fontFace: 'Arial', italic: true,
  })
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 10 — ENCERRAMENTO
// ════════════════════════════════════════════════════════════════════
{
  const s = prs.addSlide()
  s.background = { color: BG }
  s.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: GOLD } })
  s.addShape(prs.ShapeType.rect, { x: 0, y: 7.45, w: 13.33, h: 0.08, fill: { color: GOLD } })
  s.addText([
    { text: 'LABI', options: { color: WHITE, bold: true } },
    { text: 'ADIO', options: { color: GOLD_L, bold: true } },
  ], { x: 1, y: 2.2, w: 11, h: 0.9, fontSize: 48, fontFace: 'Arial', align: 'center' })
  s.addText('Gestão de Equipamentos · ISO/IEC 17025:2017', {
    x: 1, y: 3.2, w: 11, h: 0.35, fontSize: 13, color: WHITE40, align: 'center', fontFace: 'Arial',
  })
  s.addShape(prs.ShapeType.rect, { x: 4, y: 3.65, w: 5.33, h: 0.03, fill: { color: GOLD } })
  s.addText('Desenvolvido para LABELO/PUCRS · 2026', {
    x: 1, y: 3.8, w: 11, h: 0.3, fontSize: 10, color: GOLD, align: 'center', fontFace: 'Courier New', charSpacing: 2,
  })
}

// ── SALVAR ──────────────────────────────────────────────────────────
await prs.writeFile({ fileName: 'LABIADIO_Apresentacao_2026.pptx' })
console.log('✅  LABIADIO_Apresentacao_2026.pptx gerado com sucesso!')
