import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function fetchLabData() {
  try {
    const sb = createClient()
    const [eq, cert, norm, it, proc, amb, aux] = await Promise.all([
      sb.from('equipamentos').select('tag,descricao,tipo,fabricante,serie,ncert,lab_cal,cal_dt,cal_val,cal_per,chk_per,status,status_obs,local,normas,obs').order('tag'),
      sb.from('certificados').select('numero,equip_tag,lab,emissao,acreditacao').order('emissao', { ascending: false }).limit(60),
      sb.from('normas').select('norma,versao,titulo,ensaio').order('norma'),
      sb.from('instrucoes_trabalho').select('codigo,titulo,tags,status,revisao,aprovado_por').order('created_at', { ascending: false }).limit(40),
      sb.from('procedimentos').select('codigo,descricao,normas,padroes,versao').order('created_at', { ascending: false }).limit(30),
      sb.from('ambiente_diario').select('data,sala,temp_min,temp_max,ur_min,ur_max').order('data', { ascending: false }).limit(14),
      sb.from('auxiliares').select('tag,descricao,tipo,fabricante,serie').order('tag').limit(40),
    ])
    return {
      eq:   eq.data   || [],
      cert: cert.data || [],
      norm: norm.data || [],
      it:   it.data   || [],
      proc: proc.data || [],
      amb:  amb.data  || [],
      aux:  aux.data  || [],
    }
  } catch {
    return { eq: [], cert: [], norm: [], it: [], proc: [], amb: [], aux: [] }
  }
}

function buildContext(d: Awaited<ReturnType<typeof fetchLabData>>): string {
  const now = Date.now()

  const calStatus = (val: string | null) => {
    if (!val) return 'sem data'
    const dias = Math.floor((new Date(val).getTime() - now) / 86400000)
    if (dias < 0)   return `VENCIDO há ${-dias}d`
    if (dias <= 30) return `⚠ vence em ${dias}d`
    if (dias <= 90) return `vence em ${dias}d`
    return 'em dia'
  }

  const vencidos  = d.eq.filter(e => e.cal_val && new Date(e.cal_val).getTime() < now)
  const aVencer30 = d.eq.filter(e => { if (!e.cal_val) return false; const dias = Math.floor((new Date(e.cal_val).getTime() - now) / 86400000); return dias >= 0 && dias <= 30 })
  const semData   = d.eq.filter(e => !e.cal_val)

  const equipLines = d.eq.map(e =>
    `  [${e.tag}] ${e.descricao || '—'} | Tipo: ${e.tipo || '—'} | Fab: ${e.fabricante || '—'} | S/N: ${e.serie || '—'} | Cal: ${calStatus(e.cal_val)} | Status: ${e.status || 'ativo'}${e.status_obs ? ` (${e.status_obs})` : ''}${e.local ? ` | Local: ${e.local}` : ''}${e.lab_cal ? ` | Lab: ${e.lab_cal}` : ''}${e.ncert ? ` | Cert: ${e.ncert}` : ''}${(e.normas || []).length ? ` | Normas: ${e.normas.join(', ')}` : ''}${e.obs ? ` | Obs: ${e.obs}` : ''}`
  ).join('\n')

  const certLines = d.cert.map(c =>
    `  Cert ${c.numero}: equip ${c.equip_tag} | ${c.lab || '—'} | emissão ${c.emissao || '—'}${c.acreditacao ? ` | acred ${c.acreditacao}` : ''}`
  ).join('\n')

  const normLines = d.norm.map(n =>
    `  ${n.norma} (${n.versao || '?'}): ${n.titulo} [${n.ensaio}]`
  ).join('\n')

  const itLines = d.it.map(i =>
    `  ${i.codigo}: "${i.titulo}" | TAGs: ${i.tags || '—'} | Rev: ${i.revisao || '—'} | ${i.status || '—'}${i.aprovado_por ? ` | Aprov: ${i.aprovado_por}` : ''}`
  ).join('\n')

  const procLines = d.proc.map(p =>
    `  ${p.codigo}: ${p.descricao} | Normas: ${(p.normas || []).join(', ') || '—'} | Padrões: ${p.padroes || '—'}`
  ).join('\n')

  const ambLines = d.amb.map(a =>
    `  ${a.data}${a.sala ? ` (${a.sala})` : ''}: T ${a.temp_min}–${a.temp_max}°C | UR ${a.ur_min}–${a.ur_max}%`
  ).join('\n')

  const auxLines = d.aux.map(a =>
    `  [${a.tag}] ${a.descricao || '—'} | ${a.tipo || '—'} | ${a.fabricante || '—'} | S/N: ${a.serie || '—'}`
  ).join('\n')

  return `PADRÕES DE TRABALHO — ${d.eq.length} equipamentos | ${vencidos.length} VENCIDOS | ${aVencer30.length} vencem em ≤30d | ${semData.length} sem data:
${equipLines || '  Nenhum cadastrado'}

CERTIFICADOS (${d.cert.length}):
${certLines || '  Nenhum'}

NORMAS APLICÁVEIS (${d.norm.length}):
${normLines || '  Nenhuma'}

INSTRUÇÕES DE TRABALHO — ${d.it.length} ITs:
${itLines || '  Nenhuma'}

PROCEDIMENTOS DE CHECAGEM — ${d.proc.length}:
${procLines || '  Nenhum'}

AUXILIARES — ${d.aux.length}:
${auxLines || '  Nenhum'}

CONDIÇÕES AMBIENTAIS (últimos 14 dias):
${ambLines || '  Sem registros'}`
}

