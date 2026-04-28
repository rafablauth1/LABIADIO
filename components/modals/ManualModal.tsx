'use client'

import { useState, useRef, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sparkles, Paperclip, Loader2 } from 'lucide-react'
import { uploadFile } from '@/lib/storage/upload'
import { useEquipamentos } from '@/lib/hooks/useEquipamentos'

interface Props { open: boolean; onClose: () => void; manual?: any }

const TIPOS = ['Manual do Usuário','Manual de Serviço','Manual de Calibração','Guia de Operação','Outro']

export default function ManualModal({ open, onClose, manual }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const { equip } = useEquipamentos()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [f, setF] = useState({ equip_id: '', tipo: 'Manual do Usuário', titulo: '', rev: '' })

  useEffect(() => {
    if (open) {
      const equipId = manual?.equip_tag
        ? equip.find(e => e.tag === manual.equip_tag)?.id || ''
        : ''
      setF({
        equip_id: equipId,
        tipo:     manual?.tipo    || 'Manual do Usuário',
        titulo:   manual?.titulo  || '',
        rev:      manual?.revisao || '',
      })
      setFile(null)
      setFileName(null)
    }
  }, [open, manual, equip])

  function set(k: keyof typeof f, v: string) { setF(p => ({ ...p, [k]: v })) }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setFileName(selected.name)
  }

  async function analyzeWithAI() {
    if (!file) { alert('Selecione um arquivo primeiro.'); return }
    setAnalyzing(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('tipo', 'manual')
      const res = await fetch('/api/analyze-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Erro ao analisar PDF.'); return }
      setF(p => ({
        ...p,
        titulo: data.titulo || p.titulo,
        tipo:   TIPOS.includes(data.tipo) ? data.tipo : p.tipo,
        rev:    data.rev    || p.rev,
      }))
    } finally {
      setAnalyzing(false)
    }
  }

  async function save() {
    if (!f.equip_id) { alert('Selecione o equipamento.'); return }
    if (!f.titulo)   { alert('Preencha o título.'); return }
    setSaving(true)

    const equipSelecionado = equip.find(e => e.id === f.equip_id)

    let pdfPath: string | null = manual?.pdf_path || null
    if (file) {
      setUploading(true)
      pdfPath = await uploadFile(file, 'manuais', f.titulo)
      setUploading(false)
      if (!pdfPath) { setSaving(false); return }
    }

    const payload = {
      equip_tag: equipSelecionado?.tag || null,
      tipo:      f.tipo,
      titulo:    f.titulo,
      revisao:   f.rev || null,
      pdf_path:  pdfPath,
    }

    let error
    if (manual?.id) {
      ;({ error } = await supabase.from('manuais').update(payload).eq('id', manual.id))
    } else {
      const { data: labId } = await supabase.rpc('get_user_lab_id')
      ;({ error } = await supabase.from('manuais').insert({ lab_id: labId, ...payload }))
    }
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    onClose(); router.refresh()
  }

  const inp = 'input'
  const sel = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors'

  return (
    <Modal open={open} onClose={onClose} title={manual?.id ? 'Editar Manual' : 'Registrar Manual'}
      footer={
        <>
          <button className="btn-secondary text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn-primary text-xs" onClick={save} disabled={saving || uploading}>
            {uploading ? 'Enviando PDF...' : saving ? 'Salvando...' : manual?.id ? 'Salvar Alterações' : 'Salvar'}
          </button>
        </>
      }
    >
      <FormGrid>
        <FormSection>Arquivo</FormSection>
        <div className="col-span-2 flex flex-col gap-2">
          <div
            className="border border-dashed border-white/15 rounded-lg p-4 text-center
                       hover:border-gold/40 hover:bg-gold/5 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip size={16} className="mx-auto mb-1 text-white/30" />
            <p className="text-[11px] text-white/40">
              {fileName ? <span className="text-white/70">{fileName}</span> : 'Clique para anexar arquivo'}
            </p>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} />
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

        <FormSection>Dados do Manual</FormSection>
        <FormField label="Equipamento *" full>
          <select className={sel} value={f.equip_id} onChange={e => set('equip_id', e.target.value)}>
            <option value="">— Selecionar equipamento —</option>
            {equip.map(e => (
              <option key={e.id} value={e.id}>{e.tag} — {e.descricao}</option>
            ))}
          </select>
          {equip.length === 0 && (
            <p className="text-[10px] text-warning/70 font-mono mt-1">Nenhum equipamento cadastrado ainda.</p>
          )}
        </FormField>
        <FormField label="Tipo">
          <select className={sel} value={f.tipo} onChange={e => set('tipo', e.target.value)}>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Título *" full>
          <input className={inp} value={f.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Título" />
        </FormField>
        <FormField label="Revisão" full>
          <input className={inp} value={f.rev} onChange={e => set('rev', e.target.value)} placeholder="Rev. A, v2.1..." />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
