'use client'

import { useState, useEffect } from 'react'
import { Plus, Info, Search, X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PlanoCalibracaoModal from '@/components/modals/PlanoCalibracaoModal'
import Modal from '@/components/ui/Modal'

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

// ─── Grandezas pré-definidas ──────────────────────────────────────────────────
interface Grandeza { id?: string; nome: string; simbolo?: string; unidade: string; categoria: string }

const GRANDEZAS_PADRAO: Grandeza[] = [
  // Elétrica
  { nome: 'Tensão CC',                simbolo: 'V_DC',    unidade: 'V',       categoria: 'Elétrica' },
  { nome: 'Tensão CA',                simbolo: 'V_AC',    unidade: 'V (rms)', categoria: 'Elétrica' },
  { nome: 'Corrente CC',              simbolo: 'I_DC',    unidade: 'A',       categoria: 'Elétrica' },
  { nome: 'Corrente CA',              simbolo: 'I_AC',    unidade: 'A (rms)', categoria: 'Elétrica' },
  { nome: 'Resistência',              simbolo: 'R',       unidade: 'Ω',       categoria: 'Elétrica' },
  { nome: 'Capacitância',             simbolo: 'C',       unidade: 'F',       categoria: 'Elétrica' },
  { nome: 'Indutância',               simbolo: 'L',       unidade: 'H',       categoria: 'Elétrica' },
  { nome: 'Potência Ativa',           simbolo: 'P',       unidade: 'W',       categoria: 'Elétrica' },
  { nome: 'Potência Aparente',        simbolo: 'S',       unidade: 'VA',      categoria: 'Elétrica' },
  { nome: 'Potência Reativa',         simbolo: 'Q',       unidade: 'var',     categoria: 'Elétrica' },
  { nome: 'Energia Ativa',            simbolo: 'W',       unidade: 'Wh',      categoria: 'Elétrica' },
  { nome: 'Frequência',               simbolo: 'f',       unidade: 'Hz',      categoria: 'Elétrica' },
  { nome: 'Fator de Potência',        simbolo: 'FP',      unidade: '',        categoria: 'Elétrica' },
  { nome: 'Distorção Harmônica (THD)',simbolo: 'THD',     unidade: '%',       categoria: 'Elétrica' },
  { nome: 'Impedância',               simbolo: 'Z',       unidade: 'Ω',       categoria: 'Elétrica' },

  // RF / TF
  { nome: 'Potência RF',              simbolo: 'P_RF',    unidade: 'dBm',     categoria: 'RF / TF' },
  { nome: 'Atenuação',                simbolo: 'Att',     unidade: 'dB',      categoria: 'RF / TF' },
  { nome: 'VSWR',                     simbolo: 'VSWR',    unidade: '',        categoria: 'RF / TF' },
  { nome: 'Coeficiente de Reflexão',  simbolo: 'Γ',       unidade: 'dB',      categoria: 'RF / TF' },
  { nome: 'Ganho',                    simbolo: 'G',       unidade: 'dB',      categoria: 'RF / TF' },
  { nome: 'Fator de Ruído',           simbolo: 'NF',      unidade: 'dB',      categoria: 'RF / TF' },
  { nome: 'Frequência RF',            simbolo: 'f_RF',    unidade: 'Hz',      categoria: 'RF / TF' },

  // EMC
  { nome: 'Campo Elétrico Radiado',   simbolo: 'E',       unidade: 'V/m',     categoria: 'EMC' },
  { nome: 'Campo Magnético Radiado',  simbolo: 'H',       unidade: 'A/m',     categoria: 'EMC' },
  { nome: 'Emissões Conduzidas',      simbolo: '',        unidade: 'dBµV',    categoria: 'EMC' },
  { nome: 'Imunidade Radiada (IEC 61000-4-3)',   simbolo: '',  unidade: 'V/m', categoria: 'EMC' },
  { nome: 'Imunidade Conduzida (IEC 61000-4-6)', simbolo: '',  unidade: 'dBµV',categoria: 'EMC' },
  { nome: 'ESD (IEC 61000-4-2)',      simbolo: '',        unidade: 'kV',      categoria: 'EMC' },
  { nome: 'EFT/Burst (IEC 61000-4-4)',simbolo: '',        unidade: 'kV',      categoria: 'EMC' },
  { nome: 'Surto (IEC 61000-4-5)',    simbolo: '',        unidade: 'kV',      categoria: 'EMC' },
  { nome: 'Dip/Swell (IEC 61000-4-11)',simbolo: '',       unidade: 'V',       categoria: 'EMC' },
  { nome: 'Harmônicos (IEC 61000-3-2)',simbolo: '',       unidade: 'A',       categoria: 'EMC' },
  { nome: 'Corrente de Condução',     simbolo: '',        unidade: 'dBµA',    categoria: 'EMC' },

  // Ambiental
  { nome: 'Temperatura',              simbolo: 'T',       unidade: '°C',      categoria: 'Ambiental' },
  { nome: 'Umidade Relativa',         simbolo: 'UR',      unidade: '%RH',     categoria: 'Ambiental' },
  { nome: 'Pressão Atmosférica',      simbolo: 'P_atm',   unidade: 'hPa',     categoria: 'Ambiental' },
]

const CATEGORIAS = ['Elétrica', 'RF / TF', 'EMC', 'Ambiental']

type Tab = 'planos' | 'params' | 'grandezas'

export default function CalibracaoPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('planos')
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  // Grandezas
  const [customGrandezas, setCustomGrandezas] = useState<Grandeza[]>([])
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState<string>('Todas')
  const [openNovaGrand, setOpenNovaGrand] = useState(false)
  const [ng, setNg] = useState<Partial<Grandeza>>({ categoria: 'Elétrica' })

  async function load() {
    const { data } = await supabase.from('planos_calibracao').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  async function loadGrandezas() {
    const { data } = await supabase.from('grandezas').select('id, nome, simbolo, unidade, categoria').order('nome')
    setCustomGrandezas(data || [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => { loadGrandezas() }, [])

  async function addCustomGrandeza() {
    if (!ng.nome || !ng.unidade || !ng.categoria) { alert('Preencha nome, unidade e categoria.'); return }
    const { data: labId } = await supabase.rpc('get_user_lab_id')
    const { error } = await supabase.from('grandezas').insert({
      lab_id: labId,
      nome: ng.nome,
      simbolo: ng.simbolo || null,
      unidade: ng.unidade,
      categoria: ng.categoria,
    })
    if (error) { alert('Erro: ' + error.message); return }
    setOpenNovaGrand(false)
    setNg({ categoria: 'Elétrica' })
    loadGrandezas()
  }

  async function removeCustomGrandeza(id: string) {
    await supabase.from('grandezas').delete().eq('id', id)
    loadGrandezas()
  }

  const todasGrandezas = [...GRANDEZAS_PADRAO, ...customGrandezas]
  const grandezasFiltradas = todasGrandezas.filter(g => {
    if (catFiltro !== 'Todas' && g.categoria !== catFiltro) return false
    if (busca && !g.nome.toLowerCase().includes(busca.toLowerCase()) && !g.unidade.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const grandezasPorCat = CATEGORIAS.reduce((acc, cat) => {
    acc[cat] = grandezasFiltradas.filter(g => g.categoria === cat)
    return acc
  }, {} as Record<string, Grandeza[]>)

  const inp = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors'

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Documentação</p>
          <h1 className="font-display font-bold text-2xl text-white">Planos de Calibração</h1>
        </div>
        {tab === 'planos' && (
          <button className="btn-primary text-xs" onClick={() => setOpen(true)}>
            <Plus size={13} /> Novo Plano
          </button>
        )}
        {tab === 'grandezas' && (
          <button className="btn-primary text-xs" onClick={() => { setNg({ categoria: 'Elétrica' }); setOpenNovaGrand(true) }}>
            <Plus size={13} /> Nova Grandeza
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-white/7">
        {([
          { key: 'planos', label: 'Planos' },
          { key: 'params', label: 'Parâmetros Normativos' },
          { key: 'grandezas', label: 'Grandezas' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key ? 'border-gold text-gold' : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Planos ──────────────────────────────────────────────────────────── */}
      {tab === 'planos' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="border-b border-white/7 bg-navy">
                  {['TAG','LABORATÓRIO','PERIOD.','ÚLTIMA','PRÓXIMA','Nº CERT.','GRANDEZAS',''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((p: any) => (
                  <tr key={p.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-2.5"><span className="tag-chip">{p.tag}</span></td>
                    <td className="px-4 py-2.5 text-white/60 max-w-[140px] truncate">{p.laboratorio || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{p.periodicidade}m</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{fmt(p.ultima)}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{fmt(p.proxima)}</td>
                    <td className="px-4 py-2.5 text-white/40 font-mono text-[10px]">{p.ncert || '—'}</td>
                    <td className="px-4 py-2.5">
                      {p.grandezas?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.grandezas.slice(0, 3).map((g: string) => (
                            <span key={g} className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-white/8 text-white/50">{g}</span>
                          ))}
                          {p.grandezas.length > 3 && (
                            <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">+{p.grandezas.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <button className="text-white/25 hover:text-teal transition-colors font-mono text-[10px]">Ver →</button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-white/25 italic text-sm">Nenhum plano cadastrado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Parâmetros Normativos ────────────────────────────────────────────── */}
      {tab === 'params' && (
        <>
          <div className="flex items-start gap-2 bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 mb-5 text-[11.5px] text-accent">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <span>Registre os parâmetros normativos que justificam os pontos de calibração. Cite a norma, seção e critério técnico.</span>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/7 bg-navy">
                    {['TAG','NORMA','SEÇÃO','PARÂMETRO','FAIXA / CRITÉRIO','OBSERVAÇÕES',''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-white/25 italic text-sm">Nenhum parâmetro cadastrado ainda.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Grandezas ────────────────────────────────────────────────────────── */}
      {tab === 'grandezas' && (
        <div>
          {/* Barra de busca + filtro */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                className="input w-full pl-8"
                placeholder="Buscar grandeza..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
              {busca && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white" onClick={() => setBusca('')}>
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex gap-1">
              {(['Todas', ...CATEGORIAS] as const).map(c => (
                <button key={c} onClick={() => setCatFiltro(c as string)}
                  className={`font-mono text-[9px] px-2.5 py-1.5 rounded transition-colors ${
                    catFiltro === c ? 'bg-gold/20 text-gold' : 'text-white/30 hover:text-white/60 bg-white/4'
                  }`}
                >{c}</button>
              ))}
            </div>
          </div>

          {/* Cards por categoria */}
          {(catFiltro === 'Todas' ? CATEGORIAS : [catFiltro]).map(cat => {
            const lista = grandezasPorCat[cat] || grandezasFiltradas.filter(g => g.categoria === cat)
            if (lista.length === 0) return null
            return (
              <div key={cat} className="card mb-4 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/7 bg-navy/50">
                  <span className="font-mono text-[9px] tracking-[2px] text-gold uppercase">{cat}</span>
                </div>
                <div className="divide-y divide-white/4">
                  {lista.map((g, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/2">
                      <div className="flex-1 flex items-center gap-3">
                        <span className="text-[12px] text-white/80">{g.nome}</span>
                        {g.simbolo && (
                          <span className="font-mono text-[10px] text-white/35 bg-white/5 px-1.5 py-0.5 rounded">{g.simbolo}</span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-white/50 min-w-[64px] text-right">{g.unidade || '—'}</span>
                      {g.id ? (
                        <button
                          onClick={() => removeCustomGrandeza(g.id!)}
                          className="text-white/20 hover:text-danger transition-colors ml-2"
                        >
                          <Trash2 size={12} />
                        </button>
                      ) : (
                        <span className="font-mono text-[8px] text-white/20 ml-2 w-12">padrão</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {grandezasFiltradas.length === 0 && (
            <div className="card p-10 text-center text-white/25 italic text-sm">
              Nenhuma grandeza encontrada para o filtro selecionado.
            </div>
          )}

          <p className="text-[10px] text-white/25 mt-2 font-mono">
            {GRANDEZAS_PADRAO.length} grandezas padrão · {customGrandezas.length} customizadas · total: {todasGrandezas.length}
          </p>
        </div>
      )}

      {/* Modal nova grandeza */}
      <Modal
        open={openNovaGrand}
        onClose={() => setOpenNovaGrand(false)}
        title="Nova Grandeza"
        footer={
          <>
            <button className="btn-secondary text-xs" onClick={() => setOpenNovaGrand(false)}>Cancelar</button>
            <button className="btn-primary text-xs" onClick={addCustomGrandeza}>Adicionar</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Nome *</label>
            <input className={inp} value={ng.nome || ''} onChange={e => setNg(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Potência Pulsada" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Símbolo</label>
            <input className={inp} value={ng.simbolo || ''} onChange={e => setNg(p => ({ ...p, simbolo: e.target.value }))} placeholder="Ex: P_puls" />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Unidade *</label>
            <input className={inp} value={ng.unidade || ''} onChange={e => setNg(p => ({ ...p, unidade: e.target.value }))} placeholder="Ex: W, dBm, V/m..." />
          </div>
          <div className="col-span-2">
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Categoria *</label>
            <select className={inp} value={ng.categoria || 'Elétrica'} onChange={e => setNg(p => ({ ...p, categoria: e.target.value }))}>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      <PlanoCalibracaoModal open={open} onClose={() => { setOpen(false); load() }} grandezas={todasGrandezas} />
    </div>
  )
}
