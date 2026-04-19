'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid, FileUpload } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { open: boolean; onClose: () => void }

const TIPOS = ['Manual do Usuário','Manual de Serviço','Manual de Calibração','Guia de Operação','Outro']

export default function ManualModal({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ tag: '', tipo: 'Manual do Usuário', titulo: '', rev: '' })
  function set(k: keyof typeof f, v: string) { setF(p => ({ ...p, [k]: v })) }

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
        <FormSection>Arquivo</FormSection>
        <FileUpload label="arquivo" accept=".pdf,.doc,.docx" />
      </FormGrid>
    </Modal>
  )
}
