'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormGrid } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { open: boolean; onClose: () => void }

const TIPOS = ['Firmware','Software de Controle','Driver','Software de Análise','Outro']

export default function SoftwareModal({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ tag: '', tipo: 'Firmware', nome: '', versao: '', data: '', validado: 'Sim', obs: '' })
  function set(k: keyof typeof f, v: string) { setF(p => ({ ...p, [k]: v })) }

  async function save() {
    if (!f.nome || !f.versao) { alert('Preencha nome e versão.'); return }
    setSaving(true)
    const { error } = await supabase.from('softwares').insert({
      equip_tag: f.tag.toUpperCase() || null, tipo: f.tipo, nome: f.nome,
      versao: f.versao, data: f.data || null, validado: f.validado, obs: f.obs || null,
    })
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    onClose(); router.refresh()
  }

  const inp = 'input'
  const sel = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors'

  return (
    <Modal open={open} onClose={onClose} title="Software / Firmware"
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
        <FormField label="Nome *" full>
          <input className={inp} value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome" />
        </FormField>
        <FormField label="Versão *">
          <input className={inp} value={f.versao} onChange={e => set('versao', e.target.value)} placeholder="v2.3.1" />
        </FormField>
        <FormField label="Data">
          <input type="date" className={inp} value={f.data} onChange={e => set('data', e.target.value)} />
        </FormField>
        <FormField label="Validado?" full>
          <select className={sel} value={f.validado} onChange={e => set('validado', e.target.value)}>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
            <option value="Em andamento">Em andamento</option>
          </select>
        </FormField>
        <FormField label="OBS" full>
          <textarea className={inp} rows={2} value={f.obs} onChange={e => set('obs', e.target.value)} placeholder="Hash, local, procedimento..." />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
