/**
 * Abstração de provedor de IA.
 * Para trocar de provedor: altere AI_PROVIDER no .env.local
 *
 * Provedores disponíveis:
 *   anthropic      → Anthropic Claude  (ANTHROPIC_API_KEY)
 *   azure-openai   → Azure OpenAI      (AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT)
 *   gemini         → Google Gemini     (GOOGLE_API_KEY)
 */

import { analyzeWithAnthropic }   from './providers/anthropic'
import { analyzeWithAzureOpenAI } from './providers/azure-openai'
import { analyzeWithGemini }      from './providers/gemini'

const PROVIDER = process.env.AI_PROVIDER || 'anthropic'

export async function analyzeDocument(pdfBuffer: ArrayBuffer, prompt: string): Promise<string> {
  const base64 = Buffer.from(pdfBuffer).toString('base64')

  switch (PROVIDER) {
    case 'azure-openai':
      return analyzeWithAzureOpenAI(pdfBuffer, prompt)

    case 'gemini':
      return analyzeWithGemini(base64, prompt)

    case 'anthropic':
    default:
      return analyzeWithAnthropic(base64, prompt)
  }
}
