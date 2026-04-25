'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormGrid } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEquipamentos } from '@/lib/hooks/useEquipamentos'

interface Props { open: boolean; onClose: () => void }

const NORMAS = ['IEC 61000-4-2','IEC 61000-4-3','IEC 61000-4-4','IEC 61000-4-5','IEC 61000-4-6','IEC 61000-4-11','IEC 61000-4-19','Geral']

export default function ControleChecagemModal({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { equip } = useEquipamentos()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ equip_id: '', norma: 'IEC 61000-4-2', per: '6', resp: '', prox: '', obs: '' })
  function set(k: keyof typeof f, v: string) { setF(p => ({ ...p, [k]: v })) }

  async function save() {
    if (!f.equip_id) { alert('Selecione o equipamento.'); return }
    const equipSel = equip.find(e => e.id === f.equip_id)
    setSaving(true)
    const { error } = await supabase.from('controle_checagens').insert({
      equip_id: f.equip_id, tag: equipSel?.tag || '',
      norma: f.norma, periodicidade: parseInt(f.per),
      responsavel: f.resp || null, proxima: f.prox || null, obs: f.obs || null,
    })
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    onClose(); router.refresh()
  }

  const inp = 'input'
  const sel = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors'

  return (
    <Modal open={open} onClose={onClose} title="Configurar Checagem"
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
        <FormField label="Equipamento *" full>
          <select className={sel} value={f.equip_id} onChange={e => set('equip_id', e.target.value)}>
            <option value="">Selecionar equipamento...</option>
            {equip.map(e => <option key={e.id} value={e.id}>{e.tag} — {e.descricao}</option>)}
          </select>
        </FormField>
        <FormField label="Norma">
          <select className={sel} value={f.norma} onChange={e => set('norma', e.target.value)}>
            {NORMAS.map(n => <option key={n}>{n}</option>)}
          </select>
        </FormField>
        <FormField label="Periodicidade (meses)">
          <input type="number" className={inp} value={f.per} min="1" onChange={e => set('per', e.target.value)} />
        </FormField>
        <FormField label="Responsável">
          <input className={inp} value={f.resp} onChange={e => set('resp', e.target.value)} placeholder="Técnico" />
        </FormField>
        <FormField label="Próxima Checagem">
          <input type="date" className={inp} value={f.prox} onChange={e => set('prox', e.target.value)} />
        </FormField>
        <FormField label="OBS" full>
          <textarea className={inp} rows={2} value={f.obs} onChange={e => set('obs', e.target.value)} placeholder="Critérios personalizados..." />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
