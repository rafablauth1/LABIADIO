'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Lightbulb, Lamp, ArrowRight, Upload, X, Loader2,
  Trash2, CheckCircle2, FileText, FolderOpen, Users, Database, History, BookOpen, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type Cispr15Config, type LoteConfig, type ClienteDB, type RelatorioSalvo, DEFAULTS,
  CFG_KEY, PHOTOS_KEY, DOCX_HTML_KEY, DOCX_NAME_KEY, LOTE_KEY, CLIENTES_KEY,
  RELATORIOS_KEY, RELATORIO_DOCX_PFX, EMENDA_DRAFT_KEY,
  newAmostra,
} from './types'
import { ClientesTab }   from './ClientesTab'
import { RelatoriosTab } from './RelatoriosTab'

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
  const [tab, setTab] = useState<'formulario' | 'clientes' | 'relatorios'>('formulario')
  const photoRef  = useRef<HTMLInputElement>(null)
  const pastaRef  = useRef<HTMLInputElement>(null)
  const cfgLoaded = useRef(false)

  useEffect(() => {
    photoRef.current?.setAttribute('webkitdirectory', '')
    pastaRef.current?.setAttribute('webkitdirectory', '')
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
    // skip the very first run (cfg = DEFAULTS) — wait for the load effect to finish first
    if (!cfgLoaded.current) { cfgLoaded.current = true; return }
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

  function setTipo(t: 'lampada' | 'luminaria') {
    setCfg(prev => ({ ...prev, tipo: t, tensaoConfig: '127_220' }))
  }

  async function handleCep(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
    setCfg(prev => ({ ...prev, clienteCep: formatted }))
    if (digits.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
        const data = await res.json()
        if (!data.erro) setCfg(prev => ({ ...prev, clienteCep: formatted, clienteCidade: `${data.localidade} - ${data.uf}` }))
      } catch {}
    }
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
  function handleImportAmostra() {
    importJson(data => setCfg(prev => ({
      ...prev,
      produto: data.produto ?? prev.produto, fabricante: data.fabricante ?? prev.fabricante,
      modelo: data.modelo ?? prev.modelo, identificador: data.identificador ?? prev.identificador,
      tensaoAlim: data.tensaoAlim ?? prev.tensaoAlim, potencia: data.potencia ?? prev.potencia,
      frequencia: data.frequencia ?? prev.frequencia,
    })))
  }

  const labelId = cfg.tipo === 'lampada' ? 'Código de Barras' : 'Número de Série'

  /* ── validação ── */
  const validationErrors = useMemo(() => {
    const errs: string[] = []
    if (!cfg.cliente.trim())       errs.push('Nome do cliente')
    if (!cfg.clienteRua.trim())    errs.push('Endereço do cliente')
    if (!cfg.clienteCidade.trim()) errs.push('Cidade')
    if (!cfg.produto.trim())       errs.push('Produto')
    if (!cfg.fabricante.trim())    errs.push('Fabricante')
    if (!cfg.modelo.trim())        errs.push('Modelo')
    if (!cfg.identificador.trim()) errs.push(labelId)
    if (!cfg.potencia.trim())      errs.push('Potência nominal')
    if (!cfg.tensaoAlim.trim())    errs.push('Tensão de alimentação')
    if (!cfg.protocolo.trim())     errs.push('Protocolo LABELO')
    if (!cfg.responsavel.trim())   errs.push('Responsável técnico')
    if (photos.length === 0)       errs.push('Fotos do ensaio')
    if (!docx.html)                errs.push('Arquivo .docx (Radimation)')
    return errs
  }, [cfg, photos.length, docx.html, labelId])

  /* ── salvar no histórico local ── */
  function salvarRelatorioLocal(finalCfg: Cispr15Config) {
    try {
      const raw = localStorage.getItem(RELATORIOS_KEY)
      const list: RelatorioSalvo[] = raw ? JSON.parse(raw) : []
      const existingIdx = list.findIndex(r =>
        finalCfg.numRelatorio && r.numRelatorio === finalCfg.numRelatorio
      )
      const id = existingIdx >= 0 ? list[existingIdx].id : Date.now().toString()
      const entry: RelatorioSalvo = {
        id,
        numRelatorio: finalCfg.numRelatorio,
        dataEmissao:  finalCfg.dataEmissao,
        clienteNome:  finalCfg.cliente,
        protocolo:    finalCfg.protocolo,
        produto:      finalCfg.produto,
        cfg:          finalCfg,
        photos:       photos.map(p => ({ name: p.name, base64: p.base64 })),
        docxFilename: docx.filename,
        emendas:      existingIdx >= 0 ? list[existingIdx].emendas : [],
      }
      if (existingIdx >= 0) list[existingIdx] = entry
      else list.unshift(entry)
      localStorage.setItem(RELATORIOS_KEY, JSON.stringify(list))
      if (docx.html) {
        try { localStorage.setItem(RELATORIO_DOCX_PFX + id, docx.html) } catch {}
      }
    } catch (e: any) {
      const msg = String(e)
      if (msg.includes('QuotaExceeded') || msg.includes('quota') || msg.includes('QUOTA')) {
        alert('Aviso: armazenamento local cheio — fotos não salvas no histórico. O relatório foi registrado normalmente na planilha.')
      }
    }
  }

  /* ── carregar relatório salvo ── */
  function handleCarregarRelatorio(entry: RelatorioSalvo) {
    setCfg(entry.cfg)
    setPhotos(entry.photos.map(p => ({ ...p, url: `data:image/jpeg;base64,${p.base64}` })))
    const docxHtml = localStorage.getItem(RELATORIO_DOCX_PFX + entry.id)
    setDocx({ loading: false, html: docxHtml, filename: entry.docxFilename })
    localStorage.setItem(CFG_KEY, JSON.stringify(entry.cfg))
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(entry.photos))
    if (docxHtml) localStorage.setItem(DOCX_HTML_KEY, docxHtml)
    else localStorage.removeItem(DOCX_HTML_KEY)
    localStorage.setItem(DOCX_NAME_KEY, entry.docxFilename ?? '')
    localStorage.removeItem(EMENDA_DRAFT_KEY)
    setTab('formulario')
    flash4(`Relatório "${entry.numRelatorio}" carregado`)
  }

  /* ── ver PDF de relatório salvo ── */
  function handleVerPDFRelatorio(entry: RelatorioSalvo) {
    setCfg(entry.cfg)
    setPhotos(entry.photos.map(p => ({ ...p, url: `data:image/jpeg;base64,${p.base64}` })))
    const docxHtml = localStorage.getItem(RELATORIO_DOCX_PFX + entry.id)
    setDocx({ loading: false, html: docxHtml, filename: entry.docxFilename })
    localStorage.setItem(CFG_KEY, JSON.stringify(entry.cfg))
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(entry.photos))
    if (docxHtml) localStorage.setItem(DOCX_HTML_KEY, docxHtml)
    else localStorage.removeItem(DOCX_HTML_KEY)
    localStorage.setItem(DOCX_NAME_KEY, entry.docxFilename ?? '')
    localStorage.removeItem(EMENDA_DRAFT_KEY)
    router.push('/dashboard/formularios/emc/cispr15/relatorio')
  }

  /* ── gerar relatório ── */
  async function gerarRelatorio() {
    if (validationErrors.length > 0) {
      alert(`Preencha os campos obrigatórios antes de gerar:\n\n• ${validationErrors.join('\n• ')}`)
      return
    }
    setGerandoRel(true)
    try {
      // Verificar protocolo duplicado (somente para novos relatórios)
      if (!cfg.numRelatorio && cfg.protocolo.trim()) {
        // Verificar localmente primeiro
        const localRaw = localStorage.getItem(RELATORIOS_KEY)
        if (localRaw) {
          const localList: RelatorioSalvo[] = JSON.parse(localRaw)
          const dup = localList.find(r => r.protocolo.trim().toLowerCase() === cfg.protocolo.trim().toLowerCase())
          if (dup) {
            const ok = confirm(
              `⚠ Protocolo "${cfg.protocolo}" já possui o relatório "${dup.numRelatorio}" no histórico local.\n\nDeseja continuar e criar um novo registro mesmo assim?`
            )
            if (!ok) { setGerandoRel(false); return }
          }
        }
        // Verificar na planilha Excel
        try {
          const checkRes = await fetch(`/api/formularios/cispr15/registrar-excel?checkProtocolo=${encodeURIComponent(cfg.protocolo.trim())}`)
          const checkData = await checkRes.json()
          if (checkData.exists) {
            const ok = confirm(
              `⚠ Protocolo "${cfg.protocolo}" já está registrado na planilha${checkData.numRelatorio ? ` (${checkData.numRelatorio})` : ''}.\n\nDeseja continuar e criar um novo registro mesmo assim?`
            )
            if (!ok) { setGerandoRel(false); return }
          }
        } catch {}
      }

      let finalCfg = cfg
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
        finalCfg = { ...cfg, numRelatorio: data.numRelatorio }
        setCfg(finalCfg)
        localStorage.setItem(CFG_KEY, JSON.stringify(finalCfg))
      }

      // Salvar no histórico local
      salvarRelatorioLocal(finalCfg)

      flash4(`Registrado: ${finalCfg.numRelatorio}`)
      router.push('/dashboard/formularios/emc/cispr15/relatorio')
    } catch (err: any) {
      alert(`Erro ao registrar no Excel: ${err.message}`)
    } finally {
      setGerandoRel(false)
    }
  }

  /* ── clientes DB ── */
  function handleUsarCliente(c: ClienteDB) {
    setCfg(prev => ({
      ...prev,
      cliente: c.nome,
      clienteRua: c.rua,
      clienteCidade: c.cidade,
      clienteCep: c.cep,
    }))
    setTab('formulario')
    flash4(`Cliente "${c.nome}" carregado`)
  }

  function handleSalvarCliente() {
    if (!cfg.cliente.trim()) { alert('Preencha o nome do cliente primeiro.'); return }
    try {
      const raw = localStorage.getItem(CLIENTES_KEY)
      const lista: ClienteDB[] = raw ? JSON.parse(raw) : []
      const existente = lista.find(c => c.nome.toLowerCase() === cfg.cliente.toLowerCase())
      if (existente) {
        if (!confirm(`Atualizar os dados de "${cfg.cliente}"?`)) return
        const updated = lista.map(c => c.id === existente.id
          ? { ...c, rua: cfg.clienteRua, cidade: cfg.clienteCidade, cep: cfg.clienteCep }
          : c)
        localStorage.setItem(CLIENTES_KEY, JSON.stringify(updated))
      } else {
        const novo: ClienteDB = {
          id: Date.now().toString(),
          nome: cfg.cliente, rua: cfg.clienteRua,
          cidade: cfg.clienteCidade, cep: cfg.clienteCep, cnpj: '',
        }
        localStorage.setItem(CLIENTES_KEY, JSON.stringify([...lista, novo]))
      }
      flash4('Cliente salvo no banco de dados')
    } catch { alert('Erro ao salvar cliente') }
  }

  /* ── abrir lote ── */
  function openLote() {
    const existing = localStorage.getItem(LOTE_KEY)
    if (!existing) {
      const config: LoteConfig = {
        tipo: cfg.tipo,
        qtd: 3,
        cliente: cfg.cliente,
        clienteRua: cfg.clienteRua,
        clienteCidade: cfg.clienteCidade,
        clienteCep: cfg.clienteCep,
        responsavel: cfg.responsavel,
        amostras: Array.from({ length: 3 }, newAmostra),
      }
      localStorage.setItem(LOTE_KEY, JSON.stringify(config))
    }
    router.push('/dashboard/formularios/emc/cispr15/lote')
  }

  const TENSAO_OPTS = [
    { value: '127',         label: '127 V',                sub: 'apenas' },
    { value: '127_220',     label: '127 V + 220 V',        sub: 'padrão' },
    { value: '127_220_277', label: '127 V + 220 V + 277 V', sub: 'internacional' },
  ] as const

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="form-section mb-1">Formulários de Ensaio · EMC</p>
        <h1 className="text-2xl font-display font-bold text-white">CISPR 15</h1>
        <p className="text-white/40 text-sm mt-1">
          Equipamentos de iluminação elétrica — Limites e métodos de medição de perturbações radiadas
        </p>
      </div>

      {/* ── Abas ── */}
      <div className="flex gap-1 mb-5 p-1 bg-navy rounded-xl border border-white/6 w-fit">
        {([
          { id: 'formulario', label: 'Formulário',  icon: null },
          { id: 'clientes',   label: 'Clientes',    icon: <Database size={13} /> },
          { id: 'relatorios', label: 'Relatórios',  icon: <FileText size={13} /> },
        ] as const).map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-[#141B28] text-white border border-white/10 shadow-sm'
                : 'text-white/35 hover:text-white/60'
            )}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'clientes'   && <ClientesTab   onUsar={handleUsarCliente} />}
      {tab === 'relatorios' && <RelatoriosTab onCarregar={handleCarregarRelatorio} onVerPDF={handleVerPDFRelatorio} />}

      {tab === 'formulario' && <div className="space-y-5">

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
            <div className="mt-4 space-y-1.5">
              <p className="text-[10px] text-white/35 uppercase tracking-widest font-mono mb-2">Tensão(ões) de ensaio</p>
              {TENSAO_OPTS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="radio" name="tensaoConfig" value={opt.value}
                    checked={cfg.tensaoConfig === opt.value}
                    onChange={() => setCfg(prev => ({ ...prev, tensaoConfig: opt.value }))}
                    className="w-4 h-4 accent-gold cursor-pointer" />
                  <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">
                    <span className="font-semibold text-white/90">{opt.label}</span>
                    <span className="text-white/30 text-xs ml-1.5">— {opt.sub}</span>
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-teal/6 border border-teal/15 text-sm">
            <span className="font-mono text-[10px] text-teal/60 uppercase tracking-wider">Tensões</span>
            <span className="text-teal font-bold">
              {cfg.tipo === 'luminaria' ? '220 V' : TENSAO_OPTS.find(o => o.value === cfg.tensaoConfig)?.label ?? '127 V + 220 V'}
            </span>
            <span className="text-white/15">·</span>
            <span className="font-mono text-[10px] text-teal/60 uppercase tracking-wider">ID</span>
            <span className="text-teal font-bold">{labelId}</span>
          </div>
        </div>

        {/* ── Cliente ── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="form-section">Cliente</p>
            <button type="button" onClick={handleSalvarCliente}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-white/50 hover:text-teal border border-white/10 hover:border-teal/30 rounded-lg transition-all">
              <Database size={11} /> Salvar no banco
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
                placeholder="Preenchido automaticamente pelo CEP" />
            </Row>
            <Row label="CEP">
              <input className="input" value={cfg.clienteCep}
                onChange={e => handleCep(e.target.value)}
                placeholder="Ex: 70830-010"
                maxLength={9} inputMode="numeric" />
            </Row>
          </div>
        </div>

        {/* ── Objeto Ensaiado ── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="form-section">Objeto Ensaiado</p>
            <button type="button" onClick={handleImportAmostra}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-white/50 hover:text-gold border border-white/10 hover:border-gold/30 rounded-lg transition-all">
              Importar JSON
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

        {/* ── Status de validação ── */}
        {validationErrors.length > 0 ? (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/6 border border-amber-500/15 text-amber-400/80 text-[11px]">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">Pendente: </span>
              {validationErrors.join(' · ')}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green/6 border border-green/15 text-green-400/80 text-[11px]">
            <CheckCircle2 size={12} />
            <span>Pronto — todos os campos obrigatórios preenchidos</span>
          </div>
        )}

        {/* ── Ações ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={limparDados}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red/20 bg-red/8 text-red-400 hover:bg-red/15 transition-all text-sm font-medium">
            <Trash2 size={14} /> Limpar
          </button>

          <button type="button"
            onClick={() => window.open('/dashboard/formularios/emc/cispr15/instrucao', '_blank')}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-white/8 text-white/30 hover:text-white/60 hover:border-white/20 transition-all text-xs">
            <BookOpen size={13} /> Manual
          </button>

          <div className="flex-1" />

          <button type="button" onClick={openLote}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm">
            <Users size={14} /> Emitir Lote
          </button>

          <button type="button" onClick={() => router.push('/dashboard/formularios/emc/cispr15/emenda')}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm">
            <History size={14} /> Gerar Emenda
          </button>

          <button type="button" onClick={() => router.push('/dashboard/formularios/emc/cispr15/relatorio')}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm">
            <FileText size={14} /> Ver PDF
          </button>

          <button type="button" onClick={gerarRelatorio} disabled={gerandoRel}
            className={cn(
              'btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-bold',
              validationErrors.length > 0 && 'opacity-50 cursor-not-allowed',
            )}>
            {gerandoRel ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={15} />}
            {gerandoRel ? 'Registrando…' : 'Gerar Relatório'}
          </button>
        </div>

        {flash && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green/10 border border-green/20 text-green-400 text-sm animate-fade-in">
            <CheckCircle2 size={15} /> {flash}
          </div>
        )}

      </div>}
    </div>
  )
}
