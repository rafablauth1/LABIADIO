'use client'

import { useState, useEffect } from 'react'
import { Save, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEquipamentos } from '@/lib/hooks/useEquipamentos'
import ITCHKModal from '@/components/modals/ITCHKModal'

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

export default function RealizarChecagemPage() {
  const supabase = createClient()
  const { equip } = useEquipamentos()
  const [equipId, setEquipId] = useState('')
  const [openITCHK, setOpenITCHK] = useState(false)
  const [data, setData] = useState('')
  const [tecnico, setTecnico] = useState('')
  const [temp, setTemp] = useState('')
  const [umid, setUmid] = useState('')
  const [norma, setNorma] = useState('')
  const [resultado, setResultado] = useState('Conforme')
  const [obs, setObs] = useState('')
  const [historico, setHistorico] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const equipSel = equip.find(e => e.id === equipId)

  useEffect(() => {
    if (!equipId) { setHistorico([]); return }
    supabase.from('checagens').select('*').eq('equip_id', equipId)
      .order('data', { ascending: false }).limit(20)
      .then(({ data }) => setHistorico(data || []))
  }, [equipId])

  async function salvar() {
    if (!equipId) { alert('Selecione um equipamento.'); return }
    if (!data) { alert('Informe a data.'); return }
    setSaving(true)
    const { error } = await supabase.from('checagens').insert({
      equip_id: equipId, norma: norma || null, data,
      tecnico: tecnico || null,
      temperatura: temp ? parseFloat(temp) : null,
      umidade: umid ? parseFloat(umid) : null,
      resultado, obs: obs || null,
    })
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    const { data: h } = await supabase.from('checagens').select('*')
      .eq('equip_id', equipId).order('data', { ascending: false }).limit(20)
    setHistorico(h || [])
    setObs('')
  }

  const inp = 'w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50'

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Checagens</p>
          <h1 className="font-display font-bold text-2xl text-white">Realizar Checagem</h1>
          <p className="text-white/40 text-sm mt-1">Planilha por Equipamento · Cálculo Automático</p>
        </div>
        <button className="btn-secondary text-xs" onClick={() => setOpenITCHK(true)}>
          <FileText size={13} /> Carregar IT CHK
        </button>
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-4 items-start">
        <div className="card p-4 flex flex-col gap-3">
          <p className="font-display font-bold text-xs text-white/60 uppercase tracking-widest mb-1">Seleção</p>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Equipamento</label>
            <select value={equipId} onChange={e => setEquipId(e.target.value)} className={inp}>
              <option value="">Selecione...</option>
              {equip.map(e => <option key={e.id} value={e.id}>{e.tag} — {e.descricao}</option>)}
            </select>
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Norma</label>
            <input value={norma} onChange={e => setNorma(e.target.value)} placeholder="Ex: IEC 61000-4-2" className={inp} />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Técnico</label>
            <input value={tecnico} onChange={e => setTecnico(e.target.value)} placeholder="Nome" className={inp} />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Temperatura (°C)</label>
            <input type="number" step="0.1" value={temp} onChange={e => setTemp(e.target.value)} placeholder="23.0" className={inp} />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Umidade (%RH)</label>
            <input type="number" step="0.1" value={umid} onChange={e => setUmid(e.target.value)} placeholder="50.0" className={inp} />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Resultado</label>
            <select value={resultado} onChange={e => setResultado(e.target.value)} className={inp}>
              <option>Conforme</option>
              <option>Não conforme</option>
              <option>Parcialmente conforme</option>
            </select>
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Observações</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} className={inp} placeholder="..." />
          </div>
          <button className="btn-primary text-xs w-full mt-1" onClick={salvar} disabled={saving}>
            <Save size={13} /> {saving ? 'Salvando...' : 'Salvar Checagem'}
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="px-4 py-3 border-b border-white/7 flex items-center justify-between">
              <h2 className="font-display font-bold text-sm text-white">Equipamento Selecionado</h2>
              {equipSel && <span className={`badge text-[9px] ${equipSel.status === 'ativo' ? 'badge-success' : equipSel.status === 'calibrar' ? 'badge-warning' : 'badge-danger'}`}>{equipSel.status}</span>}
            </div>
            {equipSel ? (
              <div className="px-4 py-3 flex gap-6">
                <div><p className="font-mono text-[8px] text-white/30 uppercase tracking-wider mb-1">TAG</p><span className="tag-chip">{equipSel.tag}</span></div>
                <div><p className="font-mono text-[8px] text-white/30 uppercase tracking-wider mb-1">Descrição</p><p className="text-sm text-white/80">{equipSel.descricao}</p></div>
              </div>
            ) : (
              <div className="px-4 py-10 text-center text-white/25 text-sm italic">Selecione um equipamento</div>
            )}
          </div>

          <div className="card">
            <div className="px-4 py-3 border-b border-white/7">
              <h2 className="font-display font-bold text-sm text-white">Histórico de Checagens</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/7 bg-navy">
                    {['DATA','NORMA','TÉCNICO','RESULTADO','TEMP','UMID'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historico.map(h => (
                    <tr key={h.id} className="hover:bg-white/3">
                      <td className="px-4 py-2 font-mono text-[10px] text-white/50">{fmt(h.data)}</td>
                      <td className="px-4 py-2 text-white/50 text-[10px]">{h.norma || '—'}</td>
                      <td className="px-4 py-2 text-white/50 text-[10px]">{h.tecnico || '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`badge text-[9px] ${h.resultado === 'Conforme' ? 'badge-success' : h.resultado === 'Não conforme' ? 'badge-danger' : 'badge-warning'}`}>{h.resultado}</span>
                      </td>
                      <td className="px-4 py-2 font-mono text-[10px] text-white/40">{h.temperatura ?? '—'}</td>
                      <td className="px-4 py-2 font-mono text-[10px] text-white/40">{h.umidade ?? '—'}</td>
                    </tr>
                  ))}
                  {historico.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-white/25 italic text-sm">Nenhum histórico registrado</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ITCHKModal open={openITCHK} onClose={() => setOpenITCHK(false)} />
    </div>
  )
}
