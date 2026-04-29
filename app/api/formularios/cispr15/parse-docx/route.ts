import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

/* ─── injeta quebras de página no HTML gerado pelo mammoth ─────────────────
   Regras:
   • Antes de cada heading h1/h2/h3 (exceto o primeiro) → nova página
   • Antes de cada <p> que contenha APENAS uma <img>    → nova página
   • Tabelas: não quebram no meio (page-break-inside: avoid)
──────────────────────────────────────────────────────────────────────────── */
function injectPageBreaks(html: string): string {
  let first = true

  // page-break antes de headings (pula o primeiro)
  html = html.replace(/<(h[1-3])([ >])/g, (_m, tag, rest) => {
    if (first) { first = false; return `<${tag}${rest}` }
    return `<${tag} style="page-break-before:always;page-break-after:avoid"${rest}`
  })

  // page-break antes de <p> que contenha somente <img>
  html = html.replace(
    /<p>(\s*<img [^>]*>\s*)<\/p>/g,
    '<p style="page-break-before:always;text-align:center;margin:10px auto;page-break-inside:avoid">$1</p>',
  )

  // tabelas não partem no meio
  html = html.replace(/<table/g, '<table style="page-break-inside:avoid"')

  return html
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'file obrigatório' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    const result = await mammoth.convertToHtml(
      { buffer },
      {
        convertImage: mammoth.images.imgElement(function(img) {
          return (img.read() as Promise<Buffer>).then(function(buf: Buffer) {
            const base64 = Buffer.from(buf).toString('base64')
            const type   = img.contentType || 'image/png'
            if (type.includes('wmf') || type.includes('emf')) {
              console.warn('[parse-docx] imagem WMF/EMF — pode não renderizar no browser:', type)
            }
            return {
              src:   `data:${type};base64,${base64}`,
              style: 'max-width:170mm;width:auto;height:auto;display:block;margin:10px auto;page-break-inside:avoid',
            }
          })
        }),
      },
    )

    const html = injectPageBreaks(result.value)

    return NextResponse.json({ html })
  } catch (err: any) {
    console.error('[parse-docx]', err)
    return NextResponse.json({ error: err.message || 'Erro ao processar DOCX' }, { status: 500 })
  }
}
