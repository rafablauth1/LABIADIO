'use client'

import { useState, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sparkles, Paperclip, Loader2 } from 'lucide-react'

interface Props { open: boolean; onClose: () => void }

const TIPOS = ['Manual do Usuário','Manual de Serviço','Manual de Calibração','Guia de Operação','Outro']

export default function ManualModal({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [f, setF] = useState({ tag: '', tipo: 'Manual do Usuário', titulo: '', rev: '' })

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
    if (!f.titulo) { alert('Preencha o título.'); return }
    setSaving(true)
    const { error } = await supabase.from('manuais').insert({
      equip_tag: f.tag.toUpperCase() || null, tipo: f.tipo, titulo: f.titulo, revisao: f.rev || null,
    })
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    onClose(); router.refresh()
  }

  const inp = 'input'
  const sel = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors'

  return (
    <Modal open={open} onClose={onClose} title="Registrar Manual"
      footer={
        <>
          <button className="btn-secondary text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn-primary text-xs" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
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
        <FormField label="TAG">
          <input className={inp} value={f.tag} onChange={e => set('tag', e.target.value)} placeholder="TAG do equipamento" />
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
