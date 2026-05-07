'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Lightbulb, Lamp, ArrowRight, Upload, X, Loader2,
  Trash2, FileJson, CheckCircle2, FileText, FolderOpen,
  ChevronDown, Users, Shield, ShieldCheck, ShieldX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type Cispr15Config, getTensoes, DEFAULTS, today,
  CFG_KEY, PHOTOS_KEY, DOCX_HTML_KEY, DOCX_NAME_KEY,
} from './types'

/* ─── Lote ────────────────────────────────────────────────────────────────── */
interface LoteAmostra {
  produto: string; fabricante: string; modelo: string; identificador: string
  tensaoAlim: string; potencia: string; frequencia: string
  protocolo: string; orcamento: string
  periodoInicio: string; periodoFim: string; dataEmissao: string
  conformidade: 'pendente' | 'conforme' | 'reprovado'
  numRelatorio: string
}

function newAmostra(): LoteAmostra {
  return {
    produto: '', fabricante: '', modelo: '', identificador: '',
    tensaoAlim: '', potencia: '', frequencia: '50/60Hz',
    protocolo: '', orcamento: '',
    periodoInicio: today(), periodoFim: today(), dataEmissao: today(),
    conformidade: 'pendente', numRelatorio: '',
  }
}

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

/* ─── sub-componentes ─────────────────────────────────────────────────────── */
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

