/**
 * Abstração de armazenamento de arquivos.
 *
 * AGORA   → Supabase Storage (bucket 'docs')
 * FUTURO  → Azure Blob Storage
 *
 * Para migrar:
 *   1. npm install @azure/storage-blob
 *   2. Criar container no Azure Blob Storage (portal.azure.com)
 *   3. Implementar lib/storage/providers/azure-blob.ts
 *   4. Alterar STORAGE_PROVIDER=azure no .env.local
 *
 * Variáveis Azure Blob necessárias:
 *   AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
 *   AZURE_STORAGE_CONTAINER=labiadio-docs
 *
 * Componentes que usam storage (para atualizar na migração):
 *   - components/modals/CertificadoModal.tsx  (upload PDF)
 *   - app/dashboard/ficha/page.tsx            (PdfButton - signed URL)
 *   - app/api/analyze-pdf/route.ts            (leitura de PDF)
 */

export {}
