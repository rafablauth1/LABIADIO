'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid, FileUpload } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { open: boolean; onClose: () => void }

export default function CertificadoModal({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ num: '', tag: '', lab: '', emissao: '', acred: '', obs: '' })
  function set(k: keyof typeof f, v: string) { setF(p => ({ ...p, [k]: v })) }

  async function save() {
    if (!f.num || !f.tag) { alert('Preencha Nº do certificado e TAG.'); return }
    setSaving(true)
    const { error } = await supabase.from('certificados').insert({
      numero: f.num, equip_tag: f.tag.toUpperCase(), lab: f.lab || null,
      emissao: f.emissao || null, acreditacao: f.acred || null, obs: f.obs || null,
    })
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    onClose(); router.refresh()
  }

  const inp = 'input'

  return (
    <Modal open={open} onClose={onClose} title="Registrar Certificado"
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
        <FormField label="Nº Certificado *">
          <input className={inp} value={f.num} onChange={e => set('num', e.target.value)} placeholder="Nº cert." />
        </FormField>
        <FormField label="TAG *">
          <input className={inp} value={f.tag} onChange={e => set('tag', e.target.value)} placeholder="TAG do equipamento" />
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
        <FormSection>PDF do Certificado</FormSection>
        <FileUpload label="PDF" accept=".pdf" />
      </FormGrid>
    </Modal>
  )
}
