'use client'

import { useState, useEffect } from 'react'
import {
  Plus, ChevronLeft, ChevronRight, Thermometer, Droplets,
  Edit2, Trash2, AlertTriangle, Building2, CheckCircle2, ArrowUpDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'

const MESES      = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

type Tab = 'mensal' | 'diario' | 'instalacoes'

interface Instalacao {
  id: string; lab_id: string
  predio?: string; bloco?: string; sala: string; area?: string
  equip_id?: string; equip?: { tag: string; descricao: string }
  sensor_pos?: string
  temp_min?: number; temp_max?: number
  umid_min?: number; umid_max?: number
  ativo: boolean
}

interface AmbReg {
  id: string; data: string; instalacao_id?: string
  temp_max?: number; temp_min?: number
  umidade?: number; pressao?: number
  tecnico?: string; obs?: string
  correcoes?: { temp_corr_max?: number; temp_corr_min?: number; umid_corr?: number; cert_num?: string }
}

interface CalPt { medido: number; correcao: number; faixa?: string }
interface CalData {
  tempPontos: CalPt[]
  umidPontos: CalPt[]
  certNum?: string
}

const EMPTY_INST = { predio: '', bloco: '', sala: '', area: '', equip_id: '', sensor_pos: 'interno', temp_min: '', temp_max: '', umid_min: '', umid_max: '' }
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

function interpolatePts(x: number, pontos: CalPt[]): number {
  if (!pontos.length) return 0
  const sorted = [...pontos].sort((a, b) => a.medido - b.medido)
  if (x <= sorted[0].medido) return sorted[0].correcao
  if (x >= sorted[sorted.length - 1].medido) return sorted[sorted.length - 1].correcao
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i], p2 = sorted[i + 1]
    if (x >= p1.medido && x <= p2.medido) {
      const t = (x - p1.medido) / (p2.medido - p1.medido)
      return Number((p1.correcao + t * (p2.correcao - p1.correcao)).toFixed(3))
    }
  }
  return 0
}

// Selects the faixa whose medido range covers x; falls back to all points
function interpolateCorr(x: number, pontos: CalPt[]): { correcao: number; faixa?: string } {
  if (!pontos.length) return { correcao: 0 }
  const faixas = [...new Set(pontos.filter(p => p.faixa).map(p => p.faixa!))]
  for (const f of faixas) {
    const pts = pontos.filter(p => p.faixa === f)
    const sorted = [...pts].sort((a, b) => a.medido - b.medido)
    if (x >= sorted[0].medido - 0.01 && x <= sorted[sorted.length - 1].medido + 0.01) {
      return { correcao: interpolatePts(x, pts), faixa: f }
    }
  }
  // fallback: all points, report faixa only if there's exactly one
  return { correcao: interpolatePts(x, pontos), faixa: faixas.length === 1 ? faixas[0] : undefined }
}

function fmtCorr(v: number) {
  if (v === 0) return null
  return (v > 0 ? '+' : '') + v.toFixed(3)
}

