'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid, FileUpload } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { open: boolean; onClose: () => void }

export default function InstrucaoModal({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ cod: '', rev: '', titulo: '', tags: '', data: '', aprov: '', status: 'Vigente' })
  function set(k: keyof typeof f, v: string) { setF(p => ({ ...p, [k]: v })) }

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
        <FormSection>Arquivo</FormSection>
        <FileUpload label="arquivo" accept=".pdf,.doc,.docx" />
      </FormGrid>
    </Modal>
  )
}
