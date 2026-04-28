'use client'

import { useState, useRef, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid } from '@/components/ui/FormField'
import CorrectionTab, { PontoCalib } from '@/components/ui/CorrectionTab'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sparkles, Paperclip, Loader2 } from 'lucide-react'
import { useEquipamentos } from '@/lib/hooks/useEquipamentos'
import { uploadFile } from '@/lib/storage/upload'

interface Props { open: boolean; onClose: () => void; certificado?: any }

type Tab = 'dados' | 'correcao'

export default function CertificadoModal({ open, onClose, certificado }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)
  const { equip } = useEquipamentos()

  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [fileName,  setFileName]  = useState<string | null>(null)
  const [file,      setFile]      = useState<File | null>(null)
  const [tab,       setTab]       = useState<Tab>('dados')

  const [f, setF] = useState({ num: '', equip_id: '', lab: '', emissao: '', acred: '', obs: '' })

  // dados extraídos pela IA para a aba de correção
  const [pontos,   setPontos]   = useState<PontoCalib[]>([])
  const [grandeza, setGrandeza] = useState<string>('')
  const [unidade,  setUnidade]  = useState<string>('')

  useEffect(() => {
    if (open) {
      setF({
        num:      certificado?.numero      || '',
        equip_id: certificado?.equip_id    || '',
        lab:      certificado?.laboratorio || '',
        emissao:  certificado?.emissao?.slice(0, 10) || '',
        acred:    certificado?.acreditacao || '',
        obs:      certificado?.obs         || '',
      })
      setFile(null); setFileName(null)
      // carrega tabela de correção salva anteriormente
      const ia = certificado?.analise_ia as any
      if (ia?.pontos?.length) {
        setPontos(ia.pontos)
        setGrandeza(ia.grandeza || '')
        setUnidade(ia.unidade  || '')
        setTab('correcao')
      } else {
        setPontos([]); setGrandeza(''); setUnidade('')
        setTab('dados')
      }
    }
  }, [open, certificado])

  function set(k: keyof typeof f, v: string) { setF(p => ({ ...p, [k]: v })) }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const s = e.target.files?.[0]
    if (!s) return
    setFile(s); setFileName(s.name)
  }

  async function analyzeWithAI() {
    if (!file) { alert('Selecione um PDF primeiro.'); return }
    setAnalyzing(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('tipo', 'cert')
      const res  = await fetch('/api/analyze-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Erro ao analisar PDF.'); return }

      // preenche campos básicos
      setF(p => ({
        ...p,
        num:     data.num     || p.num,
        lab:     data.lab     || p.lab,
        emissao: data.emissao || p.emissao,
        acred:   data.acred   || p.acred,
      }))

      // preenche tabela de correção
      if (Array.isArray(data.tabela) && data.tabela.length > 0) {
        const pts: PontoCalib[] = data.tabela.map((row: any) => ({
          fase:       row.fase       || undefined,
          faixa:      row.faixa      || undefined,
          frequencia: row.frequencia != null ? Number(row.frequencia) : undefined,
          nominal:    Number(row.nominal  ?? 0),
          medido:     Number(row.medido   ?? 0),
          erro:       Number(row.erro     ?? (row.medido - row.nominal)),
          correcao:   Number(row.correcao ?? (row.nominal - row.medido)),
          incerteza:  row.incerteza != null ? Number(row.incerteza) : undefined,
        }))
        setPontos(pts)
        setGrandeza(data.grandeza || '')
        setUnidade(data.unidade  || '')
        setTab('correcao')  // navega automaticamente para a aba de correção
      }
    } finally {
      setAnalyzing(false)
    }
  }

  async function save() {
    if (!f.num || !f.equip_id) { alert('Preencha Nº do certificado e selecione o equipamento.'); return }
    setSaving(true)

    let pdfPath: string | null = certificado?.pdf_path || null
    if (file) {
      setUploading(true)
      pdfPath = await uploadFile(file, 'certs', f.num)
      setUploading(false)
      if (!pdfPath) { setSaving(false); return }
    }

    const payload: Record<string, any> = {
      numero:      f.num,
      equip_id:    f.equip_id,
      laboratorio: f.lab    || null,
      emissao:     f.emissao || null,
      acreditacao: f.acred  || null,
      obs:         f.obs    || null,
      pdf_path:    pdfPath,
    }
    if (pontos.length > 0) {
      payload.analise_ia = { grandeza, unidade, pontos }
    }

    let error
    if (certificado?.id) {
      ({ error } = await supabase.from('certificados').update(payload).eq('id', certificado.id))
    } else {
      ({ error } = await supabase.from('certificados').insert(payload))
    }
    if (error) { setSaving(false); alert('Erro: ' + error.message); return }

    if (f.emissao && f.equip_id) {
      const { data: eq } = await supabase
        .from('equipamentos').select('cal_per').eq('id', f.equip_id).single()
      if (eq) {
        const calPer  = eq.cal_per || 12
        const emDate  = new Date(f.emissao)
        const valDate = new Date(emDate)
        valDate.setMonth(valDate.getMonth() + calPer)
        await supabase.from('equipamentos').update({
          cal_data: f.emissao,
          cal_val:  valDate.toISOString().slice(0, 10),
          ncert:    f.num  || null,
          lab_cal:  f.lab  || null,
        }).eq('id', f.equip_id)
      }
    }

    setSaving(false)
    onClose(); router.refresh()
  }

  const inp = 'input'
  const sel = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors'

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dados',    label: 'Dados do Certificado' },
    { key: 'correcao', label: `Correção & Interpolação${pontos.length ? ` (${pontos.length} pts)` : ''}` },
  ]

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title={certificado?.id ? 'Editar Certificado' : 'Registrar Certificado'}
      footer={
        <>
          <button className="btn-secondary text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn-primary text-xs" onClick={save} disabled={saving || uploading}>
            {uploading ? 'Enviando PDF...' : saving ? 'Salvando...' : certificado?.id ? 'Salvar Alterações' : 'Salvar'}
          </button>
        </>
      }
    >
      {/* ── Upload + IA (sempre visível) ─────────────── */}
      <div className="flex flex-col gap-2 mb-4">
        <div
          className="border border-dashed border-white/15 rounded-lg p-3 text-center
                     hover:border-gold/40 hover:bg-gold/5 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip size={14} className="mx-auto mb-1 text-white/30" />
          <p className="text-[11px] text-white/40">
            {fileName
              ? <span className="text-white/70">{fileName}</span>
              : 'Clique para anexar PDF do certificado'
            }
          </p>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
        </div>
        <button
          onClick={analyzeWithAI}
          disabled={analyzing || !file}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-btn border border-teal/30
                     bg-teal/5 text-teal text-xs font-medium hover:bg-teal/10 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {analyzing
            ? <><Loader2 size={13} className="animate-spin" /> Analisando tabela e campos...</>
            : <><Sparkles size={13} /> Interpretar PDF com IA — preencher dados e tabela de correção</>
          }
        </button>
      </div>

      {/* ── Sub-tabs ─────────────────────────────────── */}
      <div className="flex gap-1 border-b border-white/7 mb-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-[10.5px] font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-gold text-gold'
                : 'border-transparent text-white/35 hover:text-white/60'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Aba: Dados ───────────────────────────────── */}
      {tab === 'dados' && (
        <FormGrid>
          <FormSection>Dados do Certificado</FormSection>
          <FormField label="Nº Certificado *">
            <input className={inp} value={f.num} onChange={e => set('num', e.target.value)} placeholder="Nº cert." />
          </FormField>
          <FormField label="Equipamento *">
            <select className={sel} value={f.equip_id} onChange={e => set('equip_id', e.target.value)}>
              <option value="">Selecionar equipamento...</option>
              {equip.map(e => (
                <option key={e.id} value={e.id}>{e.tag} — {e.descricao}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Emitido por">
            <input className={inp} value={f.lab} onChange={e => set('lab', e.target.value)} placeholder="Lab acreditado" />
          </FormField>
          <FormField label="Emissão">
            <input type="date" className={inp} value={f.emissao} onChange={e => set('emissao', e.target.value)} />
          </FormField>
          <FormField label="Acreditação Nº">
            <input className={inp} value={f.acred} onChange={e => set('acred', e.target.value)} placeholder="Nº acreditação" />
          </FormField>
          <FormField label="OBS" full>
            <textarea className={inp} rows={2} value={f.obs} onChange={e => set('obs', e.target.value)} placeholder="Ressalvas, condições..." />
          </FormField>
        </FormGrid>
      )}

      {/* ── Aba: Correção & Interpolação ─────────────── */}
      {tab === 'correcao' && (
        <CorrectionTab pontos={pontos} grandeza={grandeza} unidade={unidade} />
      )}
    </Modal>
  )
}
