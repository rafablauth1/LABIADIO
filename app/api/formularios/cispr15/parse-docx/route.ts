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
    '<p style="page-break-before:always;text-align:center;margin:0">$1</p>',
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
        convertImage: mammoth.images.imgElement(async (img) => {
          const base64 = await img.read('base64') as string
          return { src: `data:${img.contentType};base64,${base64}` }
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
