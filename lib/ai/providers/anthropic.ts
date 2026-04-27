import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function analyzeWithAnthropic(pdfBase64: string, prompt: string): Promise<string> {
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } } as any,
        { type: 'text', text: prompt },
      ],
    }],
  })
  return response.content[0].type === 'text' ? response.content[0].text.trim() : ''
}
