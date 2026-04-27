import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path é obrigatório.' }, { status: 400 })

  try {
    const { data, error } = await createServiceClient().storage
      .from('docs')
      .createSignedUrl(path, 3600)

    if (error) throw error

    return NextResponse.json({ url: data.signedUrl })
  } catch (err: any) {
    console.error('[storage/signed-url]', err)
    return NextResponse.json({ error: err.message || 'Erro ao gerar URL.' }, { status: 500 })
  }
}
