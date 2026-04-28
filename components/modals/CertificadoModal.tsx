'use client'

import { useState, useRef, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sparkles, Paperclip, Loader2 } from 'lucide-react'
import { useEquipamentos } from '@/lib/hooks/useEquipamentos'
import { uploadFile } from '@/lib/storage/upload'

interface Props { open: boolean; onClose: () => void; certificado?: any }

export default function CertificadoModal({ open, onClose, certificado }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const { equip } = useEquipamentos()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [f, setF] = useState({ num: '', equip_id: '', lab: '', emissao: '', acred: '', obs: '' })

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
      setFile(null)
      setFileName(null)
    }
  }, [open, certificado])

  function set(k: keyof typeof f, v: string) { setF(p => ({ ...p, [k]: v })) }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setFileName(selected.name)
  }

  async function analyzeWithAI() {
    if (!file) { alert('Selecione um PDF primeiro.'); return }
    setAnalyzing(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('tipo', 'cert')
      const res = await fetch('/api/analyze-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Erro ao analisar PDF.'); return }
      setF(p => ({
        ...p,
        num:     data.num     || p.num,
        lab:     data.lab     || p.lab,
        emissao: data.emissao || p.emissao,
        acred:   data.acred   || p.acred,
      }))
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

    const payload = {
      numero:      f.num,
      equip_id:    f.equip_id,
      laboratorio: f.lab   || null,
      emissao:     f.emissao || null,
      acreditacao: f.acred || null,
      obs:         f.obs   || null,
      pdf_path:    pdfPath,
    }

    let error
    if (certificado?.id) {
      ({ error } = await supabase.from('certificados').update(payload).eq('id', certificado.id))
    } else {
      ({ error } = await supabase.from('certificados').insert(payload))
    }
    if (error) { setSaving(false); alert('Erro: ' + error.message); return }

    // Atualiza os campos de calibração do equipamento
    if (f.emissao && f.equip_id) {
      const { data: equip } = await supabase
        .from('equipamentos').select('cal_per').eq('id', f.equip_id).single()
      if (equip) {
        const calPer  = equip.cal_per || 12
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

  return (
    <Modal open={open} onClose={onClose} title={certificado?.id ? 'Editar Certificado' : 'Registrar Certificado'}
      footer={
        <>
          <button className="btn-secondary text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn-primary text-xs" onClick={save} disabled={saving || uploading}>
            {uploading ? 'Enviando PDF...' : saving ? 'Salvando...' : certificado?.id ? 'Salvar Alterações' : 'Salvar'}
          </button>
        </>
      }
    >
      <FormGrid>
        <FormSection>PDF do Certificado</FormSection>
        <div className="col-span-2 flex flex-col gap-2">
          <div
            className="border border-dashed border-white/15 rounded-lg p-4 text-center
                       hover:border-gold/40 hover:bg-gold/5 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip size={16} className="mx-auto mb-1 text-white/30" />
            <p className="text-[11px] text-white/40">
              {fileName ? <span className="text-white/70">{fileName}</span> : 'Clique para anexar PDF'}
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
              ? <><Loader2 size={13} className="animate-spin" /> Analisando...</>
              : <><Sparkles size={13} /> Analisar PDF com IA e Preencher Campos</>
            }
          </button>
        </div>

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
    </Modal>
  )
}
