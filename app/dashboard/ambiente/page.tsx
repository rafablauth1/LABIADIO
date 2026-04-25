'use client'

import { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight, Thermometer, Droplets, Gauge, Edit2, Trash2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

type Tab = 'mensal' | 'diario' | 'medidores'

interface Medidor {
  id: string
  tipo: string
  descricao?: string
  serie?: string
  patrimonio?: string
  sala: string
  unidade: string
  limite_min?: number
  limite_max?: number
  cal_val?: string
  ativo: boolean
}

interface AmbReg {
  id: string
  data: string
  temp_max: number
  temp_min?: number
  umidade: number
  pressao?: number
  local?: string
  tecnico?: string
  obs?: string
}

interface RegForm {
  temp_max: string; temp_min: string; umidade: string; pressao: string
  local: string; tecnico: string; obs: string; data: string
}

interface MedForm {
  tipo: string; descricao: string; serie: string; patrimonio: string
  sala: string; unidade: string; limite_min: string; limite_max: string; cal_val: string
}

const TIPOS_MEDIDOR = ['Termômetro', 'Higrômetro', 'Barômetro', 'Termo-Higrômetro', 'Estação Meteorológica', 'Outro']

const UNIDADES_POR_TIPO: Record<string, string> = {
  'Termômetro': '°C', 'Higrômetro': '%RH', 'Barômetro': 'hPa',
  'Termo-Higrômetro': '°C / %RH', 'Estação Meteorológica': '—', 'Outro': '—',
}

export default function AmbientePage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('mensal')
  const [mes, setMes] = useState(0)
  const [ano, setAno] = useState(2026)
  const [registros, setRegistros] = useState<AmbReg[]>([])
  const [medidores, setMedidores] = useState<Medidor[]>([])

  // Modais
  const [openReg, setOpenReg] = useState(false)
  const [diaReg, setDiaReg] = useState(1)
  const [openMed, setOpenMed] = useState(false)
  const [editMed, setEditMed] = useState<Medidor | null>(null)
  const [savingReg, setSavingReg] = useState(false)
  const [savingMed, setSavingMed] = useState(false)

  const [reg, setReg] = useState<RegForm>({
    temp_max: '', temp_min: '', umidade: '', pressao: '', local: 'Sala EMC', tecnico: '', obs: '', data: ''
  })
  const [med, setMed] = useState<MedForm>({
    tipo: 'Termômetro', descricao: '', serie: '', patrimonio: '', sala: '', unidade: '°C', limite_min: '', limite_max: '', cal_val: ''
  })

  async function loadRegistros() {
    const mesStr = String(mes + 1).padStart(2, '0')
    const from = `${ano}-${mesStr}-01`
    const to = `${ano}-${mesStr}-31`
    const { data } = await supabase.from('ambiente_diario').select('*')
      .gte('data', from).lte('data', to).order('data')
    setRegistros(data || [])
  }

  async function loadMedidores() {
    const { data } = await supabase.from('medidores').select('*').order('sala')
    setMedidores(data || [])
  }

  useEffect(() => { loadRegistros() }, [mes, ano])
  useEffect(() => { loadMedidores() }, [])

  function getRegistroDia(dia: number): AmbReg | undefined {
    const mesStr = String(mes + 1).padStart(2, '0')
    const diaStr = String(dia).padStart(2, '0')
    const dataStr = `${ano}-${mesStr}-${diaStr}`
    return registros.find(r => r.data === dataStr)
  }

  function openRegistroDia(dia: number) {
    const mesStr = String(mes + 1).padStart(2, '0')
    const diaStr = String(dia).padStart(2, '0')
    const dataStr = `${ano}-${mesStr}-${diaStr}`
    const existing = registros.find(r => r.data === dataStr)
    setDiaReg(dia)
    setReg({
      temp_max: existing?.temp_max?.toString() || '',
      temp_min: existing?.temp_min?.toString() || '',
      umidade: existing?.umidade?.toString() || '',
      pressao: existing?.pressao?.toString() || '',
      local: existing?.local || 'Sala EMC',
      tecnico: existing?.tecnico || '',
      obs: existing?.obs || '',
      data: dataStr,
    })
    setOpenReg(true)
  }

  async function saveRegistro() {
    if (!reg.temp_max || !reg.umidade) { alert('Preencha temperatura máxima e umidade.'); return }
    setSavingReg(true)
    const mesStr = String(mes + 1).padStart(2, '0')
    const diaStr = String(diaReg).padStart(2, '0')
    const dataStr = `${ano}-${mesStr}-${diaStr}`
    const payload = {
      data: dataStr,
      temp_max: parseFloat(reg.temp_max),
      temp_min: reg.temp_min ? parseFloat(reg.temp_min) : null,
      umidade: parseFloat(reg.umidade),
      pressao: reg.pressao ? parseFloat(reg.pressao) : null,
      local: reg.local || null,
      tecnico: reg.tecnico || null,
      obs: reg.obs || null,
    }
    const existing = getRegistroDia(diaReg)
    if (existing?.id) {
      await supabase.from('ambiente_diario').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('ambiente_diario').insert(payload)
    }
    setSavingReg(false)
    setOpenReg(false)
    loadRegistros()
  }

  function openNewMedidor() {
    setEditMed(null)
    setMed({ tipo: 'Termômetro', descricao: '', serie: '', patrimonio: '', sala: '', unidade: '°C', limite_min: '', limite_max: '', cal_val: '' })
    setOpenMed(true)
  }

  function openEditMedidor(m: Medidor) {
    setEditMed(m)
    setMed({
      tipo: m.tipo, descricao: m.descricao || '', serie: m.serie || '',
      patrimonio: m.patrimonio || '', sala: m.sala || '', unidade: m.unidade || '',
      limite_min: m.limite_min?.toString() || '', limite_max: m.limite_max?.toString() || '',
      cal_val: m.cal_val || '',
    })
    setOpenMed(true)
  }

  async function saveMedidor() {
    if (!med.tipo || !med.sala) { alert('Preencha tipo e sala.'); return }
    setSavingMed(true)
    const payload = {
      tipo: med.tipo, descricao: med.descricao || null, serie: med.serie || null,
      patrimonio: med.patrimonio || null, sala: med.sala,
      unidade: med.unidade || null,
      limite_min: med.limite_min ? parseFloat(med.limite_min) : null,
      limite_max: med.limite_max ? parseFloat(med.limite_max) : null,
      cal_val: med.cal_val || null,
      ativo: true,
    }
    if (editMed?.id) {
      await supabase.from('medidores').update(payload).eq('id', editMed.id)
    } else {
      await supabase.from('medidores').insert(payload)
    }
    setSavingMed(false)
    setOpenMed(false)
    loadMedidores()
  }

  async function deleteMedidor(id: string) {
    if (!confirm('Remover este medidor?')) return
    await supabase.from('medidores').delete().eq('id', id)
    loadMedidores()
  }

  const tipoIcon = (tipo: string) => {
    if (tipo.toLowerCase().includes('termo')) return <Thermometer size={13} className="text-orange-400" />
    if (tipo.toLowerCase().includes('higro')) return <Droplets size={13} className="text-blue-400" />
    if (tipo.toLowerCase().includes('baro') || tipo.toLowerCase().includes('pressão')) return <Gauge size={13} className="text-purple-400" />
    return <Gauge size={13} className="text-white/40" />
  }

  const inp = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors'

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Análise</p>
          <h1 className="font-display font-bold text-2xl text-white">Condições Ambientais</h1>
        </div>
        <button className="btn-primary text-xs" onClick={tab === 'medidores' ? openNewMedidor : () => openRegistroDia(new Date().getDate())}>
          <Plus size={13} /> {tab === 'medidores' ? 'Cadastrar Medidor' : 'Novo Registro'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-white/7">
        {([
          { key: 'mensal', label: 'Planilha Mensal' },
          { key: 'diario', label: 'Controle Diário' },
          { key: 'medidores', label: 'Medidores' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key ? 'border-gold text-gold' : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* Seletor de mês/ano (tabs mensal e diario) */}
      {tab !== 'medidores' && (
        <div className="card px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          {/* Navegação de ano */}
          <div className="flex items-center gap-2">
            <button onClick={() => setAno(a => a - 1)} className="p-1 text-white/40 hover:text-white transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="font-mono text-[11px] text-white/70 w-12 text-center">{ano}</span>
            <button onClick={() => setAno(a => a + 1)} className="p-1 text-white/40 hover:text-white transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="w-px bg-white/8 self-stretch" />
          {/* Seletor de mês */}
          <div className="flex flex-wrap gap-1">
            {MESES.map((m, i) => (
              <button key={m} onClick={() => setMes(i)}
                className={`font-mono text-[9px] px-2 py-1 rounded transition-colors ${
                  i === mes ? 'bg-gold/20 text-gold' : 'text-white/30 hover:text-white/60'
                }`}
              >{m}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── Planilha Mensal ─────────────────────────────────────────────────── */}
      {tab === 'mensal' && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/7">
            <h2 className="font-display font-bold text-sm text-white">
              {MESES_FULL[mes]} / {ano}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="border-b border-white/7 bg-navy">
                  {['DIA', 'TEMP. MÁX (°C)', 'TEMP. MÍN (°C)', 'UMID. (%RH)', 'PRESSÃO (hPa)', 'OPERADOR', 'OBS.', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(dia => {
                  const r = getRegistroDia(dia)
                  return (
                    <tr key={dia} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-2 font-mono text-[10px] text-white/50">{String(dia).padStart(2,'0')}</td>
                      <td className="px-4 py-2 font-mono text-[11px] text-white/70">{r?.temp_max ?? <span className="text-white/15">—</span>}</td>
                      <td className="px-4 py-2 font-mono text-[11px] text-white/70">{r?.temp_min ?? <span className="text-white/15">—</span>}</td>
                      <td className="px-4 py-2 font-mono text-[11px] text-white/70">{r?.umidade ?? <span className="text-white/15">—</span>}</td>
                      <td className="px-4 py-2 font-mono text-[11px] text-white/70">{r?.pressao ?? <span className="text-white/15">—</span>}</td>
                      <td className="px-4 py-2 text-white/50 text-[11px]">{r?.tecnico ?? <span className="text-white/15">—</span>}</td>
                      <td className="px-4 py-2 text-white/40 text-[10px] max-w-[100px] truncate">{r?.obs ?? <span className="text-white/15">—</span>}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => openRegistroDia(dia)}
                          className="text-white/20 hover:text-teal transition-colors font-mono text-[10px]"
                        >
                          {r ? 'Editar' : '+ Reg.'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Controle Diário (Calendário) ────────────────────────────────────── */}
      {tab === 'diario' && (
        <div className="card">
          <div className="px-4 py-3 border-b border-white/7">
            <h2 className="font-display font-bold text-sm text-white">
              Controle Diário · {MESES_FULL[mes]} {ano}
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                <div key={d} className="text-center font-mono text-[8px] text-white/30 tracking-wider uppercase py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }, (_, i) => {
                const day = i - new Date(ano, mes, 1).getDay() + 1
                const valid = day >= 1 && day <= 31
                const r = valid ? getRegistroDia(day) : undefined
                return (
                  <div
                    key={i}
                    onClick={() => valid && openRegistroDia(day)}
                    className={`rounded-lg border p-2 min-h-[64px] text-center transition-colors ${
                      valid
                        ? r
                          ? 'border-teal/30 bg-teal/5 hover:border-teal/50 cursor-pointer'
                          : 'border-white/7 hover:border-white/20 cursor-pointer'
                        : 'border-transparent opacity-0 pointer-events-none'
                    }`}
                  >
                    {valid && (
                      <>
                        <p className="font-mono text-[10px] text-white/40 mb-1">{day}</p>
                        {r ? (
                          <div className="space-y-0.5">
                            <p className="text-[9px] text-teal font-mono">{r.temp_max}°C</p>
                            <p className="text-[9px] text-blue-400 font-mono">{r.umidade}%</p>
                          </div>
                        ) : (
                          <p className="text-[9px] text-white/15">—</p>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Medidores ────────────────────────────────────────────────────────── */}
      {tab === 'medidores' && (
        <div className="card overflow-hidden">
          {medidores.length === 0 ? (
            <div className="px-4 py-12 text-center text-white/25 italic text-sm">
              Nenhum medidor cadastrado.{' '}
              <button className="text-teal hover:text-teal/80 not-italic" onClick={openNewMedidor}>
                Cadastrar o primeiro.
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/7 bg-navy">
                    {['INSTRUMENTO','DESCRIÇÃO / S/N','SALA','GRANDEZA','LIMITES','VALIDADE CAL.',''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {medidores.map(m => {
                    const calVencida = m.cal_val && new Date(m.cal_val) < new Date()
                    return (
                      <tr key={m.id} className="hover:bg-white/3 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {tipoIcon(m.tipo)}
                            <span className="text-white/80">{m.tipo}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-white/70">{m.descricao || '—'}</p>
                          {m.serie && <p className="text-[10px] text-white/35 font-mono">S/N: {m.serie}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-white/60">{m.sala}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{m.unidade}</td>
                        <td className="px-4 py-2.5">
                          {(m.limite_min != null || m.limite_max != null) ? (
                            <span className="font-mono text-[10px] text-white/60">
                              {m.limite_min ?? '—'} ~ {m.limite_max ?? '—'} {m.unidade}
                            </span>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {m.cal_val ? (
                            <span className={`flex items-center gap-1 font-mono text-[10px] ${calVencida ? 'text-danger' : 'text-white/50'}`}>
                              {calVencida && <AlertTriangle size={10} />}
                              {m.cal_val ? m.cal_val.slice(8,10)+'/'+m.cal_val.slice(5,7)+'/'+m.cal_val.slice(0,4) : ''}
                            </span>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditMedidor(m)} className="text-white/25 hover:text-accent transition-colors">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => deleteMedidor(m.id)} className="text-white/25 hover:text-danger transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Registro Diário ───────────────────────────────────────────── */}
      <Modal
        open={openReg}
        onClose={() => setOpenReg(false)}
        title={`Registrar — ${String(diaReg).padStart(2,'0')}/${String(mes+1).padStart(2,'0')}/${ano}`}
        footer={
          <>
            <button className="btn-secondary text-xs" onClick={() => setOpenReg(false)}>Cancelar</button>
            <button className="btn-primary text-xs" onClick={saveRegistro} disabled={savingReg}>
              {savingReg ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Temp. Máx. (°C) *</label>
            <input className={inp} type="number" step="0.1" value={reg.temp_max} onChange={e => setReg(p => ({ ...p, temp_max: e.target.value }))} placeholder="25.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Temp. Mín. (°C)</label>
            <input className={inp} type="number" step="0.1" value={reg.temp_min} onChange={e => setReg(p => ({ ...p, temp_min: e.target.value }))} placeholder="18.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Umidade (%RH) *</label>
            <input className={inp} type="number" step="0.1" value={reg.umidade} onChange={e => setReg(p => ({ ...p, umidade: e.target.value }))} placeholder="55.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Pressão (hPa)</label>
            <input className={inp} type="number" step="0.1" value={reg.pressao} onChange={e => setReg(p => ({ ...p, pressao: e.target.value }))} placeholder="1013.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Sala / Local</label>
            <input className={inp} value={reg.local} onChange={e => setReg(p => ({ ...p, local: e.target.value }))} placeholder="Sala EMC" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Operador</label>
            <input className={inp} value={reg.tecnico} onChange={e => setReg(p => ({ ...p, tecnico: e.target.value }))} placeholder="Nome..." />
          </div>
          <div className="col-span-2">
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Observações</label>
            <textarea className={inp} rows={2} value={reg.obs} onChange={e => setReg(p => ({ ...p, obs: e.target.value }))} placeholder="..." />
          </div>
        </div>
      </Modal>

      {/* ── Modal: Cadastro de Medidor ───────────────────────────────────────── */}
      <Modal
        open={openMed}
        onClose={() => setOpenMed(false)}
        title={editMed ? 'Editar Medidor' : 'Cadastrar Medidor'}
        footer={
          <>
            <button className="btn-secondary text-xs" onClick={() => setOpenMed(false)}>Cancelar</button>
            <button className="btn-primary text-xs" onClick={saveMedidor} disabled={savingMed}>
              {savingMed ? 'Salvando...' : editMed ? 'Atualizar' : 'Cadastrar'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Tipo *</label>
            <select
              className={inp}
              value={med.tipo}
              onChange={e => setMed(p => ({ ...p, tipo: e.target.value, unidade: UNIDADES_POR_TIPO[e.target.value] || '' }))}
            >
              {TIPOS_MEDIDOR.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Unidade</label>
            <input className={inp} value={med.unidade} onChange={e => setMed(p => ({ ...p, unidade: e.target.value }))} placeholder="°C, %RH, hPa..." />
          </div>
          <div className="col-span-2">
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Descrição / Modelo</label>
            <input className={inp} value={med.descricao} onChange={e => setMed(p => ({ ...p, descricao: e.target.value }))} placeholder="Fabricante, modelo..." />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Nº Série</label>
            <input className={inp} value={med.serie} onChange={e => setMed(p => ({ ...p, serie: e.target.value }))} placeholder="S/N" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Patrimônio</label>
            <input className={inp} value={med.patrimonio} onChange={e => setMed(p => ({ ...p, patrimonio: e.target.value }))} placeholder="Nº patrimônio" />
          </div>
          <div className="col-span-2">
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Sala / Local de Controle *</label>
            <input className={inp} value={med.sala} onChange={e => setMed(p => ({ ...p, sala: e.target.value }))} placeholder="Ex: Sala EMC, Câmara Climática..." />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Limite Mínimo</label>
            <input className={inp} type="number" step="0.1" value={med.limite_min} onChange={e => setMed(p => ({ ...p, limite_min: e.target.value }))} placeholder="Ex: 15.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Limite Máximo</label>
            <input className={inp} type="number" step="0.1" value={med.limite_max} onChange={e => setMed(p => ({ ...p, limite_max: e.target.value }))} placeholder="Ex: 35.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Validade da Calibração</label>
            <input type="date" className={inp} value={med.cal_val} onChange={e => setMed(p => ({ ...p, cal_val: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
