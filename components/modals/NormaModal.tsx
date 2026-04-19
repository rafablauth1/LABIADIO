'use client'

import { useState, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sparkles, Paperclip, Loader2 } from 'lucide-react'

interface Props { open: boolean; onClose: () => void }

export default function NormaModal({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [f, setF] = useState({ norma: '', ver: '', titulo: '', ensaio: '', obs: '' })

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
      form.append('tipo', 'norm')
      const res = await fetch('/api/analyze-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Erro ao analisar PDF.'); return }
      setF(p => ({
        ...p,
        norma:  data.norma  || p.norma,
        ver:    data.ver    || p.ver,
        titulo: data.titulo || p.titulo,
        ensaio: data.ensaio || p.ensaio,
      }))
    } finally {
      setAnalyzing(false)
    }
  }

  async function save() {
    if (!f.norma || !f.titulo) { alert('Preencha norma e título.'); return }
    setSaving(true)
    const { error } = await supabase.from('normas').insert({
      norma: f.norma, versao: f.ver || null, titulo: f.titulo, ensaio: f.ensaio || null, obs: f.obs || null,
    })
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    onClose(); router.refresh()
  }

  const inp = 'input'

  return (
    <Modal open={open} onClose={onClose} title="Documento Normativo"
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
        <FormSection>PDF da Norma</FormSection>
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

        <FormSection>Dados da Norma</FormSection>
        <FormField label="Norma * (ex: IEC 61000-4-2)">
          <input className={inp} value={f.norma} onChange={e => set('norma', e.target.value)} placeholder="Nº da norma" />
        </FormField>
        <FormField label="Versão / Ano *">
          <input className={inp} value={f.ver} onChange={e => set('ver', e.target.value)} placeholder="2014, Ed.2..." />
        </FormField>
        <FormField label="Título *" full>
          <input className={inp} value={f.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Título completo" />
        </FormField>
        <FormField label="Tipo de Ensaio" full>
          <input className={inp} value={f.ensaio} onChange={e => set('ensaio', e.target.value)} placeholder="EMC - Imunidade ESD..." />
        </FormField>
        <FormField label="OBS" full>
          <textarea className={inp} rows={2} value={f.obs} onChange={e => set('obs', e.target.value)} placeholder="Diferenças de versão..." />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
