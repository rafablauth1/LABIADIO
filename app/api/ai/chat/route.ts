import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { messages, context } = await request.json()

    // Buscar dados do laboratório para contexto
    const { data: equip } = await supabase
      .from('equipamentos')
      .select('tag, descricao, cal_val, status')
      .limit(50)

    const { data: checagens } = await supabase
      .from('checagens')
      .select('equip_id, norma, data, resultado')
      .order('data', { ascending: false })
      .limit(10)

    const vencidos = (equip || []).filter(e => e.status === 'ativo' && e.cal_val && new Date(e.cal_val) < new Date())
    const chkStatus = (checagens || []).map(c => `${c.norma}: ${c.resultado} (${c.data})`).join(', ')

    const systemPrompt = `Você é o assistente técnico LABIADIO — especialista em metrologia e qualidade de laboratórios acreditados pela ISO/IEC 17025:2017.

DADOS REAIS DO LABORATÓRIO (atualizados):
- Total de equipamentos: ${(equip || []).length}
- Calibrações vencidas: ${vencidos.length} — TAGs: ${vencidos.map(e => e.tag).join(', ') || 'nenhuma'}
- Últimas checagens: ${chkStatus || 'sem dados'}

CONTEXTO EXTRA DO USUÁRIO:
${context || 'Nenhum'}

SUA EXPERTISE:
- IEC 61000-4-x (EMC), ISO/IEC 17025:2017, GUM (incerteza de medição)
- Metrologia, calibração, rastreabilidade metrológica
- INMETRO CGCRE, ILAC, EA-4/02, EURACHEM CG4

REGRAS:
- Responda em português
- Seja técnico e objetivo — máx. 200 palavras
- Cite seções normativas quando relevante (ex: ISO/IEC 17025 §6.4.6)
- Quando mencionar um equipamento, use a TAG (ex: 1528EMC)
- Se não souber, diga claramente`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: messages || [],
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply })

  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
