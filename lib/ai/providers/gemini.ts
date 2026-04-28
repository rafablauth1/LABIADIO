export async function analyzeWithGemini(pdfBase64: string, prompt: string): Promise<string> {
  const model = process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash'
  const apiKey = process.env.GOOGLE_API_KEY!

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
            { text: prompt },
          ],
        }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.1 },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Gemini API error ${res.status}: ${err?.error?.message || res.statusText}`)
  }

  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
}
