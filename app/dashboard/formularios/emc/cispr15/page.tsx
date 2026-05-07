'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Lightbulb, Lamp, ArrowRight, Upload, X, Loader2,
  Trash2, FileJson, CheckCircle2, FileText, FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type Cispr15Config, getTensoes, DEFAULTS,
  CFG_KEY, PHOTOS_KEY, DOCX_HTML_KEY, DOCX_NAME_KEY,
} from './types'

/* ─── helpers ─────────────────────────────────────────────────────────────── */
async function resizeToBase64(file: File, maxW = 1024): Promise<{ base64: string; url: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const obj = URL.createObjectURL(file)
    img.onload = () => {
      const r = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * r)
      canvas.height = Math.round(img.height * r)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const base64 = canvas.toDataURL('image/jpeg', 0.82).split(',')[1]
      URL.revokeObjectURL(obj)
      resolve({ base64, url: `data:image/jpeg;base64,${base64}` })
    }
    img.onerror = reject
    img.src = obj
  })
}

function importJson(onData: (data: Record<string, string>) => void) {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = '.json'
  input.onchange = () => {
    const f = input.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = ev => {
      try { onData(JSON.parse(ev.target?.result as string)) }
      catch { alert('JSON inválido') }
    }
    r.readAsText(f)
  }
  input.click()
}

