import { NextRequest, NextResponse } from 'next/server'
import { analyzeDocument } from '@/lib/ai'

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

  equipamento: `Analise este certificado de calibração e extraia as informações do equipamento calibrado.
Retorne um JSON com apenas os campos que encontrar — omita os que não estiverem no documento.
Não invente valores. Se não encontrar um campo, não o inclua no JSON.

Campos possíveis:
{
  "tag": "identificação/TAG do equipamento no laboratório — procure por campos como 'Identificação', 'TAG', 'Patrimônio', 'Item', 'Instrumento', 'Equipamento', 'Código'. O padrão é: 4 dígitos ou menos seguidos de 3 letras maiúsculas (ex: 1528EMC, 3055EMC) OU uma letra maiúscula seguida de até 4 dígitos e uma letra minúscula (ex: E0234e, S24x). Se encontrar algo nesse formato em qualquer parte do documento, inclua aqui.",
  "descricao": "fabricante + modelo do equipamento (ex: Fluke 87V Multímetro Digital)",
  "tipo": "tipo metrológico mais próximo: Gerador de Sinal | Amplificador de Potência | Analisador de Espectro | Medidor de Potência RF | Osciloscópio | Multímetro | Gerador ESD | Gerador EFT/Burst | Gerador de Surto | Gerador Dip/Interrupção | Medidor de Energia | Variac / Fonte CA | Padrão de Frequência | CDN / Acoplador | Divisor de Potência | Atenuador | LISN | Câmara Climática | Termo-Higrômetro | Outro",
  "fabricante": "fabricante do equipamento",
  "serie": "número de série",
  "ncert": "número do certificado",
  "lab_cal": "laboratório que emitiu o certificado",
  "cal_dt": "data de emissão no formato YYYY-MM-DD",
  "cal_val": "data de validade no formato YYYY-MM-DD"
}
Retorne APENAS o JSON válido, sem markdown, sem texto adicional.`,
}

export async function POST(req: NextRequest) {
  const provider = process.env.AI_PROVIDER || 'anthropic'

  // Validação de variáveis de ambiente por provedor
  const missing: string[] = []
  if (provider === 'anthropic'    && !process.env.ANTHROPIC_API_KEY)    missing.push('ANTHROPIC_API_KEY')
  if (provider === 'azure-openai' && !process.env.AZURE_OPENAI_KEY)     missing.push('AZURE_OPENAI_KEY')
  if (provider === 'azure-openai' && !process.env.AZURE_OPENAI_ENDPOINT) missing.push('AZURE_OPENAI_ENDPOINT')
  if (provider === 'gemini'       && !process.env.GOOGLE_API_KEY)        missing.push('GOOGLE_API_KEY')

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Variáveis de ambiente ausentes para o provedor "${provider}": ${missing.join(', ')}` },
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
    const text  = await analyzeDocument(bytes, prompt)

    // Tenta extrair JSON de várias formas (markdown, texto solto, etc.)
    let parsed: Record<string, any> | null = null

    // 1. Direto como JSON
    try { parsed = JSON.parse(text.trim()); } catch {}

    // 2. Dentro de ```json ... ```
    if (!parsed) {
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fence) try { parsed = JSON.parse(fence[1].trim()) } catch {}
    }

    // 3. Primeiro { ... } encontrado
    if (!parsed) {
      const block = text.match(/\{[\s\S]*\}/)
      if (block) try { parsed = JSON.parse(block[0]) } catch {}
    }

    // 4. Retorna objeto vazio — campos ficarão em branco, melhor que erro
    if (!parsed) parsed = {}

    // Fallback: se a IA não extraiu a TAG, tenta achar no texto bruto pelo padrão conhecido
    // Padrão 1: 1-4 dígitos + 3 letras maiúsculas  → ex: 1528EMC, 3055EMC
    // Padrão 2: 1 letra maiúscula + 1-4 dígitos + 1 letra minúscula → ex: E0234e, S24x
    if (tipo === 'equipamento' && !parsed.tag) {
      const tagMatch = text.match(/\b(\d{1,4}[A-Z]{3})\b/) || text.match(/\b([A-Z]\d{1,4}[a-z])\b/)
      if (tagMatch) parsed.tag = tagMatch[1]
    }

    // Remove campos null/undefined/vazios mas mantém os que têm valor
    const clean = Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => v !== null && v !== undefined && v !== '')
    )

    return NextResponse.json(clean)
  } catch (err: any) {
    console.error('[analyze-pdf]', err)
    const msg: string = err.message || ''
    if (msg.includes('credit balance') || msg.includes('too low') || err.status === 400) {
      return NextResponse.json(
        { error: 'Saldo insuficiente na API de IA. Acesse console.anthropic.com → Billing para adicionar créditos.' },
        { status: 402 }
      )
    }
    if (msg.includes('503') || msg.includes('indisponível') || msg.includes('sobrecarregado')) {
      return NextResponse.json(
        { error: 'O serviço de IA está sobrecarregado no momento. Aguarde alguns segundos e tente novamente.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: err.message || 'Erro interno ao analisar PDF.' },
      { status: 500 }
    )
  }
}
