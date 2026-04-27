'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, FileText, FileSpreadsheet, Plus, Trash2, Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEquipamentos } from '@/lib/hooks/useEquipamentos'
import ITCHKModal from '@/components/modals/ITCHKModal'
import ImportarChecagemModal from '@/components/modals/ImportarChecagemModal'

/* ── Tipos ─────────────────────────────────────────────────────── */
interface Ponto {
  grandeza: string
  unidade: string
  valor_referencia: string
  valor_medido: string
  criterio: string
  resultado: 'Conforme' | 'Não conforme' | 'Não avaliado'
}

function calcResultado(medido: string, referencia: string, criterio: string): Ponto['resultado'] {
  if (!medido || !referencia) return 'Não avaliado'
  const m = parseFloat(medido.replace(',', '.'))
  const r = parseFloat(referencia.replace(',', '.'))
  if (isNaN(m) || isNaN(r)) return 'Não avaliado'
  const pm = criterio.match(/[±+\-]?\s*([\d.,]+)\s*(%?)/)
  if (pm) {
    const tol    = parseFloat(pm[1].replace(',', '.'))
    const isPct  = pm[2] === '%'
    const limite = isPct ? r * (tol / 100) : tol
    return Math.abs(m - r) <= limite ? 'Conforme' : 'Não conforme'
  }
  return 'Não avaliado'
}

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

