const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Fallback automático: se um modelo bater limite, tenta o próximo
const MODELS = [
  process.env.GOOGLE_AI_MODEL || 'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b-latest',
]

async function tryModel(model: string, apiKey: string, body: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })

    if (res.ok) {
      const data = await res.json()
      const parts: any[] = data?.candidates?.[0]?.content?.parts || []
      return parts.find((p: any) => p.text && !p.thought)?.text?.trim()
          ?? parts[parts.length - 1]?.text?.trim()
          ?? ''
    }

    if (res.status === 429) return null   // cota esgotada — tenta próximo modelo

    if (res.status === 503 && attempt === 0) {
      await sleep(4000)
      continue
    }

    const err = await res.json().catch(() => ({}))
    throw new Error(`Gemini API error ${res.status}: ${err?.error?.message || res.statusText}`)
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
    // cota esgotada neste modelo → tenta o próximo imediatamente
  }

  throw new Error('Gemini: cota esgotada em todos os modelos disponíveis. Tente novamente amanhã ou gere uma nova chave em aistudio.google.com.')
}
