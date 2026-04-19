'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid, NormasGrid, FileUpload } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { open: boolean; onClose: () => void }

export default function ProcedimentoModal({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ cod: '', ver: '', desc: '', normas: [] as string[], pads: '', data: '', aprov: '', escopo: '' })
  function set(k: keyof typeof f, v: string | string[]) { setF(p => ({ ...p, [k]: v })) }

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

        <FormSection>Padrões Envolvidos</FormSection>
        <FormField label="TAGs (separadas por vírgula)" full>
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

        <FormSection>Arquivo</FormSection>
        <FileUpload label="arquivo" accept=".pdf,.doc,.docx" />
      </FormGrid>
    </Modal>
  )
}