export default function AmbientePage() {
  const supabase = createClient()

  const [tab, setTab]             = useState<Tab>('mensal')
  const [mes, setMes]             = useState(new Date().getMonth())
  const [ano, setAno]             = useState(new Date().getFullYear())
  const [salaFiltro, setSalaFiltro] = useState<string>('')

  const [instalacoes, setInstalacoes]   = useState<Instalacao[]>([])
  const [equipamentos, setEquipamentos] = useState<any[]>([])
  const [registros, setRegistros]       = useState<AmbReg[]>([])
  const [calData, setCalData]           = useState<CalData | null>(null)

  // Modal instalação
  const [openInst, setOpenInst]   = useState(false)
  const [editInst, setEditInst]   = useState<Instalacao | null>(null)
  const [savingInst, setSavingInst] = useState(false)
  const [instF, setInstF] = useState({ ...EMPTY_INST })

  // Modal registro
  const [openReg, setOpenReg]     = useState(false)
  const [diaReg, setDiaReg]       = useState(1)
  const [savingReg, setSavingReg] = useState(false)
  const [regF, setRegF] = useState({ ...EMPTY_REG })

  async function loadInstalacoes() {
    const { data } = await supabase
      .from('instalacoes')
      .select('*, equip:equip_id(tag, descricao)')
      .order('sala')
    setInstalacoes(data || [])
  }

  async function loadEquipamentos() {
    const { data: t } = await supabase.from('equipamentos').select('id, tag, descricao, tipo').ilike('tipo', '%termo%').order('tag')
    const { data: h } = await supabase.from('equipamentos').select('id, tag, descricao, tipo').ilike('tipo', '%higro%').order('tag')
    const merged = [...(t || []), ...(h || [])]
    setEquipamentos(merged.filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i))
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

  async function loadCalData(equipId: string) {
    const { data: certs } = await supabase
      .from('certificados')
      .select('numero, analise_ia')
      .eq('equip_id', equipId)
      .not('analise_ia', 'is', null)
      .order('emissao', { ascending: false })
      .limit(6)

    if (!certs?.length) { setCalData(null); return }

    const tempPts: CalPt[] = []
    const umidPts: CalPt[] = []
    let certNum: string | undefined

    for (const cert of certs) {
      const ia = cert.analise_ia as any
      if (!ia?.pontos?.length) continue
      const g = (ia.grandeza || '').toLowerCase()
      const pts: CalPt[] = ia.pontos.map((p: any) => ({
        medido:   Number(p.medido),
        correcao: Number(p.correcao),
        faixa:    p.faixa || undefined,
      }))

      const isUmid = g.includes('umid') || g.includes('humid') || g.includes('%rh')
      const isTemp = g.includes('temp') || g.includes('°c') || (!isUmid && pts.some(p => p.medido < 80))

      if (isUmid && umidPts.length === 0) {
        umidPts.push(...pts)
        if (!certNum) certNum = cert.numero
      } else if (isTemp && tempPts.length === 0) {
        tempPts.push(...pts)
        if (!certNum) certNum = cert.numero
      }

      if (tempPts.length > 0 && umidPts.length > 0) break
    }

    setCalData((tempPts.length || umidPts.length) ? { tempPontos: tempPts, umidPontos: umidPts, certNum } : null)
  }

  useEffect(() => { loadInstalacoes(); loadEquipamentos() }, [])
  useEffect(() => { loadRegistros() }, [mes, ano, salaFiltro])

  useEffect(() => {
    if (!salaFiltro) { setCalData(null); return }
    const inst = instalacoes.find(i => i.id === salaFiltro)
    if (!inst?.equip_id) { setCalData(null); return }
    loadCalData(inst.equip_id)
  }, [salaFiltro, instalacoes])

  function getRegistroDia(dia: number): AmbReg | undefined {
    const mesStr = String(mes + 1).padStart(2, '0')
    const diaStr = String(dia).padStart(2, '0')
    return registros.find(r => r.data === `${ano}-${mesStr}-${diaStr}`)
  }

  function instSelecionada(): Instalacao | undefined {
    return instalacoes.find(i => i.id === salaFiltro)
  }

  // computed corrections for current input values
  const rawTempMax = parseFloat(regF.temp_max) || null
  const rawTempMin = parseFloat(regF.temp_min) || null
  const rawUmidade = parseFloat(regF.umidade)  || null

  const hasTempCal = (calData?.tempPontos?.length ?? 0) > 0
  const hasUmidCal = (calData?.umidPontos?.length ?? 0) > 0

  const rTempMax = rawTempMax != null && hasTempCal ? interpolateCorr(rawTempMax, calData!.tempPontos) : { correcao: 0 }
  const rTempMin = rawTempMin != null && hasTempCal ? interpolateCorr(rawTempMin, calData!.tempPontos) : { correcao: 0 }
  const rUmidade = rawUmidade != null && hasUmidCal ? interpolateCorr(rawUmidade, calData!.umidPontos) : { correcao: 0 }

  const corrTempMax = rTempMax.correcao
  const corrTempMin = rTempMin.correcao
  const corrUmidade = rUmidade.correcao

  // ── Modal Registro ──────────────────────────────────────────────
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

    const raw = {
      temp_max: parseFloat(regF.temp_max),
      temp_min: parseFloat(regF.temp_min),
      umidade:  parseFloat(regF.umidade),
    }

    const rMax  = hasTempCal ? interpolateCorr(raw.temp_max, calData!.tempPontos) : { correcao: 0 }
    const rMin  = hasTempCal ? interpolateCorr(raw.temp_min, calData!.tempPontos) : { correcao: 0 }
    const rUmid = hasUmidCal ? interpolateCorr(raw.umidade,  calData!.umidPontos) : { correcao: 0 }

    const correcoes = (hasTempCal || hasUmidCal) ? {
      temp_corr_max:  rMax.correcao,
      temp_corr_min:  rMin.correcao,
      umid_corr:      rUmid.correcao,
      faixa_temp:     rMax.faixa,
      faixa_umid:     rUmid.faixa,
      cert_num:       calData?.certNum,
    } : null

    const payload = {
      lab_id:        labId,
      instalacao_id: salaFiltro,
      data:          dataStr,
      temp_max:  Number((raw.temp_max + rMax.correcao).toFixed(2)),
      temp_min:  Number((raw.temp_min + rMin.correcao).toFixed(2)),
      umidade:   Number((raw.umidade  + rUmid.correcao).toFixed(2)),
      pressao:   regF.pressao ? parseFloat(regF.pressao) : null,
      tecnico:   regF.tecnico || null,
      obs:       regF.obs     || null,
      correcoes: correcoes,
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

  // ── Modal Instalação ────────────────────────────────────────────
  function openNovaInstalacao() {
    setEditInst(null)
    setInstF({ ...EMPTY_INST })
    setOpenInst(true)
  }

  function openEditInstalacao(inst: Instalacao) {
    setEditInst(inst)
    setInstF({
      predio:     inst.predio     || '',
      bloco:      inst.bloco      || '',
      sala:       inst.sala,
      area:       inst.area       || '',
      equip_id:   inst.equip_id   || '',
      sensor_pos: inst.sensor_pos || 'interno',
      temp_min:   inst.temp_min?.toString() || '',
      temp_max:   inst.temp_max?.toString() || '',
      umid_min:   inst.umid_min?.toString() || '',
      umid_max:   inst.umid_max?.toString() || '',
    })
    setOpenInst(true)
  }

  async function saveInstalacao() {
    if (!instF.sala) { alert('O campo Sala é obrigatório.'); return }
    setSavingInst(true)
    const { data: labId } = await supabase.rpc('get_user_lab_id')
    const payload = {
      lab_id:     labId,
      predio:     instF.predio   || null,
      bloco:      instF.bloco    || null,
      sala:       instF.sala,
      area:       instF.area     || null,
      equip_id:   instF.equip_id || null,
      sensor_pos: instF.sensor_pos || 'interno',
      temp_min:   instF.temp_min ? parseFloat(instF.temp_min) : null,
      temp_max:   instF.temp_max ? parseFloat(instF.temp_max) : null,
      umid_min:   instF.umid_min ? parseFloat(instF.umid_min) : null,
      umid_max:   instF.umid_max ? parseFloat(instF.umid_max) : null,
      ativo:      true,
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

  const inst = instSelecionada()
  const inp  = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors'
  const sel  = inp

  function nomeSala(inst: Instalacao) {
    return [inst.predio, inst.bloco, inst.sala, inst.area].filter(Boolean).join(' › ')
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
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <Building2 size={14} className="text-white/30 flex-shrink-0" />
            <select
              className="bg-transparent border-none text-sm text-white focus:outline-none flex-1 cursor-pointer"
              value={salaFiltro}
              onChange={e => setSalaFiltro(e.target.value)}
            >
              <option value="">— Selecione uma sala —</option>
              {instalacoes.map(i => (
                <option key={i.id} value={i.id}>
                  {nomeSala(i)}{i.sensor_pos === 'externo' ? ' (EXT)' : ''}
                </option>
              ))}
            </select>
          </div>

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
                {inst.sensor_pos && (
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase ${
                    inst.sensor_pos === 'externo' ? 'bg-amber-400/10 text-amber-400' : 'bg-teal/10 text-teal'
                  }`}>{inst.sensor_pos}</span>
                )}
                {calData && (
                  <span className="flex items-center gap-1 text-teal/70">
                    <CheckCircle2 size={10} /> Cal. ativa
                  </span>
                )}
              </div>
            </>
          )}

          <div className="w-px bg-white/8 self-stretch" />

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
                  const r        = getRegistroDia(dia)
                  const tMaxOut  = r && outOfRange(r.temp_max, inst?.temp_min, inst?.temp_max)
                  const tMinOut  = r && outOfRange(r.temp_min, inst?.temp_min, inst?.temp_max)
                  const uOut     = r && outOfRange(r.umidade,  inst?.umid_min, inst?.umid_max)
                  const hasCorr  = r?.correcoes && (r.correcoes.temp_corr_max || r.correcoes.umid_corr)
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
                      <td className="px-4 py-2 text-white/40 text-[10px] max-w-[100px] truncate">
                        {hasCorr ? <span className="text-teal/60 font-mono">cal ✓</span> : r?.obs ?? <span className="text-white/15">—</span>}
                      </td>
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
            <h2 className="font-display font-bold text-sm text-white">{MESES_FULL[mes]} {ano}</h2>
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
                  {['LOCALIZAÇÃO', 'ÁREA', 'SENSOR', 'TERMOHIGRÔMETRO', 'LIMITE TEMP.', 'LIMITE UMIDADE', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {instalacoes.map(i => (
                  <tr key={i.id} className="hover:bg-white/3 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="text-white/85 font-medium">{i.sala}</p>
                      {(i.predio || i.bloco) && (
                        <p className="text-[10px] text-white/35 font-mono mt-0.5">
                          {[i.predio, i.bloco].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-[10px]">{i.area || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[8px] uppercase ${
                        i.sensor_pos === 'externo' ? 'bg-amber-400/10 text-amber-400' : 'bg-teal/10 text-teal'
                      }`}>{i.sensor_pos || 'interno'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {i.equip ? (
                        <div>
                          <span className="tag-chip text-[9px]">{(i.equip as any).tag}</span>
                          <p className="text-[10px] text-white/40 mt-0.5">{(i.equip as any).descricao}</p>
                        </div>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px]">
                      {(i.temp_min != null || i.temp_max != null) ? (
                        <span className="text-orange-400">
                          {fmtLimite(i.temp_min, '°C')} ~ {fmtLimite(i.temp_max, '°C')}
                        </span>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px]">
                      {(i.umid_min != null || i.umid_max != null) ? (
                        <span className="text-blue-400">
                          {fmtLimite(i.umid_min, '%')} ~ {fmtLimite(i.umid_max, '%')}
                        </span>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditInstalacao(i)} className="text-white/25 hover:text-gold transition-colors"><Edit2 size={12} /></button>
                        <button onClick={() => deleteInstalacao(i.id)} className="text-white/25 hover:text-danger transition-colors"><Trash2 size={12} /></button>
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
          <div className="flex items-center gap-4 bg-white/4 border border-white/8 rounded-lg px-4 py-2.5 mb-3 text-[11px] font-mono flex-wrap">
            <span className="text-white/40">{nomeSala(inst)}</span>
            {inst.sensor_pos && (
              <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                inst.sensor_pos === 'externo' ? 'bg-amber-400/10 text-amber-400' : 'bg-teal/10 text-teal'
              }`}>{inst.sensor_pos}</span>
            )}
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

        {/* banner calibração */}
        {calData && (hasTempCal || hasUmidCal) && (
          <div className="flex items-center gap-2 bg-teal/5 border border-teal/20 rounded-lg px-3 py-2 mb-3 text-[10.5px] text-teal">
            <CheckCircle2 size={12} className="flex-shrink-0" />
            <span>
              Correção de calibração será aplicada automaticamente
              {calData.certNum && <span className="text-teal/60"> — cert. {calData.certNum}</span>}
            </span>
          </div>
        )}

        {/* alertas fora do limite */}
        {inst && regF.temp_max && outOfRange(parseFloat(regF.temp_max) + corrTempMax, inst.temp_min, inst.temp_max) && (
          <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mb-2 text-[11px] text-danger">
            <AlertTriangle size={12} /> Temperatura máxima fora dos limites permitidos
          </div>
        )}
        {inst && regF.temp_min && outOfRange(parseFloat(regF.temp_min) + corrTempMin, inst.temp_min, inst.temp_max) && (
          <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mb-2 text-[11px] text-danger">
            <AlertTriangle size={12} /> Temperatura mínima fora dos limites permitidos
          </div>
        )}
        {inst && regF.umidade && outOfRange(parseFloat(regF.umidade) + corrUmidade, inst.umid_min, inst.umid_max) && (
          <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-lg px-3 py-2 mb-2 text-[11px] text-warning">
            <AlertTriangle size={12} /> Umidade fora dos limites permitidos
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* Temp Máx */}
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Temp. Máx. (°C) *</label>
            <input className={inp} type="number" step="0.1" value={regF.temp_max}
              onChange={e => setRegF(p => ({ ...p, temp_max: e.target.value }))} placeholder="25.0" />
            {rawTempMax != null && hasTempCal && (
              <div className="mt-1 space-y-0.5">
                {rTempMax.faixa && (
                  <p className="text-[8.5px] font-mono text-white/30">
                    conf. <span className="text-gold/60">{rTempMax.faixa}</span>
                  </p>
                )}
                <p className="text-[9.5px] font-mono flex items-center gap-1 text-teal/70">
                  <ArrowUpDown size={8} />
                  corr. {fmtCorr(corrTempMax) ?? '0'} → <strong>{(rawTempMax + corrTempMax).toFixed(2)}°C</strong>
                </p>
              </div>
            )}
          </div>

          {/* Temp Mín */}
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Temp. Mín. (°C) *</label>
            <input className={inp} type="number" step="0.1" value={regF.temp_min}
              onChange={e => setRegF(p => ({ ...p, temp_min: e.target.value }))} placeholder="18.0" />
            {rawTempMin != null && hasTempCal && (
              <div className="mt-1 space-y-0.5">
                {rTempMin.faixa && (
                  <p className="text-[8.5px] font-mono text-white/30">
                    conf. <span className="text-gold/60">{rTempMin.faixa}</span>
                  </p>
                )}
                <p className="text-[9.5px] font-mono flex items-center gap-1 text-teal/70">
                  <ArrowUpDown size={8} />
                  corr. {fmtCorr(corrTempMin) ?? '0'} → <strong>{(rawTempMin + corrTempMin).toFixed(2)}°C</strong>
                </p>
              </div>
            )}
          </div>

          {/* Umidade */}
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Umidade (%RH) *</label>
            <input className={inp} type="number" step="0.1" value={regF.umidade}
              onChange={e => setRegF(p => ({ ...p, umidade: e.target.value }))} placeholder="55.0" />
            {rawUmidade != null && hasUmidCal && (
              <div className="mt-1 space-y-0.5">
                {rUmidade.faixa && (
                  <p className="text-[8.5px] font-mono text-white/30">
                    conf. <span className="text-gold/60">{rUmidade.faixa}</span>
                  </p>
                )}
                <p className="text-[9.5px] font-mono flex items-center gap-1 text-teal/70">
                  <ArrowUpDown size={8} />
                  corr. {fmtCorr(corrUmidade) ?? '0'} → <strong>{(rawUmidade + corrUmidade).toFixed(2)}%</strong>
                </p>
              </div>
            )}
          </div>

          {/* Pressão */}
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Pressão (hPa)</label>
            <input className={inp} type="number" step="0.1" value={regF.pressao}
              onChange={e => setRegF(p => ({ ...p, pressao: e.target.value }))} placeholder="1013.0" />
          </div>

          {/* Operador */}
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Operador</label>
            <input className={inp} value={regF.tecnico}
              onChange={e => setRegF(p => ({ ...p, tecnico: e.target.value }))} placeholder="Nome..." />
          </div>

          {/* Obs */}
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Observações</label>
            <input className={inp} value={regF.obs}
              onChange={e => setRegF(p => ({ ...p, obs: e.target.value }))} placeholder="..." />
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
            <input className={inp} value={instF.predio} onChange={e => setInstF(p => ({ ...p, predio: e.target.value }))} placeholder="Ex: Bloco A..." />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Bloco</label>
            <input className={inp} value={instF.bloco} onChange={e => setInstF(p => ({ ...p, bloco: e.target.value }))} placeholder="Ex: Ala Norte..." />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Sala *</label>
            <input className={inp} value={instF.sala} onChange={e => setInstF(p => ({ ...p, sala: e.target.value }))} placeholder="Ex: Sala EMC..." />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Área</label>
            <input className={inp} value={instF.area} onChange={e => setInstF(p => ({ ...p, area: e.target.value }))} placeholder="Ex: EMC..." />
          </div>

          {/* Instrumento + sensor_pos */}
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
                Nenhum Termômetro/Higrômetro cadastrado ainda.
              </p>
            )}
          </div>
          <div className="col-span-2">
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-2">Posição do Sensor</label>
            <div className="flex gap-4">
              {(['interno', 'externo'] as const).map(pos => (
                <label key={pos} className="flex items-center gap-2 cursor-pointer group">
                  <div
                    onClick={() => setInstF(p => ({ ...p, sensor_pos: pos }))}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                      instF.sensor_pos === pos ? 'border-gold bg-gold/20' : 'border-white/20 group-hover:border-white/40'
                    }`}
                  >
                    {instF.sensor_pos === pos && <div className="w-1.5 h-1.5 rounded-full bg-gold" />}
                  </div>
                  <span className={`text-xs capitalize ${instF.sensor_pos === pos ? 'text-white/80' : 'text-white/40'}`}>{pos}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-white/25 font-mono mt-1">
              Interno = dentro da sala monitorada · Externo = referência exterior
            </p>
          </div>

          {/* Limites */}
          <div className="col-span-2 border-t border-white/7 pt-3 mt-1">
            <p className="font-mono text-[8px] tracking-[2px] text-gold/70 uppercase mb-3">Limites Aceitáveis</p>
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Temp. Mín. (°C)</label>
            <input className={inp} type="number" step="0.1" value={instF.temp_min} onChange={e => setInstF(p => ({ ...p, temp_min: e.target.value }))} placeholder="18.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Temp. Máx. (°C)</label>
            <input className={inp} type="number" step="0.1" value={instF.temp_max} onChange={e => setInstF(p => ({ ...p, temp_max: e.target.value }))} placeholder="28.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Umidade Mín. (%RH)</label>
            <input className={inp} type="number" step="0.1" value={instF.umid_min} onChange={e => setInstF(p => ({ ...p, umid_min: e.target.value }))} placeholder="45.0" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Umidade Máx. (%RH)</label>
            <input className={inp} type="number" step="0.1" value={instF.umid_max} onChange={e => setInstF(p => ({ ...p, umid_max: e.target.value }))} placeholder="75.0" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