/* ─── subcomponentes ──────────────────────────────────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] text-white/35 uppercase tracking-widest font-mono">{children}</label>
}

function Row({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-1.5', span2 && 'col-span-2')}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

interface VoltData { loading: boolean; html: string | null; filename: string | null }
interface Photo    { url: string; name: string; base64: string }

/* ─── página ──────────────────────────────────────────────────────────────── */
export default function Cispr15ConfigPage() {
  const router = useRouter()
  const [cfg,    setCfg]    = useState<Cispr15Config>(DEFAULTS)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [docx,   setDocx]   = useState<VoltData>({ loading: false, html: null, filename: null })
  const [flash,        setFlash]       = useState<string | null>(null)
  const [pastaLoading, setPastaLoading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const pastaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (photoRef.current) photoRef.current.setAttribute('webkitdirectory', '')
  }, [])

  /* ── carregar localStorage ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CFG_KEY)
      if (raw) setCfg(JSON.parse(raw))
    } catch {}
    try {
      const rawP = localStorage.getItem(PHOTOS_KEY)
      if (rawP) {
        const arr: { name: string; base64: string }[] = JSON.parse(rawP)
        setPhotos(arr.map(p => ({ ...p, url: `data:image/jpeg;base64,${p.base64}` })))
      }
    } catch {}
    const dHtml = localStorage.getItem(DOCX_HTML_KEY)
    const dName = localStorage.getItem(DOCX_NAME_KEY)
    if (dHtml) setDocx({ loading: false, html: dHtml, filename: dName })
  }, [])


  /* ── auto-save cfg ── */
  useEffect(() => {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
  }, [cfg])

  /* ── handlers ── */
  const set = (k: keyof Cispr15Config) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setCfg(prev => ({ ...prev, [k]: e.target.value }))

  const setCheck = (k: keyof Cispr15Config) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setCfg(prev => ({ ...prev, [k]: e.target.checked }))

  function setTipo(t: 'lampada' | 'luminaria') {
    setCfg(prev => ({ ...prev, tipo: t, apenasUma220: false }))
  }

  function limparDados() {
    if (!confirm('Limpar TODOS os dados do formulário e anexos?')) return
    ;[CFG_KEY, PHOTOS_KEY, DOCX_HTML_KEY, DOCX_NAME_KEY].forEach(k => localStorage.removeItem(k))
    setCfg(DEFAULTS)
    setPhotos([])
    setDocx({ loading: false, html: null, filename: null })
    setFlash(null)
  }

  async function handlePhotosFromFiles(files: File[]) {
    const next: Photo[] = []
    for (const f of files) {
      try { next.push({ ...(await resizeToBase64(f)), name: f.name }) } catch {}
    }
    setPhotos(next)
    try { localStorage.setItem(PHOTOS_KEY, JSON.stringify(next.map(({ name, base64 }) => ({ name, base64 })))) }
    catch { alert('Armazenamento cheio — reduza o número de fotos.') }
  }

  async function handlePhotos(files: FileList) {
    const getNum = (name: string) => parseInt(name.replace(/\.[^/.]+$/, '').replace(/\D/g, ''), 10) || 0
    const sorted = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .sort((a, b) => getNum(a.name) - getNum(b.name))
    await handlePhotosFromFiles(sorted)
  }

  /* ── Carrega pasta completa: encontra .docx + fotos (qualquer profundidade) ── */
  async function handlePastaCompleta(files: FileList) {
    setPastaLoading(true)
    try {
      const all = Array.from(files)
      const getNum = (name: string) => parseInt(name.replace(/\.[^/.]+$/, '').replace(/\D/g, ''), 10) || 0

      // Primeiro .docx encontrado na pasta (independente da profundidade)
      const docxFile = all.find(f => f.name.toLowerCase().endsWith('.docx'))

      // Todas as imagens da pasta, ordenadas numericamente
      const imageFiles = all
        .filter(f => f.type.startsWith('image/'))
        .sort((a, b) => getNum(a.name) - getNum(b.name))

      if (!docxFile && imageFiles.length === 0) {
        alert('Pasta inválida — certifique-se de que contém um .docx e uma subpasta de fotos.')
        return
      }

      // Processa em paralelo — fotos não dependem do DOCX
      await Promise.all([
        docxFile              ? handleDocx(docxFile)            : Promise.resolve(),
        imageFiles.length > 0 ? handlePhotosFromFiles(imageFiles) : Promise.resolve(),
      ])
    } finally {
      setPastaLoading(false)
    }
  }

  function removePhoto(i: number) {
    const updated = photos.filter((_, j) => j !== i)
    setPhotos(updated)
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(updated.map(({ name, base64 }) => ({ name, base64 }))))
  }

  async function handleDocx(file: File) {
    setDocx({ loading: true, html: null, filename: null })
    try {
      const fd = new FormData(); fd.append('file', file)
      const res  = await fetch('/api/formularios/cispr15/parse-docx', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDocx({ loading: false, html: data.html, filename: file.name })
      // HTML pode ter base64 grande — ignora silenciosamente se exceder quota
      try { localStorage.setItem(DOCX_HTML_KEY, data.html) } catch {}
      try { localStorage.setItem(DOCX_NAME_KEY, file.name) } catch {}
    } catch (err: any) {
      alert(`Erro ao processar o arquivo: ${err.message}`)
      setDocx({ loading: false, html: null, filename: null })
    }
  }

  function removeDocx() {
    setDocx({ loading: false, html: null, filename: null })
    localStorage.removeItem(DOCX_HTML_KEY)
    localStorage.removeItem(DOCX_NAME_KEY)
  }

  function handleImportCliente() {
    importJson(data => setCfg(prev => ({
      ...prev,
      cliente:       data.cliente       ?? prev.cliente,
      clienteRua:    data.clienteRua    ?? prev.clienteRua,
      clienteCidade: data.clienteCidade ?? prev.clienteCidade,
      clienteCep:    data.clienteCep    ?? prev.clienteCep,
    })))
  }

  function handleImportAmostra() {
    importJson(data => setCfg(prev => ({
      ...prev,
      produto:       data.produto       ?? prev.produto,
      fabricante:    data.fabricante    ?? prev.fabricante,
      modelo:        data.modelo        ?? prev.modelo,
      identificador: data.identificador ?? prev.identificador,
      tensaoAlim:    data.tensaoAlim    ?? prev.tensaoAlim,
      potencia:      data.potencia      ?? prev.potencia,
      frequencia:    data.frequencia    ?? prev.frequencia,
    })))
  }

  function gerarRelatorio() {
    setFlash('Relatório gerado!')
    setTimeout(() => setFlash(null), 2500)
    router.push('/dashboard/formularios/emc/cispr15/relatorio')
  }

  function irParaPdf() {
    router.push('/dashboard/formularios/emc/cispr15/relatorio')
  }

  const tensoes  = getTensoes(cfg)
  const labelId  = cfg.tipo === 'lampada' ? 'Código de Barras' : 'Número de Série'
  const tensLabel = cfg.tipo === 'luminaria' ? '220 V (fixo)' : cfg.apenasUma220 ? '220 V' : '127 V + 220 V'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="form-section mb-1">Formulários de Ensaio · EMC</p>
        <h1 className="text-2xl font-display font-bold text-white">CISPR 15</h1>
        <p className="text-white/40 text-sm mt-1">
          Equipamentos de iluminação elétrica — Limites e métodos de medição de perturbações radiadas
        </p>
      </div>

      <div className="space-y-5">

        {/* ── Tipo de DUT ── */}
        <div className="card p-5">
          <p className="form-section mb-4">Tipo de DUT</p>
          <div className="grid grid-cols-2 gap-3">
            {(['lampada', 'luminaria'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={cn(
                  'flex flex-col items-center gap-3 p-5 rounded-xl border transition-all duration-150',
                  cfg.tipo === t
                    ? 'border-gold bg-gold/8 text-gold'
                    : 'border-white/8 bg-navy/60 text-white/40 hover:border-white/20 hover:text-white/60',
                )}
              >
                {t === 'lampada' ? <Lightbulb size={26} strokeWidth={1.5} /> : <Lamp size={26} strokeWidth={1.5} />}
                <div className="text-center">
                  <p className="font-bold text-sm tracking-wide uppercase font-mono">
                    {t === 'lampada' ? 'Lâmpada' : 'Luminária'}
                  </p>
                  <p className="text-[10px] opacity-50 mt-0.5">
                    {t === 'lampada' ? '127V + 220V · Cód. Barras' : '220V (fixo) · N° Série'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Checkbox apenas para lâmpada */}
          {cfg.tipo === 'lampada' && (
            <label className="flex items-center gap-2.5 mt-4 cursor-pointer group">
              <input
                type="checkbox"
                checked={cfg.apenasUma220}
                onChange={setCheck('apenasUma220')}
                className="w-4 h-4 rounded accent-gold cursor-pointer"
              />
              <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                Usar apenas <span className="text-gold font-semibold">220 V</span>
                <span className="text-white/30 text-xs ml-1.5">(padrão: 127 V + 220 V)</span>
              </span>
            </label>
          )}

          {/* Badge tensões */}
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-teal/6 border border-teal/15 text-sm">
            <span className="font-mono text-[10px] text-teal/60 uppercase tracking-wider">Tensões</span>
            <span className="text-teal font-bold">{tensLabel}</span>
            <span className="text-white/15">·</span>
            <span className="font-mono text-[10px] text-teal/60 uppercase tracking-wider">ID</span>
            <span className="text-teal font-bold">{labelId}</span>
          </div>
        </div>

        {/* ── Cliente ── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="form-section">Cliente</p>
            <button type="button" onClick={handleImportCliente}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-white/50 hover:text-gold border border-white/10 hover:border-gold/30 rounded-lg transition-all">
              <FileJson size={11} /> Importar dados do cliente
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Row label="Nome do Cliente" span2>
              <input className="input" value={cfg.cliente} onChange={set('cliente')}
                placeholder="Ex: CEB Iluminação Pública e Serviços S.A." />
            </Row>
            <Row label="Rua – Número – Bairro" span2>
              <input className="input" value={cfg.clienteRua} onChange={set('clienteRua')}
                placeholder="Ex: SGAN Quadra 601, Bloco H, Asa Norte" />
            </Row>
            <Row label="Cidade – Estado">
              <input className="input" value={cfg.clienteCidade} onChange={set('clienteCidade')}
                placeholder="Ex: Brasília - DF" />
            </Row>
            <Row label="CEP">
              <input className="input" value={cfg.clienteCep} onChange={set('clienteCep')}
                placeholder="Ex: 70.830-010" />
            </Row>
          </div>
        </div>

        {/* ── Objeto Ensaiado ── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="form-section">Objeto Ensaiado</p>
            <button type="button" onClick={handleImportAmostra}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-white/50 hover:text-gold border border-white/10 hover:border-gold/30 rounded-lg transition-all">
              <FileJson size={11} /> Importar dados da amostra
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Row label="Produto / Descrição" span2>
              <input className="input" value={cfg.produto} onChange={set('produto')}
                placeholder="Ex: Luminária LED" />
            </Row>
            <Row label="Fabricante">
              <input className="input" value={cfg.fabricante} onChange={set('fabricante')}
                placeholder="Ex: Tradetek" />
            </Row>
            <Row label="Modelo">
              <input className="input" value={cfg.modelo} onChange={set('modelo')}
                placeholder="Ex: AGN7120D4" />
            </Row>
            <Row label={labelId}>
              <input className="input" value={cfg.identificador} onChange={set('identificador')}
                placeholder={cfg.tipo === 'lampada' ? 'Código de barras' : 'N° de série'} />
            </Row>
            <Row label="Potência Nominal">
              <input className="input" value={cfg.potencia} onChange={set('potencia')}
                placeholder="Ex: 120W" />
            </Row>
            <Row label="Tensão de Alimentação">
              <input className="input" value={cfg.tensaoAlim} onChange={set('tensaoAlim')}
                placeholder="Ex: 90 a 305VAC" />
            </Row>
            <Row label="Frequência de Rede">
              <input className="input" value={cfg.frequencia} onChange={set('frequencia')}
                placeholder="Ex: 50/60Hz" />
            </Row>
          </div>
        </div>

        {/* ── Dados do Relatório ── */}
        <div className="card p-5">
          <p className="form-section mb-4">Dados do Relatório</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Row label="N° do Relatório">
              <input className="input" value={cfg.numRelatorio} onChange={set('numRelatorio')}
                placeholder="Ex: EMC 1122/2026" />
            </Row>
            <Row label="Orçamento LABELO">
              <input className="input" value={cfg.orcamento} onChange={set('orcamento')}
                placeholder="Ex: 887f" />
            </Row>
            <Row label="Protocolo LABELO">
              <input className="input" value={cfg.protocolo} onChange={set('protocolo')}
                placeholder="Ex: 26041895" />
            </Row>
            <div />
            <Row label="Período — Início">
              <input className="input" type="date" value={cfg.periodoInicio} onChange={set('periodoInicio')} />
            </Row>
            <Row label="Período — Fim">
              <input className="input" type="date" value={cfg.periodoFim} onChange={set('periodoFim')} />
            </Row>
            <Row label="Data de Emissão" span2>
              <input className="input" type="date" value={cfg.dataEmissao} onChange={set('dataEmissao')} />
            </Row>
          </div>
        </div>

        {/* ── Anexos ── */}
        <div className="card p-5">
          <p className="form-section mb-4">Anexos</p>

          {/* ── Botão principal: pasta completa ── */}
          <label className={cn(
            'flex items-center justify-center gap-2.5 w-full px-4 py-4 rounded-xl border-2 border-dashed text-sm font-semibold cursor-pointer transition-all mb-4',
            pastaLoading
              ? 'border-blue-400/40 bg-blue-500/8 text-blue-400 cursor-wait'
              : (docx.html || photos.length > 0)
              ? 'border-green/30 bg-green/6 text-green-400 hover:border-green/50'
              : 'border-gold/30 bg-gold/4 text-gold hover:border-gold/60 hover:bg-gold/8',
          )}>
            {pastaLoading
              ? <><Loader2 size={16} className="animate-spin" /> Processando pasta…</>
              : <><FolderOpen size={16} /> Carregar Pasta do Ensaio</>}
            <input ref={pastaRef} type="file" className="hidden"
              disabled={pastaLoading}
              {...{ webkitdirectory: '' } as any}
              onChange={e => { if (e.target.files?.length) handlePastaCompleta(e.target.files) }} />
          </label>

          <p className="text-[10px] text-white/25 font-mono text-center mb-4 -mt-2">
            A pasta deve conter: <span className="text-white/40">1 arquivo .docx</span> na raiz +{' '}
            <span className="text-white/40">subpasta de fotos</span> (1.png, 2.png…)
          </p>

          {/* Status do que foi carregado */}
          {(docx.html || photos.length > 0) && (
            <div className="flex flex-col gap-2 mb-4">
              {docx.html && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green/8 border border-green/20">
                  <CheckCircle2 size={12} className="text-green-400 flex-shrink-0" />
                  <span className="text-green-400 text-[11px] font-mono truncate flex-1">{docx.filename}</span>
                  <button onClick={removeDocx} className="text-white/25 hover:text-red-400 transition-colors flex-shrink-0">
                    <X size={12} />
                  </button>
                </div>
              )}
              {photos.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green/8 border border-green/20">
                  <CheckCircle2 size={12} className="text-green-400 flex-shrink-0" />
                  <span className="text-green-400 text-[11px] font-mono flex-1">{photos.length} foto(s) carregada(s)</span>
                  <button onClick={() => { setPhotos([]); localStorage.removeItem(PHOTOS_KEY) }}
                    className="text-white/25 hover:text-red-400 transition-colors flex-shrink-0">
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Thumbnails das fotos */}
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {photos.map((ph, i) => (
                <div key={i} className="relative group">
                  <img src={ph.url} alt={`Foto ${i + 1}`}
                    className="w-16 h-12 object-cover rounded-lg border border-white/10" />
                  <button onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/90 text-white items-center justify-center hidden group-hover:flex transition-all">
                    <X size={10} />
                  </button>
                  <span className="text-[8px] text-white/30 block text-center mt-0.5">{i + 1}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Controles individuais (fallback) ── */}
          <div className="border-t border-white/5 pt-4 space-y-3">
            <p className="text-[9px] text-white/20 font-mono uppercase tracking-wider">Ou carregue separadamente</p>

            <div className="flex gap-2">
              {/* Fotos individuais */}
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-[11px] text-white/40 hover:text-gold hover:border-gold/30 cursor-pointer transition-all">
                <Upload size={11} /> Pasta de Fotos
                <input ref={photoRef} type="file" className="hidden"
                  onChange={e => { if (e.target.files?.length) handlePhotos(e.target.files) }} />
              </label>

              {/* DOCX individual */}
              {!docx.html && !docx.loading && (
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-[11px] text-white/40 hover:text-gold hover:border-gold/30 cursor-pointer transition-all">
                  <Upload size={11} /> Radimation .docx
                  <input type="file" accept=".docx" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleDocx(f) }} />
                </label>
              )}
              {docx.loading && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-blue-400">
                  <Loader2 size={11} className="animate-spin" /> Processando…
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Ações ── */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={limparDados}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red/20 bg-red/8 text-red-400 hover:bg-red/15 transition-all text-sm font-medium">
            <Trash2 size={14} />
            Limpar Dados
          </button>

          <div className="flex-1" />

          <button type="button" onClick={irParaPdf}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm">
            <FileText size={14} />
            Ir para o PDF
          </button>

          <button type="button" onClick={gerarRelatorio}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-bold">
            Gerar Relatório
            <ArrowRight size={15} />
          </button>
        </div>

        {flash && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green/10 border border-green/20 text-green-400 text-sm animate-fade-in">
            <CheckCircle2 size={15} />
            {flash}
          </div>
        )}
      </div>
    </div>
  )
}
