'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Lightbulb, Lamp, ArrowRight, Upload, X, Loader2,
  Trash2, FileJson, CheckCircle2, FileText,
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
  const [flash,  setFlash]  = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

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

  async function handlePhotos(files: FileList) {
    const next: Photo[] = []
    for (const f of Array.from(files)) {
      try { next.push({ ...(await resizeToBase64(f)), name: f.name }) } catch {}
    }
    const updated = [...photos, ...next]
    setPhotos(updated)
    try { localStorage.setItem(PHOTOS_KEY, JSON.stringify(updated.map(({ name, base64 }) => ({ name, base64 })))) }
    catch { alert('Armazenamento cheio — reduza o número de fotos.') }
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
      localStorage.setItem(DOCX_HTML_KEY, data.html)
      localStorage.setItem(DOCX_NAME_KEY, file.name)
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

          {/* Fotos */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/50 font-mono uppercase tracking-wider">Fotos da Amostra</span>
              <label className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium cursor-pointer transition-all',
                photos.length > 0
                  ? 'border-green/30 bg-green/8 text-green-400'
                  : 'border-white/15 bg-white/4 text-white/50 hover:border-gold/40 hover:text-gold',
              )}>
                <Upload size={11} />
                {photos.length > 0 ? `${photos.length} foto(s) carregada(s)` : 'Carregar Fotos'}
                <input ref={photoRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => { if (e.target.files?.length) handlePhotos(e.target.files) }} />
              </label>
            </div>

            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photos.map((ph, i) => (
                  <div key={i} className="relative group">
                    <img src={ph.url} alt={`Foto ${i + 1}`}
                      className="w-20 h-16 object-cover rounded-lg border border-white/10" />
                    <button onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/90 text-white items-center justify-center hidden group-hover:flex transition-all">
                      <X size={10} />
                    </button>
                    <span className="text-[8px] text-white/30 block text-center mt-0.5 truncate w-20">
                      Figura {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Radimation — único arquivo */}
          <div>
            <span className="text-xs text-white/50 font-mono uppercase tracking-wider block mb-3">
              Dados Radimation (.docx)
            </span>

            {docx.loading ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-blue-300/30 bg-blue-500/8 text-blue-400 text-sm">
                <Loader2 size={14} className="animate-spin" />
                Processando arquivo…
              </div>
            ) : docx.html ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-green/8 border border-green/20">
                <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                <span className="text-green-400 text-[11px] font-mono truncate flex-1">{docx.filename}</span>
                <button onClick={removeDocx} className="text-white/25 hover:text-red-400 transition-colors flex-shrink-0">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-white/15 bg-white/3 text-white/50 hover:border-gold/40 hover:text-gold text-sm font-medium cursor-pointer transition-all">
                <Upload size={14} />
                Carregar Radimation (.docx)
                <input type="file" accept=".docx" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleDocx(f) }} />
              </label>
            )}
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
