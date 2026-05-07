'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer, Upload, X, Loader2, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type Cispr15Config, getTensoes, CFG_KEY, PHOTOS_KEY, DOCX_HTML_KEY, DOCX_NAME_KEY,
} from '../types'

/* ─── tipos ────────────────────────────────────────────────────────────────── */
interface DocxState { loading: boolean; html: string | null; filename: string | null }
interface Photo     { url: string; name: string }

const LABEL_ID: Record<string, string> = { lampada: 'Código de Barras', luminaria: 'N° de Série' }
const BLUE = '#003366'
const PUCRS_LOGO = '/formularios/emc/pucrs-logo.png'
const CRL_BADGE  = '/formularios/emc/crl0075.jpg'

/* ─── estilos de texto base (Arial 11pt) ───────────────────────────────────── */
const FS = { base: '11pt', med: '10pt', sm: '9pt', xs: '8pt', xxs: '7pt' } as const

const GRAY1 = '#C8C8C8'  // cabeçalhos de seção e th de tabela
const GRAY2 = '#E5E5E5'  // sub-títulos e áreas de info

const p:      React.CSSProperties = { marginBottom: 5,  fontSize: FS.base, fontFamily: 'Arial, sans-serif' }
const pJ:     React.CSSProperties = { ...p, textAlign: 'justify' }
const pTitle: React.CSSProperties = { ...p, fontWeight: 700, marginTop: 14, marginBottom: 4, background: GRAY2, padding: '4px 8px' }
const pSub:   React.CSSProperties = { ...p, fontWeight: 700, background: GRAY2, padding: '3px 8px' }

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

/* ─── rodapé com endereço — absoluto no fundo de cada página ───────────────── */
function PageFooter() {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      borderTop: '1px solid #ccc',
      background: '#f9f9f9',
      fontSize: FS.xxs,
      color: '#666',
      textAlign: 'center',
      padding: '3px 14mm',
      lineHeight: 1.5,
    }}>
      Av. Ipiranga n° 6681, Prédio 30 Bloco A, Sala 210 – Partenon – CEP 90619-900 – Porto Alegre – RS – Brasil&nbsp;&nbsp;|&nbsp;&nbsp;
      Tel.: (51) 3320 3551 – E-mail: labelo@pucrs.br – www.labelo.com.br
    </div>
  )
}

/* ─── wrapper de página A4 com margens Word (15 mm topo) ───────────────────── */
function Page({ children, first, flow }: { children: React.ReactNode; first?: boolean; flow?: boolean }) {
  return (
    <div className={cn('doc-page', first && 'doc-page-first', flow && 'doc-page-flow')}>
      <div style={{ padding: '15mm 14mm 22mm', boxSizing: 'border-box' as const, minHeight: '100%' }}>
        {children}
      </div>
      <PageFooter />
    </div>
  )
}

/* ─── cabeçalho repetido (páginas 2+) — layout Word ────────────────────────── */
function PageHeader({ cfg }: { cfg: Cispr15Config }) {
  return (
    <div style={{ border: `1.5px solid ${BLUE}`, marginBottom: 10, overflow: 'hidden' }}>
      {/* Linha 1: LABELO/PUCRS | acred | N° */}
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #ccc', background: GRAY2 }}>
        <div style={{ width: 70, flexShrink: 0, padding: '3px 6px', borderRight: '1px solid #ccc', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '7.5pt', fontWeight: 700, color: BLUE }}>LABELO/PUCRS</span>
        </div>
        <div style={{ flex: 1, padding: '3px 8px', borderRight: '1px solid #ccc' }}>
          <span style={{ fontSize: '6.5pt', color: '#444' }}>
            Laboratório de Ensaio acreditado pela Cgcre de acordo com a ABNT NBR ISO/IEC 17025, sob o número CRL 0075
          </span>
        </div>
        <div style={{ width: 160, flexShrink: 0, padding: '3px 8px', textAlign: 'right' }}>
          <div style={{ fontSize: '6pt', color: '#666' }}>Relatório de Ensaio</div>
          <div style={{ fontSize: '8.5pt', fontWeight: 700, color: BLUE }}>{cfg.numRelatorio || '—'}</div>
        </div>
      </div>
      {/* Linha 2: produto | período | emissão */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#eef2f8', padding: '2px 8px' }}>
        <span style={{ fontSize: '7pt', fontWeight: 700, color: BLUE, flex: 1 }}>
          {cfg.produto} – {cfg.modelo} – {cfg.fabricante}
        </span>
        <span style={{ fontSize: '6.5pt', color: '#444' }}>
          Período: {fmtDate(cfg.periodoInicio)} até {fmtDate(cfg.periodoFim)}
        </span>
        <span style={{ fontSize: '6.5pt', color: '#444' }}>
          Emissão: {fmtDate(cfg.dataEmissao)}
        </span>
      </div>
    </div>
  )
}

/* ─── barra de seção azul ─────────────────────────────────────────────────── */
function SecHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: GRAY1, color: '#000',
      fontSize: FS.base, fontWeight: 700,
      padding: '5px 10px',
      margin: '14px 0 8px',
    }}>
      {children}
    </div>
  )
}