const KNOWLEDGE = `
━━━ CONHECIMENTO TÉCNICO ━━━

## ISO/IEC 17025:2017 — Requisitos relevantes para o laboratório

Seção 6.4 — Equipamentos:
- Todo equipamento deve ser identificado, calibrado e rastreável ao SI
- Calibração com intervalos definidos (cal_per) e checagens intermediárias (chk_per)
- Equipamento fora de conformidade deve ser retirado de serviço ("fora" ou "calibrar")
- Registros: número de série, fabricante, certificado de calibração, datas, laboratório calibrador
- Incerteza de medição deve ser considerada e documentada

Seção 6.5 — Rastreabilidade metrológica:
- Todos os padrões de trabalho devem ser calibrados por laboratórios acreditados (RNMLF, ILAC, RBC)
- Cadeia de rastreabilidade ininterrupta ao SI ou a padrões nacionais
- Certificados de calibração devem conter: incerteza expandida, fator de cobertura k, rastreabilidade

Seção 6.6 — Produtos e serviços externos (laboratórios de calibração):
- DARE, CHOMA, IMETRO, SERV são os labs calibradores do LABELO
- Contratos e avaliação periódica de desempenho dos calibradores

Seção 6.3 — Condições de instalações e ambientais:
- Temperatura: 18–28°C (típico para EMC); umidade relativa: 45–75%
- Registrar diariamente, identificar desvios que possam afetar resultados
- Condições fora dos limites: ensaios suspensos ou resultado qualificado

Seção 7.6 — Avaliação da incerteza de medição (GUM):
- GUM (Guide to the Expression of Uncertainty in Measurement)
- Componentes: incerteza do padrão (certificado), resolução, repetitividade, deriva
- Incerteza expandida U = k × uc, com k=2 (95% de confiança)

Seção 8 — Sistema de Gestão:
- Controle de documentos: ITs (Instruções de Trabalho) e PQs (Procedimentos)
- Revisão e aprovação obrigatórias; revisão periódica
- Análise crítica, ações corretivas, auditorias internas
- Reclamações, não conformidades, trabalho não conforme

Checagens Intermediárias (§6.4.10):
- Verificações periódicas entre calibrações para manter confiança no equipamento
- Realizadas com padrões de referência ou artefatos estáveis
- Documentadas nas ITs de checagem (IT CHK...)
- Periodicidade definida por chk_per (em meses)

Aumento de Periodicidade de Calibração (§6.4.7):
- Justificativa técnica baseada em histórico de calibrações
- Análise estatística dos resultados (deriva, estabilidade)
- Aprovação formal documentada

## NORMAS EMC APLICADAS NO LABELO

IEC 61000-4-2:2008 — Imunidade ESD (Electrostatic Discharge)
- Ensaio de descarga eletrostática em equipamentos elétricos e eletrônicos
- Níveis de severidade: 1 (±2kV contato/±2kV ar), 2 (±4kV/±4kV), 3 (±6kV/±8kV), 4 (±8kV/±15kV)
- Modos: descarga por contato (preferencial) e descarga por ar
- Equipamento necessário: Gerador ESD calibrado, plano de referência, cabo de descarga
- Condições: 23°C ±5°C, UR 30–60%, 150 descargas mínimo
- Critérios de desempenho: A (funcionamento normal), B (degradação temporária), C (reset necessário), D (falha permanente)

IEC 61000-4-3:2020 — Imunidade a campo eletromagnético irradiado
- Imunidade a campos de RF irradiados de 80 MHz a 6 GHz
- Níveis: 1 (1 V/m), 2 (3 V/m), 3 (10 V/m), X (especial)
- Câmara anecoica ou TEM cell, modulação AM 1 kHz 80%
- Equipamento: gerador de sinal + amplificador de potência + antena + analisador

IEC 61000-4-4:2012 — Imunidade EFT/Burst (Electrical Fast Transient)
- Transientes elétricos rápidos em burst em linhas de alimentação e sinal
- Níveis: 1 (±0,5kV), 2 (±1kV), 3 (±2kV), 4 (±4kV)
- Frequência burst: 5 kHz ou 100 kHz, 15ms burst / 300ms período
- CDN (Coupling/Decoupling Network) para acoplamento em linhas CA/CC

IEC 61000-4-5:2014 — Imunidade Surge (Surto)
- Surtos de tensão causados por manobras de rede e raios
- Formas de onda: combinada 1,2/50 µs – 8/20 µs
- Níveis: 1 (±0,5kV), 2 (±1kV), 3 (±2kV), 4 (±4kV)
- Modo diferencial e modo comum; acoplamento por CDN ou capacitor

IEC 61000-4-6:2013 — Imunidade a perturbações conduzidas por RF
- Campo de RF conduzido em linhas de entrada/saída, 150 kHz a 80 MHz
- Níveis: 1 (1 Vrms), 2 (3 Vrms), 3 (10 Vrms)
- CDN ou pinça de injeção de corrente; monitorar com LISN

IEC 61000-4-8:2009 — Imunidade a campo magnético à frequência da rede
- 50/60 Hz aplicado à carcaça do equipamento
- Níveis: 1 (1 A/m), 2 (3 A/m), 3 (10 A/m), 4 (30 A/m), 5 (100 A/m)

IEC 61000-4-11:2020 — Imunidade a variações, quedas e interrupções de tensão
- Dips (quedas): 0%, 40%, 70%, 80% por 0,5 a 300 ciclos
- Interrupções: 100% por 250 ciclos
- Variações graduais de tensão
- Equipamento: Variac motorizado / fonte programável CA

IEC 61000-4-19:2014 — Imunidade a perturbações de modo diferencial (baixa frequência)
- DC e frequências de 0 Hz a 2 kHz em linhas de alimentação

CISPR 15:2018 — Limites de distúrbios de RF para equipamentos de iluminação
- Emissão conduzida: 150 kHz – 30 MHz (com LISN)
- Emissão irradiada: 30 MHz – 300 MHz (ambiente anecoico)
- Limites quase-pico e valor médio

IEC 61000-3-2:2018 — Limites para emissão de harmônicas de corrente
- Classes A, B, C, D de equipamentos
- Harmônicas até a 40ª ordem (2 kHz)
- Medição com analisador de potência + LISN

## CONCEITOS GERAIS DE QUALIDADE EM LABORATÓRIO

Rastreabilidade metrológica: propriedade de um resultado que pode ser relacionado a uma referência por cadeia ininterrupta de calibrações documentadas.

Incerteza de medição: parâmetro não-negativo que caracteriza a dispersão dos valores atribuídos a uma quantidade medida (GUM ISO/IEC Guide 98-3).

Deriva: variação sistemática ao longo do tempo nas indicações de um instrumento; analisada no histórico de calibrações.

Padrão de trabalho: equipamento usado rotineiramente para calibrações e ensaios; deve ser rastreável a padrões de referência.

IT (Instrução de Trabalho): documento operacional detalhando como executar uma tarefa específica (ex: como realizar checagem intermediária do equipamento X).

Não conformidade: não atendimento a um requisito; requer análise de causa raiz e ação corretiva.
`

