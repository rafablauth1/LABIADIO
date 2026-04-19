'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid, FileUpload } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { open: boolean; onClose: () => void }

export default function NormaModal({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ norma: '', ver: '', titulo: '', ensaio: '', obs: '' })
  function set(k: keyof typeof f, v: string) { setF(p => ({ ...p, [k]: v })) }

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
        <FormSection>PDF da Norma</FormSection>
        <FileUpload label="PDF" accept=".pdf" />
      </FormGrid>
    </Modal>
  )
}