/* ─── tabela de limites ───────────────────────────────────────────────────── */
function LimitTable({ cols, rows, note }: { cols: string[]; rows: string[][]; note?: string }) {
  const td: React.CSSProperties = { border: '1px solid #ccc', padding: '3px 6px', textAlign: 'center', fontSize: FS.sm }
  const th: React.CSSProperties = { ...td, background: GRAY1, color: '#000', fontWeight: 700 }
  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <thead><tr>{cols.map(c => <th key={c} style={th}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f5f8ff' }}>
              {r.map((cell, j) => <td key={j} style={td}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p style={{ fontSize: FS.xxs, color: '#555', marginBottom: 6 }}>{note}</p>}
    </>
  )
}

/* ─── página principal ─────────────────────────────────────────────────────── */
export default function Cispr15RelatorioPage() {
  const router = useRouter()
  const [cfg,         setCfg]        = useState<Cispr15Config | null>(null)
  const [docx,        setDocx]       = useState<DocxState>({ loading: false, html: null, filename: null })
  const [photos,      setPhotos]     = useState<Photo[]>([])
  const [photoWidth,  setPhotoWidth] = useState(140)
  const [pastaLoading, setPastaLoading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const pastaRef = useRef<HTMLInputElement>(null)

  const docxPages = useMemo(() => {
    if (!docx.html) return []
    try {
      const parser = new DOMParser()
      const dom = parser.parseFromString(docx.html, 'text/html')
      const children = Array.from(dom.body.children)
      const pages: string[] = []
      let current = ''
      for (const child of children) {
        const el = child as HTMLElement
        const style = el.getAttribute('style') ?? ''
        if (el.tagName === 'DIV' && style.includes('page-break-before:always')) {
          if (current.trim()) { pages.push(current); current = '' }
          pages.push(el.innerHTML)
        } else {
          current += el.outerHTML
        }
      }
      if (current.trim()) pages.push(current)
      return pages.length > 0 ? pages : [docx.html]
    } catch { return [docx.html] }
  }, [docx.html])

  useEffect(() => {
    if (photoRef.current) photoRef.current.setAttribute('webkitdirectory', '')
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem(CFG_KEY)
    if (!raw) { router.replace('/dashboard/formularios/emc/cispr15'); return }
    setCfg(JSON.parse(raw))
    const dHtml = localStorage.getItem(DOCX_HTML_KEY)
    const dName = localStorage.getItem(DOCX_NAME_KEY)
    if (dHtml) setDocx({ loading: false, html: dHtml, filename: dName })
    try {
      const rawP = localStorage.getItem(PHOTOS_KEY)
      if (rawP) {
        const arr: { name: string; base64: string }[] = JSON.parse(rawP)
        setPhotos(arr.map(ph => ({ url: `data:image/jpeg;base64,${ph.base64}`, name: ph.name })))
      }
    } catch {}
  }, [router])

  async function handleDocx(file: File) {
    setDocx({ loading: true, html: null, filename: null })
    try {
      const fd = new FormData(); fd.append('file', file)
      const res  = await fetch('/api/formularios/cispr15/parse-docx', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDocx({ loading: false, html: data.html, filename: file.name })
      try { localStorage.setItem(DOCX_HTML_KEY, data.html) } catch {}
      try { localStorage.setItem(DOCX_NAME_KEY, file.name) } catch {}
    } catch (err: any) {
      alert(`Erro ao processar: ${err.message}`)
      setDocx({ loading: false, html: null, filename: null })
    }
  }

  function handlePhotosFromFiles(files: File[]) {
    const getNum = (name: string) => parseInt(name.replace(/\.[^/.]+$/, '').replace(/\D/g, ''), 10) || 0
    const sorted = [...files].sort((a, b) => getNum(a.name) - getNum(b.name))
    setPhotos(sorted.map(f => ({ url: URL.createObjectURL(f), name: f.name })))
  }

  function handlePhotos(files: FileList) {
    const getNum = (name: string) => parseInt(name.replace(/\.[^/.]+$/, '').replace(/\D/g, ''), 10) || 0
    const sorted = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .sort((a, b) => getNum(a.name) - getNum(b.name))
    handlePhotosFromFiles(sorted)
  }

  async function handlePastaCompleta(files: FileList) {
    setPastaLoading(true)
    try {
      const all = Array.from(files)
      const getNum = (name: string) => parseInt(name.replace(/\.[^/.]+$/, '').replace(/\D/g, ''), 10) || 0

      const docxFile = all.find(f => f.name.toLowerCase().endsWith('.docx'))
      const imageFiles = all
        .filter(f => f.type.startsWith('image/'))
        .sort((a, b) => getNum(a.name) - getNum(b.name))

      await Promise.all([
        docxFile              ? handleDocx(docxFile)             : Promise.resolve(),
        imageFiles.length > 0 ? (handlePhotosFromFiles(imageFiles), Promise.resolve()) : Promise.resolve(),
      ])
    } finally {
      setPastaLoading(false)
    }
  }

  if (!cfg) return null

  const tensoes = getTensoes(cfg)
  const labelId = LABEL_ID[cfg.tipo]

  /* ── tabelas de limites CISPR 15 ── */
  const limCond1 = {
    cols: ['Faixa de Frequência (MHz)', 'Limite Quase Pico (dBμV)', 'Limite Médio (dBμV)'],
    rows: [
      ['0,009 a 0,05', '110', '—'], ['0,05 a 0,15', '90 a 80', '—'],
      ['0,15 a 0,5', '66 a 56', '56 a 46'], ['0,5 a 5', '56', '46'], ['5 a 30', '60', '50'],
    ],
    note: '(1) Na freq. de transição, o limite inferior se aplica. (2) O limite decresce linearmente com o logaritmo da frequência nas faixas de 50–150 kHz e 150–500 kHz.',
  }
  const limCond2 = {
    cols: ['Faixa de Frequência (MHz)', 'Limite Quase Pico (dBμV)', 'Limite Médio (dBμV)'],
    rows: [['0,15 a 0,5', '80', '70'], ['0,5 a 30', '74', '64']],
    note: '(1) Na freq. de transição, o limite inferior se aplica.',
  }
  const limCond3 = {
    cols: ['Faixa de Frequência (MHz)', 'Limite Quase Pico (dBμV)', 'Limite Médio (dBμV)'],
    rows: [['0,15 a 0,5', '84 a 74', '74 a 64'], ['0,5 a 30', '74', '64']],
    note: '(1) Os limites diminuem linearmente com o logaritmo da frequência na faixa de 0,15 a 0,5 MHz.',
  }
  const limRad1 = {
    cols: ['Faixa de Frequência (MHz)', 'Limite Antena Loop 2 m (dBμA)'],
    rows: [
      ['0,009 a 0,07', '88'], ['0,07 a 0,15', '88 a 58'],
      ['0,15 a 3', '58 a 22'], ['3 a 30', '22'],
    ],
    note: '(1) Na freq. de transição, o limite inferior se aplica. (2) O limite decresce linearmente com o logaritmo da frequência nas faixas 70–150 kHz e 150 kHz–3 MHz.',
  }
  const limRad2 = {
    cols: ['Faixa de Frequência (MHz)', 'Limite Quase Pico (dBμV/m)'],
    rows: [['30 a 100', '64 a 54'], ['100 a 230', '54'], ['230 a 300', '61']],
    note: '(1) Na freq. de transição, o limite inferior se aplica. (2) O limite decresce linearmente com o logaritmo da frequência na faixa de 30–100 MHz.',
  }

  /* ── páginas de fotos: mínimo 4 slots (2 páginas × 2) ── */
  const slots: (Photo | null)[] = [...photos]
  while (slots.length < 4) slots.push(null)
  const photoPages: (Photo | null)[][] = []
  for (let i = 0; i < slots.length; i += 2) photoPages.push(slots.slice(i, i + 2))

  return (
    <>
      {/* ── estilos globais ── */}
      <style>{`
        @page { size: A4; margin: 0; }

        @media screen {
          .doc-wrapper { background: #525659; padding: 24px 16px; min-height: 100vh; }
          .doc-page {
            background: white; width: 210mm; min-height: 297mm;
            margin: 0 auto 16px;
            box-shadow: 0 3px 18px rgba(0,0,0,.6);
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt; color: #000; line-height: 1.4;
            position: relative; box-sizing: border-box;
          }
        }

        @media print {
          aside, nav, header, .no-print { display: none !important; }
          body, html { background: white !important; margin: 0 !important; padding: 0 !important; }
          .doc-wrapper { background: white; padding: 0; }
          .doc-page {
            width: 210mm; height: 297mm;
            box-shadow: none; margin: 0;
            page-break-before: always;
            overflow: hidden;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt; color: #000; line-height: 1.4;
            position: relative; box-sizing: border-box;
          }
          .doc-page-first { page-break-before: avoid; }
          .doc-page-flow  { height: auto !important; overflow: visible !important; }
          .upload-zone { display: none !important; }
          .doc-content th {
            background-color: ${GRAY1} !important; color: #000 !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          .doc-content tr:nth-child(even) td {
            background-color: #f5f8ff !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          .doc-content table { page-break-inside: avoid !important; }
          .doc-content img {
            max-width: 165mm !important; width: auto !important; height: auto !important;
            display: block !important; margin: 10px auto !important;
            page-break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
        }

        /* estilos do conteúdo Radimation */
        .doc-content table { width:100%; border-collapse:collapse; margin:8px 0; font-size:9pt; font-family:Arial,sans-serif; }
        .doc-content td,.doc-content th { border:1px solid #ccc !important; padding:4px 7px; text-align:center; }
        .doc-content th { background:${GRAY1}; color:#000; font-weight:700; }
        .doc-content tr:nth-child(even) td { background:#f5f8ff; }
        .doc-content img { max-width:165mm; width:auto; height:auto; border:1px solid #ddd; display:block; margin:12px auto; page-break-inside:avoid; }
        .doc-content p { margin-bottom:5px; font-size:11pt; font-family:Arial,sans-serif; }
        .doc-content h1,.doc-content h2,.doc-content h3,.doc-content h4 {
          font-size:12pt; font-weight:700; color:#000;
          background:${GRAY2}; padding:4px 8px;
          margin:14px 0 6px; font-family:Arial,sans-serif;
        }
      `}</style>

      {/* ── barra de controles (não imprime) ── */}
      <div className="no-print flex flex-wrap items-center gap-2 mb-6">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors text-sm mr-1">
          <ArrowLeft size={14} /> Voltar
        </button>

        <span className="text-white/10">|</span>

        {/* ── Botão principal: carregar pasta ── */}
        <label className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all',
          pastaLoading
            ? 'border-blue-300/30 bg-blue-500/8 text-blue-400 pointer-events-none'
            : (docx.html || photos.length > 0)
              ? 'border-green/30 bg-green/8 text-green-400 hover:border-green/50 cursor-pointer'
              : 'border-gold/40 bg-gold/8 text-gold hover:bg-gold/14 cursor-pointer',
        )}>
          {pastaLoading ? <Loader2 size={12} className="animate-spin" /> : <FolderOpen size={13} />}
          {pastaLoading ? 'Processando pasta…' : (docx.html || photos.length > 0) ? 'Trocar Pasta' : 'Carregar Pasta do Ensaio'}
          <input ref={pastaRef} type="file" className="hidden"
            disabled={pastaLoading}
            {...{ webkitdirectory: '' } as any}
            onChange={e => { if (e.target.files?.length) handlePastaCompleta(e.target.files) }} />
        </label>

        {/* Status resumido */}
        {docx.html && (
          <span className="text-[10px] text-white/30 font-mono truncate max-w-[140px]">✓ {docx.filename}</span>
        )}
        {photos.length > 0 && (
          <span className="text-[10px] text-white/30 font-mono">✓ {photos.length} foto(s)</span>
        )}

        <span className="text-white/10">|</span>

        {/* Controles individuais (fallback) */}
        {docx.loading ? (
          <div className="flex items-center gap-1 text-blue-400 text-xs">
            <Loader2 size={11} className="animate-spin" /> .docx…
          </div>
        ) : (
          <label className="flex items-center gap-1 px-2 py-1 rounded border border-white/8 text-[11px] text-white/30 hover:text-white/60 cursor-pointer transition-all">
            <Upload size={10} /> .docx
            <input type="file" accept=".docx" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleDocx(f) }} />
          </label>
        )}

        <label className="flex items-center gap-1 px-2 py-1 rounded border border-white/8 text-[11px] text-white/30 hover:text-white/60 cursor-pointer transition-all">
          <Upload size={10} /> fotos
          <input ref={photoRef} type="file" className="hidden"
            onChange={e => { if (e.target.files?.length) handlePhotos(e.target.files) }} />
        </label>

        {photos.length > 0 && (
          <button onClick={() => setPhotos([])} className="text-white/20 hover:text-red-400 text-xs transition-colors">
            <X size={11} />
          </button>
        )}

        {photos.length > 0 && (
          <div className="flex items-center gap-1.5">
            <input
              type="range" min={60} max={175} step={5} value={photoWidth}
              onChange={e => setPhotoWidth(Number(e.target.value))}
              className="w-20 accent-yellow-400 cursor-pointer"
            />
            <span className="text-white/30 text-[10px] font-mono">{photoWidth}mm</span>
          </div>
        )}

        <div className="flex-1" />
        <button
          onClick={() => {
            const sanitize = (s: string) =>
              s.replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, '_').substring(0, 25)
            const num    = sanitize(cfg.numRelatorio || 'SEM-NUMERO')
            const proto  = cfg.protocolo || 'SEM-PROTOCOLO'
            const client = sanitize(cfg.cliente || 'SEM-CLIENTE')
            const tipo   = cfg.tipo === 'luminaria' ? 'Luminaria' : 'Lampada'
            const title  = `${num}_${proto}_${client}_${tipo}`
            const prev   = document.title
            document.title = title
            window.print()
            setTimeout(() => { document.title = prev }, 1500)
          }}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
          <Printer size={14} /> Imprimir / PDF
        </button>
      </div>

      {/* ════════════════════════════════════════════════
          DOCUMENTO — cada <Page> = folha A4 separada
      ════════════════════════════════════════════════ */}
      <div className="doc-wrapper">

        {/* ══ PÁGINA 1 — CAPA ══ */}
        <Page first>
          {/* Cabeçalho da capa — layout Word */}
          <div style={{ border: '1px solid #999', marginBottom: 10, overflow: 'hidden' }}>
            {/* Topo escuro: logo PUCRS + texto universidade + CRL */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#3C3C3C', minHeight: 80 }}>
              <div style={{ width: 82, flexShrink: 0, padding: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={PUCRS_LOGO} alt="PUCRS" style={{ width: 66, height: 'auto', display: 'block' }} />
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '6px 8px' }}>
                <p style={{ fontSize: '10pt', fontWeight: 700, color: '#fff', margin: '0 0 3px' }}>Pontifícia Universidade Católica do Rio Grande do Sul</p>
                <p style={{ fontSize: '8.5pt', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>LABELO - Laboratórios Especializados em Eletroeletrônica</p>
                <p style={{ fontSize: '8.5pt', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Calibração e Ensaios</p>
                <p style={{ fontSize: '8.5pt', fontWeight: 700, color: '#fff', margin: 0 }}>Rede Brasileira de Laboratórios de Ensaios</p>
              </div>
              <div style={{ width: 82, flexShrink: 0, padding: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={CRL_BADGE} alt="CRL 0075" style={{ height: 62, width: 'auto', display: 'block' }} />
              </div>
            </div>
            {/* Parte cinza: texto acred + Relatório de Ensaio / Nº */}
            <div style={{ background: GRAY2, borderTop: '1px solid #bbb', padding: '5px 14px 8px' }}>
              <p style={{ textAlign: 'center', fontSize: '6.5pt', fontStyle: 'italic', color: '#444', margin: '0 0 5px' }}>
                Laboratório de Ensaio acreditado pela Cgcre de acordo com a ABNT NBR ISO/IEC 17025 sob o número CRL 0075
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13pt', fontWeight: 700, color: '#000' }}>Relatório de Ensaio</span>
                <span style={{ fontSize: '13pt', fontWeight: 700, color: '#000' }}>N° {cfg.numRelatorio || '—'}</span>
              </div>
            </div>
          </div>

          {/* Período e emissão centralizados abaixo do cabeçalho */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: FS.base, fontWeight: 700, marginBottom: 2 }}>
              Período de realização dos ensaios: {fmtDate(cfg.periodoInicio)} até {fmtDate(cfg.periodoFim)}
            </p>
            <p style={{ fontSize: FS.base, fontWeight: 700 }}>
              Data de emissão do relatório: {fmtDate(cfg.dataEmissao)}
            </p>
          </div>

          <SecHeader>Parte 1 - Identificação e condições gerais</SecHeader>

          <p style={pTitle}>1. Cliente:</p>
          <p style={pJ}>{cfg.cliente || '—'}</p>
          {cfg.clienteRua    && <p style={pJ}>{cfg.clienteRua}</p>}
          {cfg.clienteCidade && <p style={pJ}>{cfg.clienteCidade}</p>}
          {cfg.clienteCep    && <p style={pJ}>CEP: {cfg.clienteCep}</p>}

          <p style={pTitle}>2. Objeto ensaiado (amostra):</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6, fontSize: FS.base }}>
            <tbody>
              {[
                [cfg.produto || '—',                           'Tensão de alimentação:', cfg.tensaoAlim  || '—'],
                ['Fabricante: ' + (cfg.fabricante || '—'),     'Potência nominal:',      cfg.potencia    || '—'],
                ['Modelo: '     + (cfg.modelo     || '—'),     'Frequência de rede:',    cfg.frequencia  || '—'],
                [labelId + ': ' + (cfg.identificador || '—'),  'Orçamento LABELO:',      cfg.orcamento   || '—'],
                ['Protocolo LABELO: ' + (cfg.protocolo || '—'), '', ''],
              ].map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f5f8ff' }}>
                  <td style={{ border: '1px solid #ccc', padding: '4px 8px', width: '50%' }}>{row[0]}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: 700, width: '22%', color: BLUE, fontSize: FS.xs }}>{row[1]}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 8px', width: '28%' }}>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={pTitle}>3. Documento(s) normativo(s) utilizado(s):</p>
          <p style={pJ}>
            • Associação Brasileira de Normas Técnicas. NBR IEC/CISPR 15/2014 - Limites e métodos de medição das
            radioperturbações características dos equipamentos elétricos de iluminação e similares. Rio de Janeiro, RJ, Brasil, 2014.
          </p>
          <p style={{ ...pJ, marginTop: 6 }}>3.1 Documentos complementares (fora do escopo de acreditação):</p>
          <p style={{ ...pJ, marginLeft: 14 }}>
            • IEC. CISPR 16-4-2 - Second Edition/2011, Specification for radio disturbance and immunity measuring apparatus and
            methods – Part 4-2: Uncertainties, statistics and limit modeling – Uncertainty in EMC measurements. Geneva, Switzerland.
          </p>

          <p style={pTitle}>4. Condições ambientais:</p>
          <p style={pJ}>Temperatura: 20 °C ± 5 °C</p>
          <p style={pJ}>Umidade Relativa: 55 % ± 15 %</p>

          <p style={pTitle}>5. Observações:</p>
          <p style={pJ}>
            A regra de decisão aplicada para a avaliação da conformidade do item de ensaio foi estabelecida conforme documentos
            normativos indicados no item 3 deste relatório e previamente contratados.
          </p>
          <p style={pJ}>
            Itens dos documentos normativos de referência deste relatório não descritos com resultados não foram solicitados pelo
            requerente ou não fazem parte do escopo de acreditação do laboratório.
          </p>
          {cfg.tipo === 'luminaria' && (
            <p style={pJ}>
              De acordo com o item 6.1.1.4.1.5 da Portaria INMETRO citada no item 3 da parte 1, o ensaio de interferência
              eletromagnética e rádio frequência foi conduzido nas tensões nominais de {tensoes.join(' e ')}.
            </p>
          )}
        </Page>

        {/* ══ PÁGINA 2 — LIMITES CISPR 15 ══ */}
        <Page>
          <PageHeader cfg={cfg} />
          <SecHeader>Parte 2 – Resultados dos ensaios</SecHeader>

          <p style={pTitle}>
            1. Método de medição das tensões de perturbação conduzidas (Item 8 da Norma NBR IEC/CISPR 15/2014)
          </p>
          <p style={pJ}>A tensão de perturbação foi medida nos terminais de alimentação do sistema de iluminação.</p>
          <p style={pJ}>
            Os terminais de saída da LISN e os terminais do equipamento em ensaio foram interligados por um cabo flexível com
            3 condutores para conexão dos terminais de fase, neutro e terra. A distância foi ajustada para 0,8 m.
          </p>
          <p style={pJ}>As medições foram realizadas tanto no condutor fase como no condutor neutro, um de cada vez.</p>

          <p style={pTitle}>1.1 Limites (Item 4 da Norma NBR IEC/CISPR 15/2014)</p>
          <p style={{ ...pSub, marginTop: 8 }}>1.1.1. Terminais de alimentação (Item 4.3.1):</p>
          <LimitTable {...limCond1} />
          <p style={{ ...pSub, marginTop: 14 }}>1.1.2. Terminais de carga (Item 4.3.2):</p>
          <LimitTable {...limCond2} />
          <p style={{ ...pSub, marginTop: 14 }}>1.1.3. Terminais de controle (Item 4.3.3):</p>
          <LimitTable {...limCond3} />

          <p style={pTitle}>
            2. Método de medição das perturbações eletromagnéticas radiadas na faixa de 9 kHz a 30 MHz (Item 9)
          </p>
          <p style={pJ}>
            O equipamento em ensaio foi posicionado sobre uma mesa não condutora no centro da antena loop de 2,0 m.
            O receptor de medição foi conectado à antena loop por cabo coaxial blindado e a seleção de cada loop
            das 3 direções do campo foi efetuada através de uma chave coaxial. Medições de quase-pico foram realizadas
            apenas nas frequências em que as emissões de pico estavam próximas ou ultrapassaram a margem de 6 dB abaixo
            da linha de limite de quase-pico.
          </p>
          <p style={{ ...pSub, marginTop: 14 }}>2.1.1. Faixa de 9 kHz a 30 MHz (Item 4.4.1):</p>
          <LimitTable {...limRad1} />

          <p style={pTitle}>
            3. Método de medição das perturbações eletromagnéticas radiadas na faixa de 30 MHz a 300 MHz (Item 9)
          </p>
          <p style={pJ}>
            O equipamento em ensaio foi colocado sobre blocos não condutivos (10 cm), sobre placa de metal ligada à terra.
            O equipamento foi ligado a uma rede de acoplamento/desacoplamento (CDN), montado sobre placa de metal conectada ao terra.
          </p>
          <p style={{ ...pSub, marginTop: 14 }}>3.1. Faixa de 30 MHz a 300 MHz (Item 4.4.2):</p>
          <LimitTable {...limRad2} />
        </Page>

        {/* ══ PÁGINAS — RESULTADOS RADIMATION ══ */}
        {(!docx.html || docx.loading) && (
          <Page flow>
            <PageHeader cfg={cfg} />
            <SecHeader>Parte 2 – Resultados dos Ensaios</SecHeader>
            {!docx.html && !docx.loading && (
              <label className="upload-zone no-print flex flex-col items-center gap-2 p-6 mb-4 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 hover:border-yellow-300 cursor-pointer transition-all">
                <Upload size={18} className="text-gray-400" />
                <p className="text-gray-500 text-xs text-center">Carregar arquivo <b className="text-gray-700">.docx</b> do Radimation</p>
                <input type="file" accept=".docx" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleDocx(f) }} />
              </label>
            )}
            {docx.loading && (
              <div className="upload-zone no-print flex items-center gap-2 p-4 mb-4 rounded-lg border border-dashed border-blue-200 bg-blue-50">
                <Loader2 size={14} className="animate-spin text-blue-500" />
                <span className="text-blue-600 text-xs">Processando arquivo…</span>
              </div>
            )}
          </Page>
        )}
        {docx.html && docxPages.map((pageHtml, i) => (
          <Page key={`docx-${i}`} flow>
            <PageHeader cfg={cfg} />
            {i === 0 && (
              <>
                <div className="upload-zone no-print flex items-center justify-between px-3 py-2 mb-2 rounded-lg border border-green-200 bg-green-50">
                  <span className="text-green-700 text-[10px] font-mono truncate">{docx.filename}</span>
                  <button
                    onClick={() => { setDocx({ loading: false, html: null, filename: null }); localStorage.removeItem(DOCX_HTML_KEY); localStorage.removeItem(DOCX_NAME_KEY) }}
                    className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0">
                    <X size={12} />
                  </button>
                </div>
                <SecHeader>Parte 2 – Resultados dos Ensaios</SecHeader>
              </>
            )}
            <div className="doc-content" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt' }}
              dangerouslySetInnerHTML={{ __html: pageHtml }} />
          </Page>
        ))}

        {/* ══ PÁGINA — INCERTEZAS ══ */}
        <Page>
          <PageHeader cfg={cfg} />
          <SecHeader>Incertezas de Medição (IM)</SecHeader>
          <p style={pJ}>
            A incerteza expandida de medição relatada é declarada como a incerteza padrão de medição multiplicada pelo
            fator de abrangência "k", para uma distribuição de probabilidade tipo t-Student, com graus de liberdade efetivos
            correspondentes a um nível de confiança de aproximadamente 95%.
          </p>
          <LimitTable
            cols={['Item da norma', 'Mensurando', 'Faixa ou ponto de medição', 'Incerteza de medição', 'Fator de abrangência (k)']}
            rows={[
              ['4.3.1', 'Distúrbios conduzidos',  '9 kHz – 150 kHz',      '4,5 dB', '2,00'],
              ['4.3.1', 'Distúrbios conduzidos',  '150 kHz – 30,0 MHz',   '4,4 dB', '2,00'],
              ['4.4.1', 'Distúrbios radiados',    '9 kHz – 30,0 MHz',     '4,8 dB', '2,00'],
              ['4.4.2', 'Distúrbios radiados',    '30,0 MHz – 300,0 MHz', '3,7 dB', '2,00'],
            ]}
          />
        </Page>

        {/* ══ PÁGINAS DE FOTOS — mínimo 2 páginas (4 slots) ══ */}
        {photoPages.map((pair, pi) => {
          // Altura disponível para as 2 fotos (mm): página A4 − margens − header − secHeader(só pg0)
          const slotHeightMm = pi === 0 ? 103 : 116
          return (
            <Page key={`foto-${pi}`}>
              <PageHeader cfg={cfg} />
              {pi === 0 && <SecHeader>Fotos da Amostra</SecHeader>}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[0, 1].map(slot => {
                  const ph = pair[slot] ?? null
                  const figNum = pi * 2 + slot + 1
                  return (
                    <div key={slot} style={{
                      height: `${slotHeightMm}mm`,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottom: slot === 0 ? '1px dashed #ddd' : 'none',
                      padding: '3mm 8mm',
                      boxSizing: 'border-box',
                      position: 'relative',
                    }}>
                      {ph ? (
                        <>
                          <div className="no-print" style={{ position: 'absolute', top: 4, right: 4 }}>
                            <button
                              onClick={() => setPhotos(prev => prev.filter((_, j) => j !== pi * 2 + slot))}
                              style={{ fontSize: 10, color: '#bbb', background: 'none', border: 'none', cursor: 'pointer' }}>
                              ✕ remover
                            </button>
                          </div>
                          <img
                            src={ph.url} alt={`Figura ${figNum}`}
                            style={{
                              maxWidth: `${photoWidth}mm`,
                              maxHeight: `${slotHeightMm - 14}mm`,
                              width: 'auto',
                              height: 'auto',
                              objectFit: 'contain',
                              border: '1px solid #ccc',
                              display: 'block',
                            }}
                          />
                          <p style={{ fontSize: FS.xs, color: '#555', marginTop: 5, textAlign: 'center', flexShrink: 0 }}>
                            Figura {figNum} – Amostra ensaiada
                          </p>
                        </>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </Page>
          )
        })}

        {/* ══ ÚLTIMA PÁGINA — OBSERVAÇÕES FINAIS ══ */}
        <Page>
          <PageHeader cfg={cfg} />
          <SecHeader>Observações Finais</SecHeader>
          {[
            'Este relatório de ensaio atende aos requisitos de acreditação da Cgcre, que avaliou a competência do laboratório.',
            'O fornecimento da amostra pelo cliente isenta o LABELO-PUCRS de responsabilidade quanto à sua representatividade em relação a lotes de fabricação e comercialização.',
            'O presente relatório de ensaio é medido exclusivamente para a amostra ensaiada, nas condições em que foram realizados os ensaios e não sendo extensivo a quaisquer lotes, mesmo que similares.',
            'A partir do momento em que a amostra é retirada do laboratório, esgota-se a possibilidade de contestação dos resultados ou mesmo de repetição dos ensaios, já que o LABELO deixa de ser responsável pela sua manutenção.',
            'É vedada a reprodução do presente relatório de ensaio, no todo ou em parte, sem prévia autorização do LABELO-PUCRS originada por solicitação formal do contratante.',
            'A Cgcre é signatária do Acordo de Reconhecimento Mútuo da ILAC (International Laboratory Accreditation Cooperation).',
            'A Cgcre é signatária do Acordo de Reconhecimento Mútuo da IAAC (InterAmerican Accreditation Cooperation).',
            'Os ensaios foram realizados nas instalações do LABELO-PUCRS.',
          ].map((obs, i) => (
            <p key={i} style={{ ...pJ, marginLeft: 10 }}>• {obs}</p>
          ))}

          <div style={{ marginTop: 50, display: 'flex', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', minWidth: 260 }}>
              <div style={{ borderTop: '1px solid #333', paddingTop: 8 }}>
                <p style={{ fontSize: FS.sm, color: '#333' }}>Signatário Autorizado</p>
                <p style={{ fontSize: FS.xs, color: '#666' }}>LABELO-PUCRS</p>
              </div>
            </div>
          </div>
        </Page>

      </div>
    </>
  )
}