/* ── Tabela de pontos inline ───────────────────────────────────── */
function PontosTable({ pontos, onChange }: { pontos: Ponto[]; onChange: (p: Ponto[]) => void }) {
  function update(i: number, field: keyof Ponto, value: string) {
    const next = [...pontos]
    next[i] = { ...next[i], [field]: value }
    next[i].resultado = calcResultado(
      field === 'valor_medido'    ? value : next[i].valor_medido,
      field === 'valor_referencia'? value : next[i].valor_referencia,
      field === 'criterio'        ? value : next[i].criterio,
    )
    onChange(next)
  }

  function remove(i: number) { onChange(pontos.filter((_, idx) => idx !== i)) }

  function add() {
    onChange([...pontos, { grandeza: '', unidade: '', valor_referencia: '', valor_medido: '', criterio: '', resultado: 'Não avaliado' }])
  }

  const inp2 = 'w-full bg-white/4 border border-white/8 rounded px-2 py-1.5 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50'

  if (pontos.length === 0) return (
    <div className="border border-dashed border-white/10 rounded-xl p-8 text-center">
      <p className="text-white/25 text-sm mb-3">Nenhum ponto de medição</p>
      <div className="flex items-center justify-center gap-2">
        <p className="text-white/20 text-xs">Carregue uma IT CHK, importe Excel ou</p>
        <button onClick={add} className="text-teal/70 hover:text-teal text-xs font-mono transition-colors">+ adicione manualmente</button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
              {['GRANDEZA','UNID.','VLR. REFERÊNCIA','VLR. MEDIDO','CRITÉRIO','RESULTADO',''].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-mono text-[7.5px] tracking-[1.5px] text-white/28 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pontos.map((p, i) => (
              <tr key={i} className="hover:bg-white/2 group">
                <td className="px-2 py-1.5"><input value={p.grandeza} onChange={e => update(i,'grandeza',e.target.value)} className={inp2} placeholder="Tensão CA" /></td>
                <td className="px-2 py-1.5 w-20"><input value={p.unidade} onChange={e => update(i,'unidade',e.target.value)} className={inp2} placeholder="V" /></td>
                <td className="px-2 py-1.5 w-32"><input value={p.valor_referencia} onChange={e => update(i,'valor_referencia',e.target.value)} className={inp2} placeholder="Do certificado" /></td>
                <td className="px-2 py-1.5 w-28"><input value={p.valor_medido} onChange={e => update(i,'valor_medido',e.target.value)} className={inp2} placeholder="Medido agora" /></td>
                <td className="px-2 py-1.5 w-24"><input value={p.criterio} onChange={e => update(i,'criterio',e.target.value)} className={inp2} placeholder="± 1%" /></td>
                <td className="px-2 py-1.5 w-28">
                  <span className={`badge text-[8.5px] ${p.resultado === 'Conforme' ? 'badge-success' : p.resultado === 'Não conforme' ? 'badge-danger' : 'bg-white/6 text-white/30 border border-white/10'}`}>
                    {p.resultado === 'Não avaliado' ? '—' : p.resultado}
                  </span>
                </td>
                <td className="px-2 py-1.5 w-8">
                  <button onClick={() => remove(i)} className="text-white/15 hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={add} className="mt-2 text-[10px] font-mono text-teal/60 hover:text-teal transition-colors flex items-center gap-1">
        <Plus size={11} /> Adicionar ponto
      </button>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function RealizarChecagemPage() {
  const supabase = createClient()
  const { equip } = useEquipamentos()

  const [equipId, setEquipId]   = useState('')
  const [data, setData]         = useState(new Date().toISOString().slice(0, 10))
  const [tecnico, setTecnico]   = useState('')
  const [temp, setTemp]         = useState('')
  const [umid, setUmid]         = useState('')
  const [norma, setNorma]       = useState('')
  const [obs, setObs]           = useState('')
  const [pontos, setPontos]     = useState<Ponto[]>([])
  const [itchkCod, setItchkCod] = useState('')
  const [controleId, setControleId] = useState<string | null>(null)
  const [periodicidade, setPeriodicidade] = useState(6)

  const [historico, setHistorico] = useState<any[]>([])
  const [histOpen, setHistOpen]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)

  const [openITCHK, setOpenITCHK]   = useState(false)
  const [openExcel, setOpenExcel]   = useState(false)

  const equipSel = equip.find(e => e.id === equipId)

  // Resultado geral calculado
  const avaliados = pontos.filter(p => p.resultado !== 'Não avaliado')
  const resultadoGeral = avaliados.length === 0 ? 'Conforme'
    : avaliados.every(p => p.resultado === 'Conforme') ? 'Conforme'
    : avaliados.some(p => p.resultado === 'Não conforme') ? 'Não conforme'
    : 'Parcialmente conforme'

  // Ao selecionar equipamento, carrega template da última checagem
  const loadTemplate = useCallback(async (id: string) => {
    if (!id) { setPontos([]); setNorma(''); setItchkCod(''); setHistorico([]); return }
    setLoading(true)

    // 1. Controle (norma, periodicidade, IT CHK code)
    const { data: ctrl } = await supabase
      .from('controle_checagens').select('*').eq('equip_id', id).maybeSingle()
    if (ctrl) {
      setNorma(ctrl.norma || '')
      setItchkCod(ctrl.obs || '')
      setPeriodicidade(ctrl.periodicidade || 6)
      setControleId(ctrl.id)
    } else {
      setControleId(null)
    }

    // 2. Última checagem com pontos (template)
    const { data: last } = await supabase
      .from('checagens').select('*').eq('equip_id', id)
      .not('medidos', 'is', null)
      .order('data', { ascending: false }).limit(1).maybeSingle()

    if (last?.medidos && Array.isArray(last.medidos) && last.medidos.length > 0) {
      setPontos(last.medidos.map((p: any) => ({
        grandeza:         p.grandeza         || '',
        unidade:          p.unidade          || '',
        valor_referencia: p.valor_referencia || '',
        valor_medido:     '',  // limpa para nova medição
        criterio:         p.criterio         || '',
        resultado:        'Não avaliado' as const,
      })))
      if (!ctrl?.norma && last.norma) setNorma(last.norma)
    } else {
      setPontos([])
    }

    // 3. Histórico
    const { data: hist } = await supabase
      .from('checagens').select('*').eq('equip_id', id)
      .order('data', { ascending: false }).limit(15)
    setHistorico(hist || [])

    setLoading(false)
  }, [supabase])

  useEffect(() => { loadTemplate(equipId) }, [equipId])

  async function salvar() {
    if (!equipId) { alert('Selecione um equipamento.'); return }
    if (!data)    { alert('Informe a data.'); return }
    setSaving(true)

    const { error, data: saved } = await supabase.from('checagens').insert({
      equip_id:    equipId,
      norma:       norma || null,
      data,
      tecnico:     tecnico || null,
      temperatura: temp ? parseFloat(temp) : null,
      umidade:     umid ? parseFloat(umid) : null,
      resultado:   resultadoGeral,
      obs:         obs || (itchkCod ? `IT: ${itchkCod}` : null),
      medidos:     pontos.length > 0 ? pontos.map((p, i) => ({ _linha: i + 1, ...p })) : null,
    }).select().single()

    // Upsert controle_checagens
    const proximaDate = new Date(data)
    proximaDate.setMonth(proximaDate.getMonth() + periodicidade)
    const proxima = proximaDate.toISOString().slice(0, 10)

    if (controleId) {
      await supabase.from('controle_checagens').update({
        norma: norma || null,
        responsavel: tecnico || null,
        proxima,
        obs: itchkCod || null,
        periodicidade,
      }).eq('id', controleId)
    } else {
      const { data: novoCtrl } = await supabase.from('controle_checagens').insert({
        equip_id: equipId,
        tag: equipSel?.tag || '',
        norma: norma || null,
        periodicidade,
        responsavel: tecnico || null,
        proxima,
        obs: itchkCod || null,
      }).select().single()
      if (novoCtrl) setControleId(novoCtrl.id)
    }

    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }

    // Recarrega histórico e limpa campos de medição
    const { data: hist } = await supabase
      .from('checagens').select('*').eq('equip_id', equipId)
      .order('data', { ascending: false }).limit(15)
    setHistorico(hist || [])
    setPontos(pontos.map(p => ({ ...p, valor_medido: '', resultado: 'Não avaliado' })))
    setTemp(''); setUmid(''); setObs('')
    setData(new Date().toISOString().slice(0, 10))
  }

  const inp = 'input text-sm'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Checagens</p>
          <h1 className="page-title">Realizar Checagem</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={() => setOpenExcel(true)}>
            <FileSpreadsheet size={13} /> Carregar Excel
          </button>
          <button className="btn-secondary text-xs" onClick={() => setOpenITCHK(true)}>
            <FileText size={13} /> Carregar IT CHK
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-4 items-start">

        {/* Painel esquerdo */}
        <div className="card p-4 flex flex-col gap-3 sticky top-4">
          <p className="font-mono text-[8.5px] tracking-[2px] text-white/25 uppercase mb-1">Dados da Checagem</p>

          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Equipamento *</label>
            <select value={equipId} onChange={e => setEquipId(e.target.value)} className={inp}>
              <option value="">Selecione...</option>
              {equip.map(e => <option key={e.id} value={e.id}>{e.tag} — {e.descricao}</option>)}
            </select>
          </div>

          {itchkCod && (
            <div className="flex items-center gap-2 bg-teal/5 border border-teal/15 rounded-lg px-3 py-2">
              <FileText size={11} className="text-teal/60 flex-shrink-0" />
              <span className="font-mono text-[10px] text-teal/80">{itchkCod}</span>
            </div>
          )}

          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Norma</label>
            <input value={norma} onChange={e => setNorma(e.target.value)} placeholder="Ex: IEC 61000-4-2" className={inp} />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Data *</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Técnico</label>
            <input value={tecnico} onChange={e => setTecnico(e.target.value)} placeholder="Nome" className={inp} />
          </div>

          <div className="border-t border-white/6 pt-3">
            <p className="font-mono text-[8px] tracking-[2px] text-white/20 uppercase mb-2">Condições Ambientais</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[8px] text-white/30 block mb-1">Temp. (°C)</label>
                <input type="number" step="0.1" value={temp} onChange={e => setTemp(e.target.value)} placeholder="23.0" className={inp} />
              </div>
              <div>
                <label className="font-mono text-[8px] text-white/30 block mb-1">Umidade (%RH)</label>
                <input type="number" step="0.1" value={umid} onChange={e => setUmid(e.target.value)} placeholder="50.0" className={inp} />
              </div>
            </div>
          </div>

          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">OBS</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} className={inp} placeholder="..." />
          </div>

          {/* Resultado geral */}
          {pontos.length > 0 && (
            <div className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2">
              <span className="font-mono text-[9px] text-white/30 uppercase tracking-wider">Resultado Geral</span>
              <span className={`badge text-[9px] ${resultadoGeral === 'Conforme' ? 'badge-success' : resultadoGeral === 'Não conforme' ? 'badge-danger' : 'badge-warning'}`}>
                {resultadoGeral}
              </span>
            </div>
          )}

          <button className="btn-primary text-xs w-full" onClick={salvar} disabled={saving || !equipId}>
            <Save size={13} /> {saving ? 'Salvando...' : 'Salvar Checagem'}
          </button>
        </div>

        {/* Painel direito */}
        <div className="flex flex-col gap-4">

          {/* Info do equipamento */}
          <div className="card">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-display font-semibold text-sm text-white">Equipamento Selecionado</h2>
              {equipSel && (
                <span className={`badge text-[9px] ${equipSel.status === 'ativo' ? 'badge-success' : equipSel.status === 'calibrar' ? 'badge-warning' : 'badge-danger'}`}>
                  {equipSel.status}
                </span>
              )}
            </div>
            {loading ? (
              <div className="px-4 py-8 text-center text-white/25 text-sm">Carregando template...</div>
            ) : equipSel ? (
              <div className="px-4 py-3 flex gap-6">
                <div><p className="font-mono text-[8px] text-white/25 uppercase tracking-wider mb-1">TAG</p><span className="tag-chip">{equipSel.tag}</span></div>
                <div className="flex-1"><p className="font-mono text-[8px] text-white/25 uppercase tracking-wider mb-1">Descrição</p><p className="text-sm text-white/75">{equipSel.descricao}</p></div>
                {itchkCod && <div><p className="font-mono text-[8px] text-white/25 uppercase tracking-wider mb-1">IT CHK</p><p className="font-mono text-[11px] text-teal/70">{itchkCod}</p></div>}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-white/25 text-sm italic">Selecione um equipamento para carregar o template</div>
            )}
          </div>

          {/* Tabela de pontos */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display font-semibold text-sm text-white">Pontos de Medição</h2>
                {pontos.length > 0 && (
                  <p className="text-[10px] text-white/30 mt-0.5">
                    Template da última checagem · valores medidos limpos para nova entrada
                  </p>
                )}
              </div>
              <span className="font-mono text-[9px] text-white/20">{pontos.length} pontos</span>
            </div>
            <PontosTable pontos={pontos} onChange={setPontos} />
          </div>

          {/* Histórico colapsável */}
          {historico.length > 0 && (
            <div className="card overflow-hidden">
              <button
                onClick={() => setHistOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/2 transition-colors"
              >
                <h2 className="font-display font-semibold text-sm text-white">
                  Histórico de Checagens
                  <span className="font-mono text-[10px] text-white/25 ml-2">({historico.length})</span>
                </h2>
                {histOpen ? <ChevronDown size={14} className="text-white/30" /> : <ChevronRight size={14} className="text-white/30" />}
              </button>
              {histOpen && (
                <div className="overflow-x-auto border-t border-white/5">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="tbl-head">
                        {['DATA','NORMA','TÉCNICO','RESULTADO','TEMP','UMID','PTS'].map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {historico.map(h => (
                        <tr key={h.id} className="tbl-row">
                          <td className="font-mono text-[10px] text-white/45">{fmt(h.data)}</td>
                          <td className="text-white/45 text-[10px]">{h.norma || '—'}</td>
                          <td className="text-white/45 text-[10px]">{h.tecnico || '—'}</td>
                          <td>
                            <span className={`badge text-[8.5px] ${h.resultado === 'Conforme' ? 'badge-success' : h.resultado === 'Não conforme' ? 'badge-danger' : 'badge-warning'}`}>
                              {h.resultado === 'Conforme' ? 'PASS' : h.resultado === 'Não conforme' ? 'FAIL' : 'PARCIAL'}
                            </span>
                          </td>
                          <td className="font-mono text-[10px] text-white/35">{h.temperatura ?? '—'}</td>
                          <td className="font-mono text-[10px] text-white/35">{h.umidade ?? '—'}</td>
                          <td className="font-mono text-[10px] text-white/30">
                            {Array.isArray(h.medidos) ? h.medidos.length : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ITCHKModal open={openITCHK} onClose={() => { setOpenITCHK(false); loadTemplate(equipId) }} />
      <ImportarChecagemModal open={openExcel} onClose={() => { setOpenExcel(false); loadTemplate(equipId) }} />
    </div>
  )
}
