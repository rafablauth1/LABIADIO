'use client'

import { useState, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sparkles, Paperclip, Loader2 } from 'lucide-react'

interface Props { open: boolean; onClose: () => void }

export default function InstrucaoModal({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [f, setF] = useState({ cod: '', rev: '', titulo: '', tags: '', data: '', aprov: '', status: 'Vigente' })

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
      form.append('tipo', 'it')
      const res = await fetch('/api/analyze-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Erro ao analisar PDF.'); return }
      setF(p => ({
        ...p,
        cod:   data.cod   || p.cod,
        titulo: data.titulo || p.titulo,
        rev:   data.rev   || p.rev,
        tags:  data.tags  || p.tags,
        aprov: data.aprov || p.aprov,
      }))
    } finally {
      setAnalyzing(false)
    }
  }

  async function save() {
    if (!f.cod || !f.titulo) { alert('Preencha código e título.'); return }
    setSaving(true)
    const { error } = await supabase.from('instrucoes_trabalho').insert({
      codigo: f.cod, revisao: f.rev || null, titulo: f.titulo,
      tags: f.tags || null, data: f.data || null, aprovado_por: f.aprov || null, status: f.status,
    })
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    onClose(); router.refresh()
  }

  const inp = 'input'
  const sel = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors'

  return (
    <Modal open={open} onClose={onClose} title="Instrução de Trabalho"
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

        <FormSection>Dados da IT</FormSection>
        <FormField label="Código *">
          <input className={inp} value={f.cod} onChange={e => set('cod', e.target.value)} placeholder="IT-EMC-001" />
        </FormField>
        <FormField label="Revisão">
          <input className={inp} value={f.rev} onChange={e => set('rev', e.target.value)} placeholder="Rev. 00" />
        </FormField>
        <FormField label="Título *" full>
          <input className={inp} value={f.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Título" />
        </FormField>
        <FormField label="TAGs Envolvidas" full>
          <input className={inp} value={f.tags} onChange={e => set('tags', e.target.value)} placeholder="1528EMC, 3061EMC..." />
        </FormField>
        <FormField label="Data">
          <input type="date" className={inp} value={f.data} onChange={e => set('data', e.target.value)} />
        </FormField>
        <FormField label="Aprovado por">
          <input className={inp} value={f.aprov} onChange={e => set('aprov', e.target.value)} placeholder="Nome" />
        </FormField>
        <FormField label="Status" full>
          <select className={sel} value={f.status} onChange={e => set('status', e.target.value)}>
            <option>Vigente</option>
            <option>Em revisão</option>
            <option>Obsoleto</option>
          </select>
        </FormField>
      </FormGrid>
    </Modal>
  )
}
