// Provider Azure OpenAI — ativo quando AI_PROVIDER=azure-openai
// Requer: npm install openai pdf-parse
export async function analyzeWithAzureOpenAI(_pdfBuffer: ArrayBuffer, _prompt: string): Promise<string> {
  throw new Error(
    'Provider Azure OpenAI não está instalado. ' +
    'Execute: npm install openai pdf-parse e configure AZURE_OPENAI_KEY, AZURE_OPENAI_ENDPOINT no .env.local'
  )
}
