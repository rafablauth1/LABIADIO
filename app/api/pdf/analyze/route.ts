import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const PROMPTS: Record<string, string> = {
  cert: `Analise este certificado de calibração e extraia APENAS estes campos em JSON:
{
  "num": "número do certificado (ex: R0047-2025)",
  "lab": "nome completo do laboratório emitente",
  "emissao": "data de emissão YYYY-MM-DD",
  "acreditacao": "número de acreditação CGCRE/INMETRO ou null",
  "descricao_equip": "descrição/modelo do equipamento calibrado",
  "fabricante": "fabricante do equipamento ou null",
  "serie": "número de série ou null",
  "obs": "observações, ressalvas ou condições especiais (resumo em 1 frase) ou null"
}
Responda SOMENTE com o JSON. Sem texto antes ou depois. Suporte português e inglês.`,

  manual: `Analise este documento (manual, instrução de trabalho ou procedimento) e extraia em JSON:
{
  "titulo": "título completo do documento",
  "codigo": "código do documento (ex: IT-EMC-001, PQ 6.4) ou null",
  "versao": "versão ou revisão (ex: Rev. 25) ou null",
  "data": "data do documento YYYY-MM-DD ou null",
  "tipo": "Manual|Instrução de Trabalho|Procedimento|Ficha Técnica|Outro",
  "descricao": "resumo em 1 frase do que o documento trata"
}
Responda SOMENTE com o JSON.`,

  norma: `Analise esta norma técnica e extraia em JSON:
{
  "norma": "identificação da norma (ex: IEC 61000-4-6)",
  "versao": "ano da versão (ex: 2013)",
  "titulo": "título completo da norma",
  "ensaio": "tipo de ensaio descrito (ex: Imunidade Conduzida CS)"
}
Responda SOMENTE com o JSON.`,

  aumento_per: `Analise este documento técnico (análise ou relatório para aumento de periodicidade de calibração) e extraia em JSON:
{
  "justif": "justificativa técnica principal (máx 300 caracteres)",
  "norma": "normas referenciadas (ex: ISO/IEC 17025:2017 §6.4.7) ou null",
  "per_prop": "periodicidade proposta em meses se mencionada ou null"
}
Responda SOMENTE com o JSON.`,

  calplan_param: `Analise esta norma ou requisito técnico e extraia em JSON:
{
  "norma": "norma (ex: IEC 61000-4-6:2013)",
  "secao": "seção ou cláusula relevante (ex: §6.3.2) ou null",
  "param": "parâmetro ou grandeza mencionada ou null",
  "criterio": "critério ou faixa de aceitação ou null",
  "obs": "observação relevante ou null"
}
Responda SOMENTE com o JSON.`,
}

export async function POST(request: NextRequest) {
  try {
    const { pdfBase64, tipo } = await request.json()

    if (!pdfBase64 || !tipo) {
      return NextResponse.json({ error: 'pdfBase64 e tipo são obrigatórios' }, { status: 400 })
    }

    const prompt = PROMPTS[tipo]
    if (!prompt) {
      return NextResponse.json({ error: `Tipo '${tipo}' não suportado` }, { status: 400 })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extrair JSON da resposta
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ error: 'Resposta da IA não contém JSON válido', raw }, { status: 422 })
    }

    const extracted = JSON.parse(match[0])
    return NextResponse.json({ data: extracted })

  } catch (error) {
    console.error('PDF analyze error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
