import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const PROMPTS: Record<string, string> = {
  cert: `Analise este certificado de calibração e extraia as seguintes informações em JSON:
{
  "num": "número do certificado",
  "lab": "laboratório emissor (nome completo)",
  "emissao": "data de emissão no formato YYYY-MM-DD",
  "acred": "número de acreditação do laboratório (ex: CRL 0001)"
}
Retorne APENAS o JSON válido, sem texto adicional.`,

  manual: `Analise este manual técnico e extraia as seguintes informações em JSON:
{
  "titulo": "título completo do manual",
  "tipo": "exatamente um de: Manual do Usuário | Manual de Serviço | Manual de Calibração | Guia de Operação | Outro",
  "rev": "revisão ou versão (ex: Rev. A, v2.1)"
}
Retorne APENAS o JSON válido, sem texto adicional.`,

  it: `Analise esta Instrução de Trabalho e extraia as seguintes informações em JSON:
{
  "cod": "código da IT (ex: IT-EMC-001)",
  "titulo": "título da instrução de trabalho",
  "rev": "revisão (ex: Rev. 00)",
  "tags": "TAGs dos equipamentos envolvidos separadas por vírgula",
  "aprov": "nome do aprovador ou responsável técnico"
}
Retorne APENAS o JSON válido, sem texto adicional.`,

  proc: `Analise este Procedimento de Checagem e extraia as seguintes informações em JSON:
{
  "cod": "código do procedimento (ex: PC-EMC-001)",
  "ver": "versão (ex: v1.0)",
  "desc": "descrição breve do procedimento",
  "normas": ["array com normas aplicáveis, ex: IEC 61000-4-2"],
  "aprov": "nome do aprovador"
}
Retorne APENAS o JSON válido, sem texto adicional.`,

  norm: `Analise este documento normativo e extraia as seguintes informações em JSON:
{
  "norma": "designação da norma (ex: IEC 61000-4-2)",
  "ver": "versão ou ano de publicação (ex: 2014, Ed.2)",
  "titulo": "título completo da norma",
  "ensaio": "tipo de ensaio (ex: EMC - Imunidade ESD)"
}
Retorne APENAS o JSON válido, sem texto adicional.`,

  it_chk: `Analise esta Instrução de Trabalho de Checagem Intermediária e extraia as informações em JSON:
{
  "cod": "código da IT (ex: IT CHK5184)",
  "revisao": "revisão (ex: 00)",
  "data_revisao": "data no formato YYYY-MM-DD",
  "tag": "TAG do equipamento (ex: 1528EMC)",
  "descricao": "descrição/tipo do equipamento (ex: Gerador de Sinal)",
  "equipamentos_aux": "equipamentos auxiliares necessários para a checagem (item 3.1)",
  "grandezas": ["array com cada grandeza medida separada, ex: Tensão Alternada", "THD"],
  "self_test": false,
  "processo": "descrição resumida do processo de checagem (item 3.4, máximo 300 caracteres)",
  "normas": ["array de normas de referência, ex: IEC 61000-4-13"],
  "elaborado_por": "nome de quem elaborou",
  "aprovado_por": "nome de quem aprovou"
}
Retorne APENAS o JSON válido, sem texto adicional.`,
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY não configurada no servidor.' },
      { status: 500 }
    )
  }

  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const tipo = form.get('tipo') as string | null

    if (!file || !tipo) {
      return NextResponse.json({ error: 'file e tipo são obrigatórios' }, { status: 400 })
    }

    const prompt = PROMPTS[tipo]
    if (!prompt) {
      return NextResponse.json({ error: `tipo inválido: ${tipo}` }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
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
                data: base64,
              },
            } as any,
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Não foi possível extrair informações do PDF.' }, { status: 422 })
    }

    const extracted = JSON.parse(jsonMatch[0])
    return NextResponse.json(extracted)
  } catch (err: any) {
    console.error('[analyze-pdf]', err)
    return NextResponse.json(
      { error: err.message || 'Erro interno ao analisar PDF.' },
      { status: 500 }
    )
  }
}
