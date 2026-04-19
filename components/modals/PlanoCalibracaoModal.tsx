'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormGrid } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { open: boolean; onClose: () => void }

export default function PlanoCalibracaoModal({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ tag: '', lab: '', per: '12', ultima: '', proxima: '', ncert: '', escopo: '' })
  function set(k: keyof typeof f, v: string) { setF(p => ({ ...p, [k]: v })) }

  async function save() {
    if (!f.tag) { alert('Selecione a TAG.'); return }
    setSaving(true)
    const { error } = await supabase.from('planos_calibracao').insert({
      tag: f.tag.toUpperCase(), laboratorio: f.lab || null, periodicidade: parseInt(f.per),
      ultima: f.ultima || null, proxima: f.proxima || null, ncert: f.ncert || null, escopo: f.escopo || null,
    })
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    onClose(); router.refresh()
  }

  const inp = 'input'

  return (
    <Modal open={open} onClose={onClose} title="Plano de Calibração"
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
        <FormField label="TAG *">
          <input className={inp} value={f.tag} onChange={e => set('tag', e.target.value)} placeholder="TAG do equipamento" />
        </FormField>
        <FormField label="Laboratório">
          <input className={inp} value={f.lab} onChange={e => set('lab', e.target.value)} placeholder="Lab acreditado" />
        </FormField>
        <FormField label="Periodicidade (meses)">
          <input type="number" className={inp} value={f.per} onChange={e => set('per', e.target.value)} />
        </FormField>
        <FormField label="Nº Certificado">
          <input className={inp} value={f.ncert} onChange={e => set('ncert', e.target.value)} placeholder="Nº cert." />
        </FormField>
        <FormField label="Última Calibração">
          <input type="date" className={inp} value={f.ultima} onChange={e => set('ultima', e.target.value)} />
        </FormField>
        <FormField label="Próxima">
          <input type="date" className={inp} value={f.proxima} onChange={e => set('proxima', e.target.value)} />
        </FormField>
        <FormField label="Escopo" full>
          <textarea className={inp} rows={3} value={f.escopo} onChange={e => set('escopo', e.target.value)} placeholder="Parâmetros, faixas..." />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
