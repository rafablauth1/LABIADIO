import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const form   = await req.formData()
    const file   = form.get('file')   as File | null
    const folder = (form.get('folder') as string) || 'misc'
    const slug   = (form.get('slug')   as string) || 'file'

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 })

    const ext      = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    const safeName = slug.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 60)
    const path     = `${folder}/${safeName}-${Date.now()}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await createServiceClient().storage
      .from('docs')
      .upload(path, buffer, { contentType: file.type || 'application/pdf', upsert: true })

    if (error) throw error

    return NextResponse.json({ path })
  } catch (err: any) {
    console.error('[storage/upload]', err)
    return NextResponse.json({ error: err.message || 'Erro ao fazer upload.' }, { status: 500 })
  }
}
