import OpenAI from 'openai'
import pdfParse from 'pdf-parse'

// Azure OpenAI usa o SDK da OpenAI com endpoint customizado
function getClient() {
  return new OpenAI({
    apiKey: process.env.AZURE_OPENAI_KEY!,
    baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
    defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-02-01' },
    defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_KEY! },
  })
}

export async function analyzeWithAzureOpenAI(pdfBuffer: ArrayBuffer, prompt: string): Promise<string> {
  // GPT-4o não lê PDF nativamente — extrai o texto primeiro
  const buffer = Buffer.from(pdfBuffer)
  const parsed = await pdfParse(buffer)
  const pdfText = parsed.text.slice(0, 12000) // limita tokens

  const client = getClient()
  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `${prompt}\n\n--- CONTEÚDO DO PDF ---\n${pdfText}`,
    }],
  })
  return response.choices[0]?.message?.content?.trim() || ''
}
