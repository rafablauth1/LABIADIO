import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function analyzeDocument(bytes: ArrayBuffer, prompt: string): Promise<string> {
  const base64 = Buffer.from(bytes).toString('base64')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  })

  const block = response.content[0]
  return block.type === 'text' ? block.text : ''
}
