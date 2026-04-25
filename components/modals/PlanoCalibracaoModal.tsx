'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormGrid } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Check, Search, X } from 'lucide-react'
import { useEquipamentos } from '@/lib/hooks/useEquipamentos'

interface Grandeza { nome: string; simbolo?: string; unidade: string; categoria: string }

interface Props {
  open: boolean
  onClose: () => void
  grandezas?: Grandeza[]
}

const CATEGORIAS = ['Elétrica', 'RF / TF', 'EMC', 'Ambiental']

export default function PlanoCalibracaoModal({ open, onClose, grandezas = [] }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { equip } = useEquipamentos()
  const [saving, setSaving] = useState(false)
  const [buscaG, setBuscaG] = useState('')
  const [f, setF] = useState({ equip_id: '', tag: '', lab: '', per: '12', ultima: '', proxima: '', ncert: '', escopo: '' })
  const [selectedGrandezas, setSelectedGrandezas] = useState<string[]>([])

  function set(k: keyof typeof f, v: string) { setF(p => ({ ...p, [k]: v })) }

  function selectEquip(id: string) {
    const e = equip.find(e => e.id === id)
    setF(p => ({ ...p, equip_id: id, tag: e?.tag || '' }))
  }

  function toggleGrandeza(nome: string) {
    setSelectedGrandezas(prev =>
      prev.includes(nome) ? prev.filter(g => g !== nome) : [...prev, nome]
    )
  }

  async function save() {
    if (!f.equip_id) { alert('Selecione o equipamento.'); return }
    setSaving(true)
    const { data: labId } = await supabase.rpc('get_user_lab_id')
    const { error } = await supabase.from('planos_calibracao').insert({
      lab_id: labId,
      tag: f.tag.toUpperCase(),
      laboratorio: f.lab || null,
      periodicidade: parseInt(f.per),
      ultima: f.ultima || null,
      proxima: f.proxima || null,
      ncert: f.ncert || null,
      escopo: f.escopo || null,
      grandezas: selectedGrandezas,
    })
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    onClose()
    router.refresh()
  }

  const grandezasFiltradas = grandezas.filter(g =>
    !buscaG || g.nome.toLowerCase().includes(buscaG.toLowerCase()) || g.unidade.toLowerCase().includes(buscaG.toLowerCase())
  )

  const grandezasPorCat = CATEGORIAS.reduce((acc, cat) => {
    acc[cat] = grandezasFiltradas.filter(g => g.categoria === cat)
    return acc
  }, {} as Record<string, Grandeza[]>)

  const inp = 'input'
  const sel = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors'

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); setSelectedGrandezas([]); setBuscaG(''); setF({ equip_id: '', tag: '', lab: '', per: '12', ultima: '', proxima: '', ncert: '', escopo: '' }) }}
      title="Plano de Calibração"
      size="lg"
      footer={
        <>
          <button className="btn-secondary text-xs" onClick={() => { onClose(); setSelectedGrandezas([]); setBuscaG(''); setF({ equip_id: '', tag: '', lab: '', per: '12', ultima: '', proxima: '', ncert: '', escopo: '' }) }}>
            Cancelar
          </button>
          <button className="btn-primary text-xs" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      <FormGrid>
        <FormField label="Equipamento *" full>
          <select className={sel} value={f.equip_id} onChange={e => selectEquip(e.target.value)}>
            <option value="">Selecionar equipamento...</option>
            {equip.map(e => (
              <option key={e.id} value={e.id}>{e.tag} — {e.descricao}</option>
            ))}
          </select>
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
        <FormField label="Escopo (observações)" full>
          <textarea className={inp} rows={2} value={f.escopo} onChange={e => set('escopo', e.target.value)} placeholder="Parâmetros, faixas adicionais..." />
        </FormField>

        {/* Grandezas */}
        <div className="col-span-2 pt-3 border-t border-white/7">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[8.5px] tracking-[2px] text-gold uppercase">
              Grandezas a Calibrar
              {selectedGrandezas.length > 0 && (
                <span className="ml-2 text-white/40">({selectedGrandezas.length} selecionadas)</span>
              )}
            </span>
            {selectedGrandezas.length > 0 && (
              <button className="text-[9px] text-white/30 hover:text-white/60 font-mono" onClick={() => setSelectedGrandezas([])}>
                Limpar
              </button>
            )}
          </div>

          {/* Selecionadas (chips) */}
          {selectedGrandezas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedGrandezas.map(g => (
                <span key={g} className="flex items-center gap-1 bg-gold/15 text-gold/90 font-mono text-[9px] px-2 py-1 rounded">
                  {g}
                  <button onClick={() => toggleGrandeza(g)} className="hover:text-gold"><X size={9} /></button>
                </span>
              ))}
            </div>
          )}

          {/* Busca */}
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              className="input w-full pl-7 text-[11px] py-1.5"
              placeholder="Buscar grandeza..."
              value={buscaG}
              onChange={e => setBuscaG(e.target.value)}
            />
          </div>

          {/* Lista por categoria */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {CATEGORIAS.map(cat => {
              const lista = grandezasPorCat[cat]
              if (!lista?.length) return null
              return (
                <div key={cat}>
                  <p className="font-mono text-[8px] tracking-[1.5px] text-white/30 uppercase mb-1 sticky top-0 bg-[#0e1220] py-0.5">
                    {cat}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {lista.map((g, i) => {
                      const sel = selectedGrandezas.includes(g.nome)
                      return (
                        <label key={i} className={`flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 transition-colors ${
                          sel ? 'bg-gold/10 border border-gold/20' : 'hover:bg-white/4 border border-transparent'
                        }`}>
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            sel ? 'bg-gold border-gold' : 'border-white/20'
                          }`}>
                            {sel && <Check size={9} className="text-navy" />}
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={sel}
                            onChange={() => toggleGrandeza(g.nome)}
                          />
                          <span className="text-[10px] text-white/70 leading-tight">
                            {g.nome}
                            {g.unidade && <span className="text-white/30 ml-1">({g.unidade})</span>}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {grandezasFiltradas.length === 0 && (
              <p className="text-center text-white/25 text-[11px] py-4">Nenhuma grandeza encontrada.</p>
            )}
          </div>
        </div>
      </FormGrid>
    </Modal>
  )
}
