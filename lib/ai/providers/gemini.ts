const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const MODELS = [
  process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]

async function tryModel(model: string, apiKey: string, body: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })

    if (res.ok) {
      const data = await res.json()
      const parts: any[] = data?.candidates?.[0]?.content?.parts || []
      return parts.find((p: any) => p.text && !p.thought)?.text?.trim()
          ?? parts[parts.length - 1]?.text?.trim()
          ?? ''
    }

    // 429 ou 503 → sinaliza para tentar o próximo modelo
    if (res.status === 429) return null
    if (res.status === 503) {
      if (attempt < 2) { await sleep(6000 * (attempt + 1)); continue }
      return null  // após 3 tentativas, tenta próximo modelo
    }

    // outro erro → loga mas não interrompe o fallback
    return null
  }

  return null
}

export async function analyzeWithGemini(pdfBase64: string, prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY!
  const body = JSON.stringify({
    contents: [{
      parts: [
        { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
        { text: prompt },
      ],
    }],
    generationConfig: { maxOutputTokens: 8192, temperature: 0.1 },
  })

  for (const model of MODELS) {
    const result = await tryModel(model, apiKey, body)
    if (result !== null) return result
  }

  throw new Error(
    'Serviço de IA indisponível no momento. Todos os modelos retornaram erro. ' +
    'Aguarde alguns minutos e tente novamente.'
  )
}