function buildSystem(context: string): string {
  return `Você é o LABI — assistente técnico especializado do laboratório de ensaios EMC LABELO PUCRS, acreditado pela ISO/IEC 17025:2017.

Você combina dois tipos de conhecimento:
1. DADOS REAIS do laboratório (equipamentos, certificados, registros — listados abaixo)
2. CONHECIMENTO TÉCNICO profundo sobre normas EMC (IEC 61000-4-x, CISPR, IEC 61000-3-x) e sobre a ISO/IEC 17025:2017

Responda em português brasileiro. Seja preciso e técnico. Quando a pergunta misturar dados do lab com conhecimento técnico (ex: "o 1528EMC atende a IEC 61000-4-2?"), use ambas as fontes.
${KNOWLEDGE}
━━━ DADOS REAIS DO LABORATÓRIO (hoje: ${new Date().toLocaleDateString('pt-BR')}) ━━━
${context}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NAVEGAÇÃO — inclua "navigate" quando o usuário quiser ir a algum lugar:
• Equipamento: /dashboard/equipamentos?tag=1528EMC
• Certificados: /dashboard/certificados?q=1528EMC
• Norma: /dashboard/normas?q=IEC+61000-4-2
• Manual: /dashboard/manuais?q=1528EMC
• IT: /dashboard/instrucoes?q=1528EMC
• Procedimento: /dashboard/procedimentos?q=PC-001
• /dashboard/[ficha|ambiente|calibracao|relatorio|checagens/controle|incerteza|pendencias]

Retorne SEMPRE JSON válido:
{"message": "resposta", "navigate": "/dashboard/..."}
"navigate" é opcional. Sem markdown fora do JSON.`
}

export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json()
  if (!message) return NextResponse.json({ error: 'message obrigatório' }, { status: 400 })

  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GOOGLE_API_KEY não configurado' }, { status: 500 })

  const model = process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash'

  const labData = await fetchLabData()
  const context = buildContext(labData)
  const systemPrompt = buildSystem(context)

  const contents = [
    ...history.map((h: any) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: message }] },
  ]

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ message: `Erro na IA: ${err?.error?.message || res.statusText}` })
  }

  const data = await res.json()
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '{}'

  try {
    const json = JSON.parse(raw.replace(/^```json\n?|\n?```$/g, ''))
    return NextResponse.json(json)
  } catch {
    return NextResponse.json({ message: raw })
  }
}
