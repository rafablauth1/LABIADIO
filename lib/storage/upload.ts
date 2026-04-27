/**
 * Funções client-side de storage.
 * Toda operação passa pela API Route — a connection string Azure fica só no servidor.
 */

export async function uploadFile(
  file: File,
  folder: string,
  slug: string
): Promise<string | null> {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', folder)
  form.append('slug', slug)

  const res = await fetch('/api/storage/upload', { method: 'POST', body: form })
  const data = await res.json()

  if (!res.ok) {
    alert('Erro no upload: ' + (data.error || res.statusText))
    return null
  }
  return data.path as string
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const res = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(path)}`)
  const data = await res.json()
  if (!res.ok) return null
  return data.url as string
}

export async function removeFile(path: string): Promise<void> {
  await fetch(`/api/storage/delete?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
}