/* ─── AmostraCard (lote) ──────────────────────────────────────────────────── */
function AmostraCard({ index, amostra, expanded, onToggle, onChange }: {
  index: number; amostra: LoteAmostra; expanded: boolean
  onToggle: () => void; onChange: (a: LoteAmostra) => void
}) {
  const set = (k: keyof LoteAmostra) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...amostra, [k]: e.target.value })

  const borderCls =
    amostra.conformidade === 'reprovado' ? 'border-red/25 bg-red/3' :
    amostra.conformidade === 'conforme'  ? 'border-green/20 bg-green/3' :
    'border-white/8'

  const badge: Record<LoteAmostra['conformidade'], string> = {
    pendente:  'text-white/30 border-white/10',
    conforme:  'text-green-400 border-green/25 bg-green/8',
    reprovado: 'text-red-400 border-red/25 bg-red/8',
  }

  return (
    <div className={cn('rounded-xl border transition-all', borderCls)}>
      <button type="button" onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="font-mono text-[10px] text-white/30 w-12 shrink-0">#{index + 1}</span>
        <span className="text-sm text-white/70 flex-1 truncate">
          {amostra.produto || <span className="text-white/20 italic">sem produto</span>}
        </span>
        {amostra.numRelatorio && (
          <span className="text-[10px] font-mono text-gold shrink-0">{amostra.numRelatorio}</span>
        )}
        <span className={cn(
          'px-2 py-0.5 rounded-md text-[9px] font-mono border uppercase tracking-wider shrink-0',
          badge[amostra.conformidade]
        )}>
          {amostra.conformidade}
        </span>
        <ChevronDown size={12} className={cn('text-white/20 transition-transform shrink-0', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Row label="Produto / Descrição" span2>
              <input className="input text-sm" value={amostra.produto} onChange={set('produto')} placeholder="Ex: Luminária LED" />
            </Row>
            <Row label="Fabricante">
              <input className="input text-sm" value={amostra.fabricante} onChange={set('fabricante')} />
            </Row>
            <Row label="Modelo">
              <input className="input text-sm" value={amostra.modelo} onChange={set('modelo')} />
            </Row>
            <Row label="Identificador">
              <input className="input text-sm" value={amostra.identificador} onChange={set('identificador')} />
            </Row>
            <Row label="Potência">
              <input className="input text-sm" value={amostra.potencia} onChange={set('potencia')} placeholder="Ex: 60W" />
            </Row>
            <Row label="Tensão de Alimentação">
              <input className="input text-sm" value={amostra.tensaoAlim} onChange={set('tensaoAlim')} />
            </Row>
            <Row label="Protocolo LABELO">
              <input className="input text-sm" value={amostra.protocolo} onChange={set('protocolo')} />
            </Row>
            <Row label="Orçamento LABELO">
              <input className="input text-sm" value={amostra.orcamento} onChange={set('orcamento')} />
            </Row>
            <Row label="Período — Início">
              <input className="input text-sm" type="date" value={amostra.periodoInicio} onChange={set('periodoInicio')} />
            </Row>
            <Row label="Período — Fim">
              <input className="input text-sm" type="date" value={amostra.periodoFim} onChange={set('periodoFim')} />
            </Row>
          </div>

          <div>
            <Label>Conformidade</Label>
            <div className="flex gap-2 mt-2">
              {(['pendente', 'conforme', 'reprovado'] as const).map(s => (
                <button key={s} type="button"
                  onClick={() => onChange({ ...amostra, conformidade: s })}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border capitalize transition-all',
                    amostra.conformidade === s
                      ? badge[s]
                      : 'text-white/20 border-white/5 hover:border-white/15 hover:text-white/40'
                  )}>
                  {s === 'conforme'  && <ShieldCheck size={11} />}
                  {s === 'reprovado' && <ShieldX size={11} />}
                  {s === 'pendente'  && <Shield size={11} />}
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
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
  const [gerandoRel,   setGerandoRel]  = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const pastaRef = useRef<HTMLInputElement>(null)

  // ── Lote ──
  const [loteOpen,      setLoteOpen]      = useState(false)
  const [loteQtd,       setLoteQtd]       = useState(3)
  const [loteTipo,      setLoteTipo]      = useState<'lampada' | 'luminaria'>('lampada')
  const [loteAmostras,  setLoteAmostras]  = useState<LoteAmostra[]>([])
  const [loteExpanded,  setLoteExpanded]  = useState<number | null>(null)
  const [loteEmitindo,  setLoteEmitindo]  = useState(false)
  const [loteResultado, setLoteResultado] = useState<{ reprovados: number[]; checked: boolean } | null>(null)

  useEffect(() => {
    if (photoRef.current) photoRef.current.setAttribute('webkitdirectory', '')
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CFG_KEY)
      if (raw) setCfg({ ...DEFAULTS, ...JSON.parse(raw) })
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

  useEffect(() => {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
  }, [cfg])

  function flash4(msg: string) {
    setFlash(msg)
    setTimeout(() => setFlash(null), 4000)
  }

  /* ── handlers cfg ── */
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

  /* ── fotos ── */
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
    const getNum = (n: string) => parseInt(n.replace(/\.[^/.]+$/, '').replace(/\D/g, ''), 10) || 0
    const sorted = Array.from(files).filter(f => f.type.startsWith('image/')).sort((a, b) => getNum(a.name) - getNum(b.name))
    await handlePhotosFromFiles(sorted)
  }

  async function handlePastaCompleta(files: FileList) {
    setPastaLoading(true)
    try {
      const all = Array.from(files)
      const getNum = (n: string) => parseInt(n.replace(/\.[^/.]+$/, '').replace(/\D/g, ''), 10) || 0
      const docxFile   = all.find(f => f.name.toLowerCase().endsWith('.docx'))
      const imageFiles = all.filter(f => f.type.startsWith('image/')).sort((a, b) => getNum(a.name) - getNum(b.name))
      if (!docxFile && imageFiles.length === 0) {
        alert('Pasta inválida — certifique-se de que contém um .docx e uma subpasta de fotos.')
        return
      }
      await Promise.all([
        docxFile              ? handleDocx(docxFile)              : Promise.resolve(),
        imageFiles.length > 0 ? handlePhotosFromFiles(imageFiles) : Promise.resolve(),
      ])
    } finally { setPastaLoading(false) }
  }

  function removePhoto(i: number) {
    const updated = photos.filter((_, j) => j !== i)
    setPhotos(updated)
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(updated.map(({ name, base64 }) => ({ name, base64 }))))
  }

  /* ── docx ── */
  async function handleDocx(file: File) {
    setDocx({ loading: true, html: null, filename: null })
    try {
      const fd = new FormData(); fd.append('file', file)
      const res  = await fetch('/api/formularios/cispr15/parse-docx', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDocx({ loading: false, html: data.html, filename: file.name })
      try { localStorage.setItem(DOCX_HTML_KEY, data.html) } catch {}
      try { localStorage.setItem(DOCX_NAME_KEY, file.name)  } catch {}
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

  /* ── importar JSON ── */
  function handleImportCliente() {
    importJson(data => setCfg(prev => ({
      ...prev,
      cliente: data.cliente ?? prev.cliente, clienteRua: data.clienteRua ?? prev.clienteRua,
      clienteCidade: data.clienteCidade ?? prev.clienteCidade, clienteCep: data.clienteCep ?? prev.clienteCep,
    })))
  }

  function handleImportAmostra() {
    importJson(data => setCfg(prev => ({
      ...prev,
      produto: data.produto ?? prev.produto, fabricante: data.fabricante ?? prev.fabricante,
      modelo: data.modelo ?? prev.modelo, identificador: data.identificador ?? prev.identificador,
      tensaoAlim: data.tensaoAlim ?? prev.tensaoAlim, potencia: data.potencia ?? prev.potencia,
      frequencia: data.frequencia ?? prev.frequencia,
    })))
  }

  /* ── gerar relatório (registra no Excel + navega) ── */
  async function gerarRelatorio() {
    setGerandoRel(true)
    try {
      if (!cfg.numRelatorio) {
        const res = await fetch('/api/formularios/cispr15/registrar-excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente: cfg.cliente, produto: cfg.produto,
            protocolo: cfg.protocolo, orcamento: cfg.orcamento,
            responsavel: cfg.responsavel,
          }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        const updated = { ...cfg, numRelatorio: data.numRelatorio }
        setCfg(updated)
        localStorage.setItem(CFG_KEY, JSON.stringify(updated))
        flash4(`Registrado: ${data.numRelatorio}`)
      }
      router.push('/dashboard/formularios/emc/cispr15/relatorio')
    } catch (err: any) {
      alert(`Erro ao registrar no Excel: ${err.message}`)
    } finally {
      setGerandoRel(false)
    }
  }

  /* ── lote ── */
  function openLote() {
    setLoteTipo(cfg.tipo)
    setLoteAmostras(Array.from({ length: loteQtd }, newAmostra))
    setLoteExpanded(null)
    setLoteResultado(null)
    setLoteOpen(true)
  }

  function handleLoteQtd(n: number) {
    const qtd = Math.max(1, Math.min(20, n))
    setLoteQtd(qtd)
    setLoteAmostras(prev =>
      qtd > prev.length
        ? [...prev, ...Array.from({ length: qtd - prev.length }, newAmostra)]
        : prev.slice(0, qtd)
    )
  }

  function verificarConformidade() {
    const reprovados = loteAmostras
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => a.conformidade === 'reprovado')
      .map(({ i }) => i)
    setLoteResultado({ reprovados, checked: true })
  }

  function removerReprovados() {
    if (!loteResultado) return
    const { reprovados } = loteResultado
    const novas = loteAmostras.filter((_, i) => !reprovados.includes(i))
    setLoteAmostras(novas)
    setLoteQtd(novas.length || 1)
    setLoteResultado(null)
  }

  async function emitirLote() {
    const paraEmitir = loteAmostras.map((a, i) => ({ a, i })).filter(({ a }) => a.conformidade !== 'reprovado')
    if (paraEmitir.length === 0) { alert('Nenhuma amostra para emitir.'); return }
    setLoteEmitindo(true)
    const numeros: string[] = []
    try {
      for (const { a: am, i } of paraEmitir) {
        const res = await fetch('/api/formularios/cispr15/registrar-excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente: cfg.cliente, produto: am.produto,
            protocolo: am.protocolo, orcamento: am.orcamento,
            responsavel: cfg.responsavel,
          }),
        })
        const data = await res.json()
        if (data.error) throw new Error(`Amostra ${i + 1}: ${data.error}`)
        setLoteAmostras(prev => prev.map((a, j) => j === i ? { ...a, numRelatorio: data.numRelatorio } : a))
        numeros.push(data.numRelatorio)
      }
      flash4(`Lote emitido: ${numeros.join(', ')}`)
    } catch (err: any) {
      alert(`Erro ao emitir lote: ${err.message}`)
    } finally {
      setLoteEmitindo(false)
    }
  }

  const tensoes   = getTensoes(cfg)
  const labelId   = cfg.tipo === 'lampada' ? 'Código de Barras' : 'Número de Série'
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
                )}>
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

          {cfg.tipo === 'lampada' && (
            <label className="flex items-center gap-2.5 mt-4 cursor-pointer group">
              <input type="checkbox" checked={cfg.apenasUma220} onChange={setCheck('apenasUma220')}
                className="w-4 h-4 rounded accent-gold cursor-pointer" />
              <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                Usar apenas <span className="text-gold font-semibold">220 V</span>
                <span className="text-white/30 text-xs ml-1.5">(padrão: 127 V + 220 V)</span>
              </span>
            </label>
          )}

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
              <input className="input" value={cfg.produto} onChange={set('produto')} placeholder="Ex: Luminária LED" />
            </Row>
            <Row label="Fabricante">
              <input className="input" value={cfg.fabricante} onChange={set('fabricante')} placeholder="Ex: Tradetek" />
            </Row>
            <Row label="Modelo">
              <input className="input" value={cfg.modelo} onChange={set('modelo')} placeholder="Ex: AGN7120D4" />
            </Row>
            <Row label={labelId}>
              <input className="input" value={cfg.identificador} onChange={set('identificador')}
                placeholder={cfg.tipo === 'lampada' ? 'Código de barras' : 'N° de série'} />
            </Row>
            <Row label="Potência Nominal">
              <input className="input" value={cfg.potencia} onChange={set('potencia')} placeholder="Ex: 120W" />
            </Row>
            <Row label="Tensão de Alimentação">
              <input className="input" value={cfg.tensaoAlim} onChange={set('tensaoAlim')} placeholder="Ex: 90 a 305VAC" />
            </Row>
            <Row label="Frequência de Rede">
              <input className="input" value={cfg.frequencia} onChange={set('frequencia')} placeholder="Ex: 50/60Hz" />
            </Row>
          </div>
        </div>

        {/* ── Dados do Relatório ── */}
        <div className="card p-5">
          <p className="form-section mb-4">Dados do Relatório</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Row label="N° do Relatório">
              <input className="input" value={cfg.numRelatorio} onChange={set('numRelatorio')}
                placeholder="Auto ao gerar relatório" />
            </Row>
            <Row label="Responsável Técnico">
              <input className="input" value={cfg.responsavel} onChange={set('responsavel')}
                placeholder="Ex: Lucas Menegotto Dias" />
            </Row>
            <Row label="Orçamento LABELO">
              <input className="input" value={cfg.orcamento} onChange={set('orcamento')} placeholder="Ex: 260921" />
            </Row>
            <Row label="Protocolo LABELO">
              <input className="input" value={cfg.protocolo} onChange={set('protocolo')} placeholder="Ex: 26041895" />
            </Row>
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
            <input ref={pastaRef} type="file" className="hidden" disabled={pastaLoading}
              {...{ webkitdirectory: '' } as any}
              onChange={e => { if (e.target.files?.length) handlePastaCompleta(e.target.files) }} />
          </label>

          <p className="text-[10px] text-white/25 font-mono text-center mb-4 -mt-2">
            A pasta deve conter: <span className="text-white/40">1 arquivo .docx</span> na raiz +{' '}
            <span className="text-white/40">subpasta de fotos</span> (1.png, 2.png…)
          </p>

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

          <div className="border-t border-white/5 pt-4 space-y-3">
            <p className="text-[9px] text-white/20 font-mono uppercase tracking-wider">Ou carregue separadamente</p>
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-[11px] text-white/40 hover:text-gold hover:border-gold/30 cursor-pointer transition-all">
                <Upload size={11} /> Pasta de Fotos
                <input ref={photoRef} type="file" className="hidden"
                  onChange={e => { if (e.target.files?.length) handlePhotos(e.target.files) }} />
              </label>
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
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={limparDados}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red/20 bg-red/8 text-red-400 hover:bg-red/15 transition-all text-sm font-medium">
            <Trash2 size={14} /> Limpar
          </button>

          <div className="flex-1" />

          <button type="button" onClick={openLote}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm">
            <Users size={14} /> Emitir Lote
          </button>

          <button type="button" onClick={() => router.push('/dashboard/formularios/emc/cispr15/relatorio')}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm">
            <FileText size={14} /> Ver PDF
          </button>

          <button type="button" onClick={gerarRelatorio} disabled={gerandoRel}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-bold">
            {gerandoRel ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={15} />}
            {gerandoRel ? 'Registrando…' : 'Gerar Relatório'}
          </button>
        </div>

        {flash && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green/10 border border-green/20 text-green-400 text-sm animate-fade-in">
            <CheckCircle2 size={15} /> {flash}
          </div>
        )}

      </div>

      {/* ══ MODAL LOTE ══ */}
      {loteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-[#141B28] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div>
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-0.5">CISPR 15 · EMC</p>
                <h2 className="text-base font-bold text-white font-display">Emitir Lote</h2>
              </div>
              <button onClick={() => setLoteOpen(false)} className="text-white/20 hover:text-white/60 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Config row */}
            <div className="flex items-start gap-6 px-6 py-4 border-b border-white/5 bg-white/2">
              <div className="flex flex-col gap-2">
                <Label>Amostras</Label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleLoteQtd(loteQtd - 1)}
                    className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 font-bold flex items-center justify-center transition-all">
                    −
                  </button>
                  <span className="text-white font-bold font-mono w-8 text-center">{loteQtd}</span>
                  <button type="button" onClick={() => handleLoteQtd(loteQtd + 1)}
                    className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 font-bold flex items-center justify-center transition-all">
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Tipo</Label>
                <div className="flex gap-2">
                  {(['lampada', 'luminaria'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setLoteTipo(t)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-mono border transition-all',
                        loteTipo === t ? 'border-gold bg-gold/10 text-gold' : 'border-white/8 text-white/35 hover:border-white/20'
                      )}>
                      {t === 'lampada' ? 'Lâmpada' : 'Luminária'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <Label>Cliente</Label>
                <p className="text-sm text-white/50 truncate">
                  {cfg.cliente || <span className="text-white/20 italic">não preenchido no formulário</span>}
                </p>
              </div>
            </div>

            {/* Lista de amostras */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {loteAmostras.map((am, i) => (
                <AmostraCard key={i} index={i} amostra={am}
                  expanded={loteExpanded === i}
                  onToggle={() => setLoteExpanded(loteExpanded === i ? null : i)}
                  onChange={updated => setLoteAmostras(prev => prev.map((a, j) => j === i ? updated : a))}
                />
              ))}
            </div>

            {/* Resultado de conformidade */}
            {loteResultado?.checked && (
              <div className={cn(
                'mx-6 mb-3 px-4 py-3 rounded-xl border text-sm',
                loteResultado.reprovados.length > 0
                  ? 'border-red/20 bg-red/8 text-red-400'
                  : 'border-green/20 bg-green/8 text-green-400'
              )}>
                {loteResultado.reprovados.length === 0 ? (
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={14} /> Todas as amostras estão conformes.
                  </span>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2">
                      <ShieldX size={14} />
                      {loteResultado.reprovados.length} reprovada(s):{' '}
                      {loteResultado.reprovados.map(i => `Amostra ${i + 1}`).join(', ')}
                    </span>
                    <button type="button" onClick={removerReprovados}
                      className="text-xs font-semibold underline hover:no-underline shrink-0">
                      Remover do lote
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-white/8">
              <button type="button" onClick={verificarConformidade}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/50 hover:text-white hover:border-white/25 transition-all">
                <Shield size={13} /> Verificar Conformidade
              </button>
              <div className="flex-1" />
              <button type="button" onClick={() => setLoteOpen(false)}
                className="btn-secondary px-4 py-2 text-sm">
                Fechar
              </button>
              <button type="button" onClick={emitirLote} disabled={loteEmitindo}
                className="btn-primary flex items-center gap-2 px-5 py-2 text-sm font-bold">
                {loteEmitindo ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                {loteEmitindo ? 'Emitindo…' : 'Emitir Lote'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
