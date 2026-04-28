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

function buildSystem(context: string): string {
  return `Você é o LABI — assistente técnico especializado do laboratório de ensaios EMC LABELO PUCRS, acreditado pela ISO/IEC 17025:2017.

Você tem acesso completo e em tempo real a todos os dados do laboratório: equipamentos, certificados de calibração, normas, instruções de trabalho, procedimentos, condições ambientais e auxiliares.

Responda em português brasileiro. Seja preciso, técnico e direto. Quando analisar dados, faça comparações, identifique problemas, dê recomendações concretas. Você é um especialista em metrologia, calibração e gestão da qualidade.

━━━ DADOS REAIS DO LABORATÓRIO (hoje: ${new Date().toLocaleDateString('pt-BR')}) ━━━
${context}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VOCÊ PODE:
• Responder sobre status de qualquer equipamento por TAG ou nome
• Informar datas de vencimento, laboratórios calibradores, números de certificado
• Listar equipamentos vencidos ou a vencer, por tipo, norma ou status
• Explicar normas IEC/CISPR e como se aplicam aos equipamentos do lab
• Auxiliar na interpretação de ITs e procedimentos de checagem
• Analisar condições ambientais e tendências
• Calcular prazos, comparar períodos, sugerir ações
• Navegar para qualquer tela do sistema

NAVEGAÇÃO — inclua "navigate" quando pedido:
• Equipamento: /dashboard/equipamentos?tag=1528EMC
• Certificados: /dashboard/certificados?q=1528EMC
• Norma: /dashboard/normas?q=IEC+61000-4-2
• Manual: /dashboard/manuais?q=1528EMC
• IT: /dashboard/instrucoes?q=1528EMC
• Procedimento: /dashboard/procedimentos?q=PC-001
• Ficha integrada: /dashboard/ficha
• Ambiente: /dashboard/ambiente
• Calibração: /dashboard/calibracao
• Relatório: /dashboard/relatorio
• Checagens: /dashboard/checagens/controle

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
