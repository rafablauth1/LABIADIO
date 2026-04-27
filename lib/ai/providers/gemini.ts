import { GoogleGenerativeAI } from '@google/generative-ai'

export async function analyzeWithGemini(pdfBase64: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: process.env.GOOGLE_AI_MODEL || 'gemini-1.5-flash',
  })

  const result = await model.generateContent([
    { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
    { text: prompt },
  ])
  return result.response.text().trim()
}
