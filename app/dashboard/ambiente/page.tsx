'use client'

import { useState, useEffect } from 'react'
import {
  Plus, ChevronLeft, ChevronRight, Thermometer, Droplets,
  Edit2, Trash2, AlertTriangle, Building2, CheckCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'

const MESES     = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

type Tab = 'mensal' | 'diario' | 'instalacoes'

interface Instalacao {
  id: string; lab_id: string
  predio?: string; bloco?: string; sala: string; area?: string
  equip_id?: string; equip?: { tag: string; descricao: string }
  temp_min?: number; temp_max?: number
  umid_min?: number; umid_max?: number
  ativo: boolean
}

interface AmbReg {
  id: string; data: string; instalacao_id?: string
  temp_max?: number; temp_min?: number
  umidade?: number; pressao?: number
  tecnico?: string; obs?: string
}

const EMPTY_INST = { predio: '', bloco: '', sala: '', area: '', equip_id: '', temp_min: '', temp_max: '', umid_min: '', umid_max: '' }
const EMPTY_REG  = { temp_max: '', temp_min: '', umidade: '', pressao: '', tecnico: '', obs: '' }

function fmtLimite(val: number | undefined | null, suffix = '') {
  return val != null ? `${val}${suffix}` : '—'
}

function outOfRange(val: number | undefined, min: number | undefined, max: number | undefined) {
  if (val == null) return false
  if (min != null && val < min) return true
  if (max != null && val > max) return true
  return false
}

export default function AmbientePage() {
  const supabase = createClient()

  const [tab, setTab]       = useState<Tab>('mensal')
  const [mes, setMes]       = useState(new Date().getMonth())
  const [ano, setAno]       = useState(new Date().getFullYear())
  const [salaFiltro, setSalaFiltro] = useState<string>('')   // instalacao_id ou ''

  const [instalacoes, setInstalacoes] = useState<Instalacao[]>([])
  const [equipamentos, setEquipamentos] = useState<any[]>([])
  const [registros, setRegistros]   = useState<AmbReg[]>([])

  // Modal instalação
  const [openInst, setOpenInst] = useState(false)
  const [editInst, setEditInst] = useState<Instalacao | null>(null)
  const [savingInst, setSavingInst] = useState(false)
  const [instF, setInstF] = useState({ ...EMPTY_INST })

  // Modal registro
  const [openReg, setOpenReg]   = useState(false)
  const [diaReg, setDiaReg]     = useState(1)
  const [savingReg, setSavingReg] = useState(false)
  const [regF, setRegF] = useState({ ...EMPTY_REG })

  // carrega
  async function loadInstalacoes() {
    const { data } = await supabase
      .from('instalacoes')
      .select('*, equip:equip_id(tag, descricao)')
      .order('sala')
    setInstalacoes(data || [])
  }

  async function loadEquipamentos() {
    const { data } = await supabase
      .from('equipamentos')
      .select('id, tag, descricao, tipo')
      .ilike('tipo', '%termo%')
      .order('tag')
    // também busca higrômetros
    const { data: h } = await supabase
      .from('equipamentos')
      .select('id, tag, descricao, tipo')
      .ilike('tipo', '%higro%')
      .order('tag')
    const merged = [...(data || []), ...(h || [])]
    const unique = merged.filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i)
    setEquipamentos(unique)
  }

  async function loadRegistros() {
    const mesStr = String(mes + 1).padStart(2, '0')
    const from   = `${ano}-${mesStr}-01`
    const to     = `${ano}-${mesStr}-31`
    let q = supabase.from('ambiente_diario').select('*').gte('data', from).lte('data', to).order('data')
    if (salaFiltro) q = q.eq('instalacao_id', salaFiltro)
    const { data } = await q
    setRegistros(data || [])
  }

  useEffect(() => { loadInstalacoes(); loadEquipamentos() }, [])
  useEffect(() => { loadRegistros() }, [mes, ano, salaFiltro])

  function getRegistroDia(dia: number): AmbReg | undefined {
    const mesStr = String(mes + 1).padStart(2, '0')
    const diaStr = String(dia).padStart(2, '0')
    return registros.find(r => r.data === `${ano}-${mesStr}-${diaStr}`)
  }

  function instSelecionada(): Instalacao | undefined {
    return instalacoes.find(i => i.id === salaFiltro)
  }

  // ── Modal Registro ────────────────────────────────────────────────
  function openRegistroDia(dia: number) {
    const mesStr = String(mes + 1).padStart(2, '0')
    const diaStr = String(dia).padStart(2, '0')
    const existing = registros.find(r => r.data === `${ano}-${mesStr}-${diaStr}`)
    setDiaReg(dia)
    setRegF({
      temp_max: existing?.temp_max?.toString() || '',
      temp_min: existing?.temp_min?.toString() || '',
      umidade:  existing?.umidade?.toString()  || '',
      pressao:  existing?.pressao?.toString()  || '',
      tecnico:  existing?.tecnico || '',
      obs:      existing?.obs     || '',
    })
    setOpenReg(true)
  }

  async function saveRegistro() {
    if (!regF.temp_max || !regF.temp_min || !regF.umidade) {
      alert('Preencha temperatura máxima, mínima e umidade.'); return
    }
    if (!salaFiltro) { alert('Selecione uma sala antes de registrar.'); return }
    setSavingReg(true)
    const { data: labId } = await supabase.rpc('get_user_lab_id')
    const mesStr = String(mes + 1).padStart(2, '0')
    const diaStr = String(diaReg).padStart(2, '0')
    const dataStr = `${ano}-${mesStr}-${diaStr}`
    const payload = {
      lab_id:        labId,
      instalacao_id: salaFiltro,
      data:          dataStr,
      temp_max:  parseFloat(regF.temp_max),
      temp_min:  parseFloat(regF.temp_min),
      umidade:   parseFloat(regF.umidade),
      pressao:   regF.pressao ? parseFloat(regF.pressao) : null,
      tecnico:   regF.tecnico || null,
      obs:       regF.obs     || null,
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

  // ── Modal Instalação ──────────────────────────────────────────────
  function openNovaInstalacao() {
    setEditInst(null)
    setInstF({ ...EMPTY_INST })
    setOpenInst(true)
  }

  function openEditInstalacao(inst: Instalacao) {
    setEditInst(inst)
    setInstF({
      predio:   inst.predio   || '',
      bloco:    inst.bloco    || '',
      sala:     inst.sala,
      area:     inst.area     || '',
      equip_id: inst.equip_id || '',
      temp_min: inst.temp_min?.toString() || '',
      temp_max: inst.temp_max?.toString() || '',
      umid_min: inst.umid_min?.toString() || '',
      umid_max: inst.umid_max?.toString() || '',
    })
    setOpenInst(true)
  }

  async function saveInstalacao() {
    if (!instF.sala) { alert('O campo Sala é obrigatório.'); return }
    setSavingInst(true)
    const { data: labId } = await supabase.rpc('get_user_lab_id')
    const payload = {
      lab_id:   labId,
      predio:   instF.predio   || null,
      bloco:    instF.bloco    || null,
      sala:     instF.sala,
      area:     instF.area     || null,
      equip_id: instF.equip_id || null,
      temp_min: instF.temp_min ? parseFloat(instF.temp_min) : null,
      temp_max: instF.temp_max ? parseFloat(instF.temp_max) : null,
      umid_min: instF.umid_min ? parseFloat(instF.umid_min) : null,
      umid_max: instF.umid_max ? parseFloat(instF.umid_max) : null,
      ativo:    true,
    }
    if (editInst?.id) {
      await supabase.from('instalacoes').update(payload).eq('id', editInst.id)
    } else {
      await supabase.from('instalacoes').insert(payload)
    }
    setSavingInst(false)
    setOpenInst(false)
    loadInstalacoes()
  }

  async function deleteInstalacao(id: string) {
    if (!confirm('Remover esta instalação? Os registros ambientais vinculados serão mantidos.')) return
    await supabase.from('instalacoes').delete().eq('id', id)
    if (salaFiltro === id) setSalaFiltro('')
    loadInstalacoes()
  }

  // helpers visuais
  const inst = instSelecionada()
  const inp  = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors'
  const sel  = inp

  function nomeSala(inst: Instalacao) {
    const partes = [inst.predio, inst.bloco, inst.sala, inst.area].filter(Boolean)
    return partes.join(' › ')
  }

  return (
    <div>
      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Análise</p>
          <h1 className="font-display font-bold text-2xl text-white">Condições Ambientais</h1>
        </div>
        <div className="flex items-center gap-2">
          {tab !== 'instalacoes' && salaFiltro && (
            <button className="btn-primary text-xs" onClick={() => openRegistroDia(new Date().getDate())}>
              <Plus size={13} /> Novo Registro
            </button>
          )}
          {tab === 'instalacoes' && (
            <button className="btn-primary text-xs" onClick={openNovaInstalacao}>
              <Plus size={13} /> Cadastrar Instalação
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 border-b border-white/7">
        {([
          { key: 'mensal',      label: 'Planilha Mensal' },
          { key: 'diario',      label: 'Controle Diário' },
          { key: 'instalacoes', label: 'Instalações' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key ? 'border-gold text-gold' : 'border-transparent text-white/40 hover:text-white/70'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* ── Filtro de sala + mês/ano ──────────────────────────────── */}
      {tab !== 'instalacoes' && (
        <div className="card px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          {/* Sala */}
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <Building2 size={14} className="text-white/30 flex-shrink-0" />
            <select
              className="bg-transparent border-none text-sm text-white focus:outline-none flex-1 cursor-pointer"
              value={salaFiltro}
              onChange={e => setSalaFiltro(e.target.value)}
            >
              <option value="">— Selecione uma sala —</option>
              {instalacoes.map(i => (
                <option key={i.id} value={i.id}>{nomeSala(i)}</option>
              ))}
            </select>
          </div>

          {/* Limites da sala selecionada */}
          {inst && (
            <>
              <div className="w-px bg-white/8 self-stretch" />
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="text-white/30">Limites:</span>
                <span className="flex items-center gap-1 text-orange-400">
                  <Thermometer size={11} />
                  {fmtLimite(inst.temp_min, '°C')} ~ {fmtLimite(inst.temp_max, '°C')}
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <Droplets size={11} />
                  {fmtLimite(inst.umid_min, '%')} ~ {fmtLimite(inst.umid_max, '%')}
                </span>
              </div>
            </>
          )}

          <div className="w-px bg-white/8 self-stretch" />

          {/* Navegação ano/mês */}
          <div className="flex items-center gap-2">
            <button onClick={() => setAno(a => a - 1)} className="p-1 text-white/40 hover:text-white transition-colors"><ChevronLeft size={14} /></button>
            <span className="font-mono text-[11px] text-white/70 w-12 text-center">{ano}</span>
            <button onClick={() => setAno(a => a + 1)} className="p-1 text-white/40 hover:text-white transition-colors"><ChevronRight size={14} /></button>
          </div>
          <div className="flex flex-wrap gap-1">
            {MESES.map((m, i) => (
              <button key={m} onClick={() => setMes(i)}
                className={`font-mono text-[9px] px-2 py-1 rounded transition-colors ${
                  i === mes ? 'bg-gold/20 text-gold' : 'text-white/30 hover:text-white/60'
                }`}>{m}</button>
            ))}
          </div>
        </div>
      )}

      {/* aviso sem sala selecionada */}
      {tab !== 'instalacoes' && !salaFiltro && (
        <div className="card py-12 flex flex-col items-center gap-2 text-white/25">
          <Building2 size={28} className="opacity-40" />
          <p className="text-sm">Selecione uma sala para visualizar e registrar dados</p>
          {instalacoes.length === 0 && (
            <button onClick={() => setTab('instalacoes')} className="text-teal text-xs hover:text-teal/80 mt-1">
              Cadastrar primeira instalação →
            </button>
          )}
        </div>
      )}

      {/* ── Planilha Mensal ─────────────────────────────────────── */}
      {tab === 'mensal' && salaFiltro && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/7 flex items-center justify-between">
            <h2 className="font-display font-bold text-sm text-white">{MESES_FULL[mes]} / {ano}</h2>
            {inst && <span className="font-mono text-[9px] text-white/35">{nomeSala(inst)}</span>}
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
                  const tMaxOut = r && outOfRange(r.temp_max, inst?.temp_min, inst?.temp_max)
                  const tMinOut = r && outOfRange(r.temp_min, inst?.temp_min, inst?.temp_max)
                  const uOut    = r && outOfRange(r.umidade,  inst?.umid_min, inst?.umid_max)
                  return (
                    <tr key={dia} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-2 font-mono text-[10px] text-white/50">{String(dia).padStart(2,'0')}</td>
                      <td className={`px-4 py-2 font-mono text-[11px] ${tMaxOut ? 'text-danger font-bold' : 'text-white/70'}`}>
                        {r?.temp_max != null ? r.temp_max : <span className="text-white/15">—</span>}
                        {tMaxOut && <AlertTriangle size={9} className="inline ml-1" />}
                      </td>
                      <td className={`px-4 py-2 font-mono text-[11px] ${tMinOut ? 'text-danger font-bold' : 'text-white/70'}`}>
                        {r?.temp_min != null ? r.temp_min : <span className="text-white/15">—</span>}
                        {tMinOut && <AlertTriangle size={9} className="inline ml-1" />}
                      </td>
                      <td className={`px-4 py-2 font-mono text-[11px] ${uOut ? 'text-warning font-bold' : 'text-white/70'}`}>
                        {r?.umidade != null ? r.umidade : <span className="text-white/15">—</span>}
                        {uOut && <AlertTriangle size={9} className="inline ml-1" />}
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-white/60">{r?.pressao ?? <span className="text-white/15">—</span>}</td>
                      <td className="px-4 py-2 text-white/50 text-[11px]">{r?.tecnico ?? <span className="text-white/15">—</span>}</td>
                      <td className="px-4 py-2 text-white/40 text-[10px] max-w-[100px] truncate">{r?.obs ?? <span className="text-white/15">—</span>}</td>
                      <td className="px-4 py-2">
                        <button onClick={() => openRegistroDia(dia)} className="text-white/20 hover:text-teal transition-colors font-mono text-[10px]">
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

      {/* ── Controle Diário ─────────────────────────────────────── */}
      {tab === 'diario' && salaFiltro && (
        <div className="card">
          <div className="px-4 py-3 border-b border-white/7 flex items-center justify-between">
            <h2 className="font-display font-bold text-sm text-white">
              {MESES_FULL[mes]} {ano}
            </h2>
            {inst && <span className="font-mono text-[9px] text-white/35">{nomeSala(inst)}</span>}
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
                const hasAlert = r && (
                  outOfRange(r.temp_max, inst?.temp_min, inst?.temp_max) ||
                  outOfRange(r.temp_min, inst?.temp_min, inst?.temp_max) ||
                  outOfRange(r.umidade,  inst?.umid_min, inst?.umid_max)
                )
                return (
                  <div key={i} onClick={() => valid && openRegistroDia(day)}
                    className={`rounded-lg border p-2 min-h-[68px] text-center transition-colors ${
                      valid
                        ? hasAlert
                          ? 'border-danger/40 bg-danger/5 hover:border-danger/60 cursor-pointer'
                          : r
                            ? 'border-teal/30 bg-teal/5 hover:border-teal/50 cursor-pointer'
                            : 'border-white/7 hover:border-white/20 cursor-pointer'
                        : 'border-transparent opacity-0 pointer-events-none'
                    }`}>
                    {valid && (
                      <>
                        <p className="font-mono text-[10px] text-white/40 mb-1">{day}</p>
                        {r ? (
                          <div className="space-y-0.5">
                            {hasAlert && <AlertTriangle size={9} className="text-danger mx-auto mb-0.5" />}
                            <p className="text-[9px] text-teal font-mono">{r.temp_max}°C</p>
                            <p className="text-[9px] text-blue-400 font-mono">{r.umidade}%</p>
                          </div>
                        ) : <p className="text-[9px] text-white/15 mt-2">—</p>}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Instalações ─────────────────────────────────────────── */}
      {tab === 'instalacoes' && (
        <div className="card overflow-hidden">
          {instalacoes.length === 0 ? (
            <div className="px-4 py-12 text-center text-white/25 italic text-sm">
              Nenhuma instalação cadastrada.{' '}
              <button className="text-teal hover:text-teal/80 not-italic" onClick={openNovaInstalacao}>
                Cadastrar a primeira.
              </button>
            </div>
          ) : (
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="border-b border-white/7 bg-navy">
                  {['LOCALIZAÇÃO', 'ÁREA', 'TERMOHIGRÔMETRO', 'LIMITE TEMP.', 'LIMITE UMIDADE', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {instalacoes.map(inst => (
                  <tr key={inst.id} className="hover:bg-white/3 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="text-white/85 font-medium">{inst.sala}</p>
                      {(inst.predio || inst.bloco) && (
                        <p className="text-[10px] text-white/35 font-mono mt-0.5">
                          {[inst.predio, inst.bloco].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-[10px]">{inst.area || '—'}</td>
                    <td className="px-4 py-3">
                      {inst.equip ? (
                        <div>
                          <span className="tag-chip text-[9px]">{(inst.equip as any).tag}</span>
                          <p className="text-[10px] text-white/40 mt-0.5">{(inst.equip as any).descricao}</p>
                        </div>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px]">
                      {(inst.temp_min != null || inst.temp_max != null) ? (
                        <span className="text-orange-400">
                          {fmtLimite(inst.temp_min, '°C')} ~ {fmtLimite(inst.temp_max, '°C')}
                        </span>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px]">
                      {(inst.umid_min != null || inst.umid_max != null) ? (
                        <span className="text-blue-400">
                          {fmtLimite(inst.umid_min, '%')} ~ {fmtLimite(inst.umid_max, '%')}
                        </span>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditInstalacao(inst)} className="text-white/25 hover:text-gold transition-colors"><Edit2 size={12} /></button>
                        <button onClick={() => deleteInstalacao(inst.id)} className="text-white/25 hover:text-danger transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Modal: Registro Diário ───────────────────────────────── */}
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
        {/* limites da sala */}
        {inst && (
          <div className="flex items-center gap-4 bg-white/4 border border-white/8 rounded-lg px-4 py-2.5 mb-4 text-[11px] font-mono">
            <span className="text-white/40">{nomeSala(inst)}</span>
            <span className="text-orange-400 flex items-center gap-1">
              <Thermometer size={11} />
              {fmtLimite(inst.temp_min, '°C')} ~ {fmtLimite(inst.temp_max, '°C')}
            </span>
            <span className="text-blue-400 flex items-center gap-1">
              <Droplets size={11} />
              {fmtLimite(inst.umid_min, '%')} ~ {fmtLimite(inst.umid_max, '%')}
            </span>
          </div>
        )}

        {/* alertas fora do limite */}
        {inst && regF.temp_max && outOfRange(parseFloat(regF.temp_max), inst.temp_min, inst.temp_max) && (
          <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mb-3 text-[11px] text-danger">
            <AlertTriangle size={12} /> Temperatura máxima fora dos limites permitidos
          </div>
        )}
        {inst && regF.temp_min && outOfRange(parseFloat(regF.temp_min), inst.temp_min, inst.temp_max) && (
          <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mb-3 text-[11px] text-danger">
            <AlertTriangle size={12} /> Temperatura mínima fora dos limites permitidos
          </div>
        )}
        {inst && regF.umidade && outOfRange(parseFloat(regF.umidade), inst.umid_min, inst.umid_max) && (
          <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-lg px-3 py-2 mb-3 text-[11px] text-warning">
            <AlertTriangle size={12} /> Umidade fora dos limites permitidos
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Temp. Máx. (°C) *</label>
            <input className={inp} type="number" step="0.1" value={regF.temp_max} onChange={e => setRegF(p => ({ ...p, temp_max: e.target.value }))} placeholder="25.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Temp. Mín. (°C) *</label>
            <input className={inp} type="number" step="0.1" value={regF.temp_min} onChange={e => setRegF(p => ({ ...p, temp_min: e.target.value }))} placeholder="18.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Umidade (%RH) *</label>
            <input className={inp} type="number" step="0.1" value={regF.umidade} onChange={e => setRegF(p => ({ ...p, umidade: e.target.value }))} placeholder="55.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Pressão (hPa)</label>
            <input className={inp} type="number" step="0.1" value={regF.pressao} onChange={e => setRegF(p => ({ ...p, pressao: e.target.value }))} placeholder="1013.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Operador</label>
            <input className={inp} value={regF.tecnico} onChange={e => setRegF(p => ({ ...p, tecnico: e.target.value }))} placeholder="Nome..." />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Observações</label>
            <input className={inp} value={regF.obs} onChange={e => setRegF(p => ({ ...p, obs: e.target.value }))} placeholder="..." />
          </div>
        </div>
      </Modal>

      {/* ── Modal: Cadastrar / Editar Instalação ────────────────── */}
      <Modal
        open={openInst}
        onClose={() => setOpenInst(false)}
        title={editInst ? 'Editar Instalação' : 'Cadastrar Instalação'}
        footer={
          <>
            <button className="btn-secondary text-xs" onClick={() => setOpenInst(false)}>Cancelar</button>
            <button className="btn-primary text-xs" onClick={saveInstalacao} disabled={savingInst}>
              {savingInst ? 'Salvando...' : editInst ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {/* Localização */}
          <div className="col-span-2">
            <p className="font-mono text-[8px] tracking-[2px] text-gold/70 uppercase mb-3">Localização</p>
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Prédio</label>
            <input className={inp} value={instF.predio} onChange={e => setInstF(p => ({ ...p, predio: e.target.value }))} placeholder="Ex: Bloco A, Edifício 1..." />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Bloco</label>
            <input className={inp} value={instF.bloco} onChange={e => setInstF(p => ({ ...p, bloco: e.target.value }))} placeholder="Ex: Bloco B, Ala Norte..." />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Sala *</label>
            <input className={inp} value={instF.sala} onChange={e => setInstF(p => ({ ...p, sala: e.target.value }))} placeholder="Ex: Sala EMC, Lab 203..." />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Área</label>
            <input className={inp} value={instF.area} onChange={e => setInstF(p => ({ ...p, area: e.target.value }))} placeholder="Ex: EMC, Calibração..." />
          </div>

          {/* Instrumento */}
          <div className="col-span-2 border-t border-white/7 pt-3 mt-1">
            <p className="font-mono text-[8px] tracking-[2px] text-gold/70 uppercase mb-3">Termohigrômetro Vinculado</p>
          </div>
          <div className="col-span-2">
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Equipamento</label>
            <select className={sel} value={instF.equip_id} onChange={e => setInstF(p => ({ ...p, equip_id: e.target.value }))}>
              <option value="">— Nenhum vinculado —</option>
              {equipamentos.map(e => (
                <option key={e.id} value={e.id}>{e.tag} — {e.descricao}</option>
              ))}
            </select>
            {equipamentos.length === 0 && (
              <p className="text-[10px] text-white/30 font-mono mt-1">
                Nenhum Termômetro/Higrômetro/Termo-Higrômetro cadastrado ainda.
              </p>
            )}
          </div>

          {/* Limites */}
          <div className="col-span-2 border-t border-white/7 pt-3 mt-1">
            <p className="font-mono text-[8px] tracking-[2px] text-gold/70 uppercase mb-3">Limites Aceitáveis</p>
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Temp. Mín. (°C)</label>
            <input className={inp} type="number" step="0.1" value={instF.temp_min} onChange={e => setInstF(p => ({ ...p, temp_min: e.target.value }))} placeholder="Ex: 18.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Temp. Máx. (°C)</label>
            <input className={inp} type="number" step="0.1" value={instF.temp_max} onChange={e => setInstF(p => ({ ...p, temp_max: e.target.value }))} placeholder="Ex: 28.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Umidade Mín. (%RH)</label>
            <input className={inp} type="number" step="0.1" value={instF.umid_min} onChange={e => setInstF(p => ({ ...p, umid_min: e.target.value }))} placeholder="Ex: 45.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Umidade Máx. (%RH)</label>
            <input className={inp} type="number" step="0.1" value={instF.umid_max} onChange={e => setInstF(p => ({ ...p, umid_max: e.target.value }))} placeholder="Ex: 75.0" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
