const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function analyzeWithGemini(pdfBase64: string, prompt: string): Promise<string> {
  const model = process.env.GOOGLE_AI_MODEL || 'gemini-2.0-flash'
  const apiKey = process.env.GOOGLE_API_KEY!
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const body = JSON.stringify({
    contents: [{
      parts: [
        { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
        { text: prompt },
      ],
    }],
    generationConfig: { maxOutputTokens: 8192, temperature: 0.1 },
  })

  const MAX_RETRIES = 3
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })

    if (res.ok) {
      const data = await res.json()
      const parts: any[] = data?.candidates?.[0]?.content?.parts || []
      const text = parts.find((p: any) => p.text && !p.thought)?.text?.trim()
                ?? parts[parts.length - 1]?.text?.trim()
                ?? ''
      return text
    }

    const err = await res.json().catch(() => ({}))
    const isRetryable = res.status === 503 || res.status === 429

    if (isRetryable && attempt < MAX_RETRIES - 1) {
      await sleep(2000 * (attempt + 1))
      continue
    }

    const msg = err?.error?.message || res.statusText
    if (res.status === 503) throw new Error(`Gemini indisponível (503): serviço sobrecarregado. Tente novamente em instantes.`)
    if (res.status === 429) throw new Error(`Gemini: limite de requisições atingido (429). Aguarde alguns segundos.`)
    throw new Error(`Gemini API error ${res.status}: ${msg}`)
  }

  throw new Error('Gemini: máximo de tentativas atingido. Tente novamente.')
}
