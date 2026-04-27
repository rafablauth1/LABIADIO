'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormGrid } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Check, Search, X, Plus, Trash2 } from 'lucide-react'
import { useEquipamentos } from '@/lib/hooks/useEquipamentos'

interface Grandeza { id?: string; nome: string; simbolo?: string; unidade: string; categoria: string }
interface PontoCal {
  grandeza: string
  criterio: string
  configuracao: string
  data_registro: string
}
interface ParamNormativo { norma: string; parametro: string; criterio: string }

interface Props { open: boolean; onClose: () => void; grandezas?: Grandeza[] }

const CATEGORIAS = ['Elétrica', 'RF / TF', 'EMC', 'Ambiental']

const PARAMS_NORMATIVOS: ParamNormativo[] = [
  { norma: 'IEC 61000-4-2',      parametro: 'ESD — Descarga por Contato',      criterio: '±2 / ±4 / ±6 / ±8 kV' },
  { norma: 'IEC 61000-4-2',      parametro: 'ESD — Descarga por Ar',            criterio: '±2 / ±4 / ±8 / ±15 kV' },
  { norma: 'IEC 61000-4-3',      parametro: 'Imunidade Radiada',                criterio: '1 / 3 / 10 V/m — 80 MHz–1 GHz' },
  { norma: 'IEC 61000-4-4',      parametro: 'EFT/Burst — Alimentação',          criterio: '±0,5 / ±1 / ±2 / ±4 kV' },
  { norma: 'IEC 61000-4-4',      parametro: 'EFT/Burst — Sinal',               criterio: '±0,25 / ±0,5 / ±1 / ±2 kV' },
  { norma: 'IEC 61000-4-5',      parametro: 'Surto — Alimentação',              criterio: '±0,5 / ±1 / ±2 / ±4 kV' },
  { norma: 'IEC 61000-4-5',      parametro: 'Surto — Sinal',                    criterio: '±0,5 / ±1 / ±2 kV' },
  { norma: 'IEC 61000-4-6',      parametro: 'Imunidade Conduzida',              criterio: '1 / 3 / 10 V emf — 0,15–80 MHz' },
  { norma: 'IEC 61000-4-8',      parametro: 'Campo Magnético',                  criterio: '1–1000 A/m — 50/60 Hz' },
  { norma: 'IEC 61000-4-11',     parametro: 'Variações / Dips de Tensão',       criterio: '0% / 40% / 70% — 0,5 a 50 ciclos' },
  { norma: 'IEC 61000-4-11',     parametro: 'Interrupções de Tensão',           criterio: '0% — 250 ciclos' },
  { norma: 'CISPR 16-1-1',       parametro: 'Emissões Conduzidas',              criterio: '0,15–30 MHz — QP + Médio' },
  { norma: 'CISPR 16-1-1',       parametro: 'Emissões Radiadas',                criterio: '30–1000 MHz — QP + Médio' },
  { norma: 'IEC 61000-3-2',      parametro: 'Harmônicos de Corrente',           criterio: 'Ordens 2–40 — Classes A/B/C/D' },
  { norma: 'IEC 61000-3-3',      parametro: 'Flutuações de Tensão / Flicker',   criterio: 'Pst ≤ 1,0' },
  { norma: 'NBR ISO/IEC 17025',  parametro: 'Temperatura Ambiente',             criterio: '(23 ± 5) °C' },
  { norma: 'NBR ISO/IEC 17025',  parametro: 'Umidade Relativa',                 criterio: '(45–75) %RH' },
]

const NORMAS_UNICAS = Array.from(new Set(PARAMS_NORMATIVOS.map(p => p.norma)))

function paramKey(p: ParamNormativo) { return `${p.norma}||${p.parametro}` }

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

function emptyPonto(): PontoCal {
  return { grandeza: '', criterio: '', configuracao: '', data_registro: new Date().toISOString().slice(0, 10) }
}

