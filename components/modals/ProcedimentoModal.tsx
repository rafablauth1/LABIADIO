'use client'

import { useState, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid, NormasGrid } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sparkles, Paperclip, Loader2 } from 'lucide-react'

interface Props { open: boolean; onClose: () => void }

export default function ProcedimentoModal({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [f, setF] = useState({ cod: '', ver: '', desc: '', normas: [] as string[], pads: '', data: '', aprov: '', escopo: '' })

  function set(k: keyof typeof f, v: string | string[]) { setF(p => ({ ...p, [k]: v })) }

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
      form.append('tipo', 'proc')
      const res = await fetch('/api/analyze-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Erro ao analisar PDF.'); return }

      const NORMAS_VALIDAS = ['IEC 61000-4-2','IEC 61000-4-4','IEC 61000-4-5','IEC 61000-4-6','IEC 61000-4-11','IEC 61000-4-19','CISPR 15','IEC 61000-3-2']
      const normasExtracted = Array.isArray(data.normas)
        ? data.normas.filter((n: string) => NORMAS_VALIDAS.includes(n))
        : []

      setF(p => ({
        ...p,
        cod:    data.cod   || p.cod,
        ver:    data.ver   || p.ver,
        desc:   data.desc  || p.desc,
        normas: normasExtracted.length > 0 ? normasExtracted : p.normas,
        aprov:  data.aprov || p.aprov,
      }))
    } finally {
      setAnalyzing(false)
    }
  }

  async function save() {
    if (!f.cod || !f.desc) { alert('Preencha código e descrição.'); return }
    setSaving(true)
    const { error } = await supabase.from('procedimentos').insert({
      codigo: f.cod, versao: f.ver || null, descricao: f.desc,
      normas: f.normas, padroes: f.pads || null, data: f.data || null,
      aprovado_por: f.aprov || null, escopo: f.escopo || null,
    })
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    onClose(); router.refresh()
  }

  const inp = 'input'

  return (
    <Modal open={open} onClose={onClose} title="Procedimento de Checagem" size="lg"
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

        <FormSection>Dados do Procedimento</FormSection>
        <FormField label="Código *">
          <input className={inp} value={f.cod} onChange={e => set('cod', e.target.value)} placeholder="PC-EMC-001" />
        </FormField>
        <FormField label="Versão">
          <input className={inp} value={f.ver} onChange={e => set('ver', e.target.value)} placeholder="v1.0" />
        </FormField>
        <FormField label="Descrição *" full>
          <input className={inp} value={f.desc} onChange={e => set('desc', e.target.value)} placeholder="Descrição" />
        </FormField>

        <FormSection>Normas Base</FormSection>
        <NormasGrid value={f.normas} onChange={v => set('normas', v)} />

        <FormSection>Padrões & Escopo</FormSection>
        <FormField label="TAGs dos Padrões (separadas por vírgula)" full>
          <input className={inp} value={f.pads} onChange={e => set('pads', e.target.value)} placeholder="TAG1, TAG2..." />
        </FormField>
        <FormField label="Data">
          <input type="date" className={inp} value={f.data} onChange={e => set('data', e.target.value)} />
        </FormField>
        <FormField label="Aprovado por">
          <input className={inp} value={f.aprov} onChange={e => set('aprov', e.target.value)} placeholder="Responsável" />
        </FormField>
        <FormField label="Escopo" full>
          <textarea className={inp} rows={3} value={f.escopo} onChange={e => set('escopo', e.target.value)} placeholder="Critérios, condições..." />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
