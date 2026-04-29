import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

/* ─── contador de imagens para labels no placeholder ──────────────────────── */
let imgCounter = 0

/* ─── SVG placeholder para imagens WMF/EMF (não renderizáveis no browser) ── */
function wmfPlaceholder(index: number, type: string): string {
  const label  = `Gráfico ${index}`
  const hint   = `(${type} — exporte como PNG no Radimation)`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="180">
    <rect width="520" height="180" fill="#f4f4f4" stroke="#ccc" stroke-width="1.5" rx="4"/>
    <line x1="0" y1="0" x2="520" y2="180" stroke="#ddd" stroke-width="1"/>
    <line x1="520" y1="0" x2="0" y2="180" stroke="#ddd" stroke-width="1"/>
    <text x="260" y="82" text-anchor="middle" font-family="Arial" font-size="15" fill="#666" font-weight="bold">${label}</text>
    <text x="260" y="106" text-anchor="middle" font-family="Arial" font-size="10" fill="#999">${hint}</text>
  </svg>`
  return Buffer.from(svg).toString('base64')
}

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
  imgCounter = 0

  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'file obrigatório' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    const result = await mammoth.convertToHtml(
      { buffer },
      {
        convertImage: mammoth.images.imgElement(function(img) {
          imgCounter++
          const idx = imgCounter

          return Promise.resolve(img.read()).then(function(data: any) {
            const type = img.contentType || 'image/png'
            const buf  = Buffer.isBuffer(data) ? data : Buffer.from(data)

            console.log(`[parse-docx] imagem ${idx}: ${type} (${buf.length} bytes)`)

            const isVectorWin = type.includes('wmf') || type.includes('emf')

            if (isVectorWin || buf.length === 0) {
              // WMF/EMF não renderiza no browser — usa SVG placeholder
              console.warn(`[parse-docx] imagem ${idx} é ${type} — usando placeholder SVG`)
              return {
                src:   `data:image/svg+xml;base64,${wmfPlaceholder(idx, type)}`,
                style: 'max-width:170mm;width:100%;height:auto;display:block;margin:10px auto;page-break-inside:avoid',
              }
            }

            return {
              src:   `data:${type};base64,${buf.toString('base64')}`,
              style: 'max-width:170mm;width:auto;height:auto;display:block;margin:10px auto;page-break-inside:avoid',
            }
          }).catch(function(err: any) {
            console.error(`[parse-docx] erro ao ler imagem ${idx}:`, err)
            return {
              src:   `data:image/svg+xml;base64,${wmfPlaceholder(idx, 'erro')}`,
              style: 'max-width:170mm;width:100%;height:auto;display:block;margin:10px auto;',
            }
          })
        }),
      },
    )

    // loga avisos do mammoth (ex: elementos não suportados)
    if (result.messages.length > 0) {
      console.log('[parse-docx] avisos mammoth:', result.messages.map((m: any) => m.message))
    }

    const html = injectPageBreaks(result.value)

    return NextResponse.json({ html, warnings: result.messages.map((m: any) => m.message) })
  } catch (err: any) {
    console.error('[parse-docx]', err)
    return NextResponse.json({ error: err.message || 'Erro ao processar DOCX' }, { status: 500 })
  }
}