export default function PlanoCalibracaoModal({ open, onClose, grandezas = [] }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { equip } = useEquipamentos()
  const [saving, setSaving] = useState(false)
  const [buscaG, setBuscaG] = useState('')

  const [equipId, setEquipId]   = useState('')
  const [equipData, setEquipData] = useState<any>(null)
  const [lab, setLab]           = useState('')
  const [escopo, setEscopo]     = useState('')
  const [selectedGrandezas, setSelectedGrandezas] = useState<string[]>([])
  const [selectedParams, setSelectedParams]       = useState<string[]>([])
  const [pontos, setPontos]     = useState<PontoCal[]>([emptyPonto()])

  function reset() {
    setEquipId(''); setEquipData(null); setLab(''); setEscopo('')
    setSelectedGrandezas([]); setSelectedParams([]); setBuscaG(''); setPontos([emptyPonto()])
  }

  async function selectEquip(id: string) {
    setEquipId(id)
    if (!id) { setEquipData(null); return }
    const { data } = await supabase
      .from('equipamentos')
      .select('tag, descricao, cal_per, cal_data, cal_val, lab_cal, tipo')
      .eq('id', id).single()
    setEquipData(data)
    if (data?.lab_cal) setLab(data.lab_cal)
  }

  function toggleGrandeza(nome: string) {
    setSelectedGrandezas(prev => prev.includes(nome) ? prev.filter(g => g !== nome) : [...prev, nome])
  }

  function toggleParam(key: string) {
    setSelectedParams(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  function updatePonto(i: number, field: keyof PontoCal, value: string) {
    setPontos(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  function addPonto()    { setPontos(prev => [...prev, emptyPonto()]) }
  function removePonto(i: number) { setPontos(prev => prev.filter((_, idx) => idx !== i)) }

  async function save() {
    if (!equipId) { alert('Selecione o equipamento.'); return }
    setSaving(true)
    const { data: labId } = await supabase.rpc('get_user_lab_id')
    const paramsObj = selectedParams.map(key => PARAMS_NORMATIVOS.find(p => paramKey(p) === key)!)
    const { error } = await supabase.from('planos_calibracao').insert({
      lab_id:            labId,
      equip_id:          equipId,
      tag:               equipData?.tag?.toUpperCase() || '',
      laboratorio:       lab || null,
      escopo:            escopo || null,
      grandezas:         selectedGrandezas,
      pontos:            pontos.filter(p => p.grandeza.trim()),
      params_normativos: paramsObj,
      periodicidade:     equipData?.cal_per || null,
      ultima:            equipData?.cal_data || null,
      proxima:           equipData?.cal_val  || null,
    })
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    reset()
    onClose()
    router.refresh()
  }

  const grandezasFiltradas = grandezas.filter(g =>
    !buscaG || g.nome.toLowerCase().includes(buscaG.toLowerCase())
  )
  const grandezasPorCat = CATEGORIAS.reduce((acc, cat) => {
    acc[cat] = grandezasFiltradas.filter(g => g.categoria === cat)
    return acc
  }, {} as Record<string, Grandeza[]>)

  const inp  = 'input'
  const inp2 = 'w-full bg-navy/60 border border-white/8 rounded px-2 py-1.5 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50'
  const sel  = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20'

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title="Novo Plano de Calibração"
      size="lg"
      footer={
        <>
          <button className="btn-secondary text-xs" onClick={() => { reset(); onClose() }}>Cancelar</button>
          <button className="btn-primary text-xs" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Plano'}
          </button>
        </>
      }
    >
      <div className="space-y-5">

        {/* ── Equipamento ── */}
        <div>
          <label className="font-mono text-[8.5px] tracking-[2px] text-gold/70 uppercase block mb-2">Equipamento *</label>
          <select className={sel} value={equipId} onChange={e => selectEquip(e.target.value)}>
            <option value="">Selecionar equipamento...</option>
            {equip.map(e => <option key={e.id} value={e.id}>{e.tag} — {e.descricao}</option>)}
          </select>
        </div>

        {/* ── Dados do equipamento (readonly) ── */}
        {equipData && (
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl border border-white/7" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="col-span-3">
              <p className="font-mono text-[8px] tracking-[2px] text-white/25 uppercase mb-2">Dados de Calibração (do cadastro do equipamento)</p>
            </div>
            {[
              { label: 'Periodicidade', value: equipData.cal_per ? `${equipData.cal_per} meses` : '—' },
              { label: 'Última Calibração', value: fmt(equipData.cal_data) },
              { label: 'Próxima Calibração', value: fmt(equipData.cal_val) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="font-mono text-[8px] text-white/25 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm text-white/70 font-medium">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Laboratório + Escopo ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[8.5px] tracking-[2px] text-white/40 uppercase block mb-1.5">Laboratório Acreditado</label>
            <input className={inp} value={lab} onChange={e => setLab(e.target.value)} placeholder="Lab que realizará a calibração" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[2px] text-white/40 uppercase block mb-1.5">Escopo / Observações</label>
            <input className={inp} value={escopo} onChange={e => setEscopo(e.target.value)} placeholder="Faixas, condições especiais..." />
          </div>
        </div>

        {/* ── Grandezas (multi-select) ── */}
        <div className="border-t border-white/7 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[8.5px] tracking-[2px] text-gold/70 uppercase">
              Grandezas a Calibrar {selectedGrandezas.length > 0 && <span className="text-white/40 ml-1">({selectedGrandezas.length})</span>}
            </span>
            {selectedGrandezas.length > 0 && (
              <button className="text-[9px] text-white/30 hover:text-white/60 font-mono" onClick={() => setSelectedGrandezas([])}>Limpar</button>
            )}
          </div>
          {selectedGrandezas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedGrandezas.map(g => (
                <span key={g} className="flex items-center gap-1 bg-gold/12 text-gold/90 font-mono text-[9px] px-2 py-1 rounded">
                  {g}<button onClick={() => toggleGrandeza(g)}><X size={9} /></button>
                </span>
              ))}
            </div>
          )}
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input className="input w-full pl-7 text-[11px] py-1.5" placeholder="Buscar grandeza..." value={buscaG} onChange={e => setBuscaG(e.target.value)} />
          </div>
          <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
            {CATEGORIAS.map(cat => {
              const lista = grandezasPorCat[cat]
              if (!lista?.length) return null
              return (
                <div key={cat}>
                  <p className="font-mono text-[8px] tracking-widest text-white/25 uppercase mb-1">{cat}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {lista.map((g, i) => {
                      const checked = selectedGrandezas.includes(g.nome)
                      return (
                        <label key={i} className={`flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 transition-colors ${checked ? 'bg-gold/10 border border-gold/20' : 'hover:bg-white/4 border border-transparent'}`}>
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-gold border-gold' : 'border-white/20'}`}>
                            {checked && <Check size={9} className="text-navy" />}
                          </div>
                          <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleGrandeza(g.nome)} />
                          <span className="text-[10px] text-white/70">{g.nome} {g.unidade && <span className="text-white/30">({g.unidade})</span>}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Parâmetros Normativos ── */}
        <div className="border-t border-white/7 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[8.5px] tracking-[2px] text-gold/70 uppercase">
              Parâmetros Normativos {selectedParams.length > 0 && <span className="text-white/40 ml-1">({selectedParams.length})</span>}
            </span>
            {selectedParams.length > 0 && (
              <button className="text-[9px] text-white/30 hover:text-white/60 font-mono" onClick={() => setSelectedParams([])}>Limpar</button>
            )}
          </div>
          <div className="max-h-52 overflow-y-auto space-y-3 pr-1">
            {NORMAS_UNICAS.map(norma => {
              const params = PARAMS_NORMATIVOS.filter(p => p.norma === norma)
              return (
                <div key={norma}>
                  <p className="font-mono text-[8px] tracking-widest text-white/25 uppercase mb-1.5">{norma}</p>
                  <div className="space-y-0.5">
                    {params.map(p => {
                      const key = paramKey(p)
                      const checked = selectedParams.includes(key)
                      return (
                        <label key={key} className={`flex items-start gap-2.5 cursor-pointer rounded px-2.5 py-2 transition-colors ${checked ? 'bg-teal/8 border border-teal/20' : 'hover:bg-white/4 border border-transparent'}`}>
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${checked ? 'bg-teal border-teal' : 'border-white/20'}`}>
                            {checked && <Check size={9} className="text-navy" />}
                          </div>
                          <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleParam(key)} />
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] text-white/80 block leading-tight">{p.parametro}</span>
                            <span className="font-mono text-[9px] text-white/30 mt-0.5 block">{p.criterio}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Pontos de calibração ── */}
        <div className="border-t border-white/7 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[8.5px] tracking-[2px] text-gold/70 uppercase">Pontos de Calibração</span>
            <button onClick={addPonto} className="flex items-center gap-1 text-[10px] font-mono text-teal/70 hover:text-teal transition-colors">
              <Plus size={11} /> Adicionar ponto
            </button>
          </div>
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                  {['GRANDEZA','CRITÉRIO','CONFIGURAÇÃO / ESPECIFICAÇÃO','DATA REG.',''].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-mono text-[7.5px] tracking-widest text-white/25 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pontos.map((p, i) => (
                  <tr key={i} className="group hover:bg-white/2">
                    <td className="px-2 py-1.5"><input value={p.grandeza} onChange={e => updatePonto(i,'grandeza',e.target.value)} className={inp2} placeholder="Ex: Tensão CA" /></td>
                    <td className="px-2 py-1.5"><input value={p.criterio} onChange={e => updatePonto(i,'criterio',e.target.value)} className={inp2} placeholder="Ex: ≤ 0.1%" /></td>
                    <td className="px-2 py-1.5"><input value={p.configuracao} onChange={e => updatePonto(i,'configuracao',e.target.value)} className={inp2} placeholder="Ex: Fonte 230V 50Hz" /></td>
                    <td className="px-2 py-1.5 w-32"><input type="date" value={p.data_registro} onChange={e => updatePonto(i,'data_registro',e.target.value)} className={inp2} /></td>
                    <td className="px-2 py-1.5 w-8">
                      <button onClick={() => removePonto(i)} className="text-white/15 hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Modal>
  )
}
