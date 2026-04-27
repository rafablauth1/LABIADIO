'use client'

import { useState, useEffect } from 'react'
import { Search, CheckCircle2, AlertTriangle, XCircle, Clock, Pencil, FileText, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEquipamentos } from '@/lib/hooks/useEquipamentos'
import EquipamentoModal from '@/components/modals/EquipamentoModal'

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

function calStatus(val: string | null) {
  if (!val) return { label: 'Sem data',     icon: Clock,         cls: 'text-white/40', bg: 'bg-white/5 border-white/10' }
  const d = Math.floor((new Date(val).getTime() - Date.now()) / 86400000)
  if (d < 0)   return { label: 'VENCIDO',        icon: XCircle,       cls: 'text-danger',  bg: 'bg-danger/10 border-danger/20' }
  if (d <= 30) return { label: `Vence em ${d}d`, icon: AlertTriangle, cls: 'text-warning', bg: 'bg-warning/10 border-warning/20' }
  if (d <= 60) return { label: `Vence em ${d}d`, icon: AlertTriangle, cls: 'text-gold',    bg: 'bg-gold/10 border-gold/20' }
  return        { label: 'Em dia',          icon: CheckCircle2,  cls: 'text-success', bg: 'bg-success/10 border-success/20' }
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="font-mono text-[8px] tracking-[1.8px] text-white/30 uppercase mb-1">{label}</p>
      <p className="text-sm text-white/80">{value || '—'}</p>
    </div>
  )
}

function PdfButton({ path }: { path: string | null }) {
  const [loading, setLoading] = useState(false)

  if (!path) return <span className="text-white/20 font-mono text-[10px]">—</span>

  async function open() {
    setLoading(true)
    const res = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(path!)}`)
    const data = await res.json()
    setLoading(false)
    if (data?.url) window.open(data.url, '_blank')
  }

  return (
    <button onClick={open} disabled={loading}
      className="flex items-center gap-1 text-teal hover:text-teal/80 font-mono text-[10px] transition-colors disabled:opacity-40">
      <FileText size={11} />
      {loading ? 'Abrindo...' : 'PDF'}
      <ExternalLink size={9} />
    </button>
  )
}

type Tab = 'certificados' | 'checagens' | 'auxiliares' | 'manuais' | 'softwares' | 'calibracao'

const TABS: { key: Tab; label: string }[] = [
  { key: 'certificados', label: 'Certificados' },
  { key: 'checagens',    label: 'Checagens' },
  { key: 'auxiliares',   label: 'Auxiliares' },
  { key: 'manuais',      label: 'Manuais' },
  { key: 'softwares',    label: 'Softwares / Firmware' },
  { key: 'calibracao',   label: 'Plano de Calibração' },
]

export default function FichaPage() {
  const supabase = createClient()
  const { equip: lista, loading: loadingLista } = useEquipamentos()

  const [equipId, setEquipId]     = useState('')
  const [equip, setEquip]         = useState<any>(null)
  const [loading, setLoading]     = useState(false)
  const [editOpen, setEditOpen]   = useState(false)
  const [tab, setTab]             = useState<Tab>('certificados')

  // dados das mini-abas
  const [certs, setCerts]         = useState<any[]>([])
  const [checagens, setChecagens] = useState<any[]>([])
  const [aux, setAux]             = useState<any[]>([])
  const [manuais, setManuais]     = useState<any[]>([])
  const [softwares, setSoftwares] = useState<any[]>([])
  const [planos, setPlanos]       = useState<any[]>([])

  async function carregar(id: string) {
    if (!id) { setEquip(null); return }
    setLoading(true)
    const { data: e } = await supabase.from('equipamentos').select('*').eq('id', id).single()
    setEquip(e)
    if (e) {
      const tag = e.tag
      const [r1, r2, r3, r4, r5, r6] = await Promise.all([
        supabase.from('certificados').select('*').eq('equip_id', id).order('emissao', { ascending: false }),
        supabase.from('checagens').select('*').eq('equip_id', id).order('data', { ascending: false }).limit(20),
        supabase.from('auxiliares').select('*').eq('vinculado', tag).order('tag'),
        supabase.from('manuais').select('*').ilike('equip_tag', tag).order('created_at', { ascending: false }),
        supabase.from('softwares').select('*').ilike('equip_tag', tag).order('created_at', { ascending: false }),
        supabase.from('planos_calibracao').select('*').ilike('tag', tag).order('created_at', { ascending: false }),
      ])
      setCerts(r1.data || [])
      setChecagens(r2.data || [])
      setAux(r3.data || [])
      setManuais(r4.data || [])
      setSoftwares(r5.data || [])
      setPlanos(r6.data || [])
    }
    setLoading(false)
  }

  useEffect(() => { carregar(equipId) }, [equipId])

  const cal     = equip ? calStatus(equip.cal_val) : null
  const CalIcon = cal?.icon

  const tabCount: Record<Tab, number> = {
    certificados: certs.length,
    checagens:    checagens.length,
    auxiliares:   aux.length,
    manuais:      manuais.length,
    softwares:    softwares.length,
    calibracao:   planos.length,
  }

  const sel = 'w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20'

  return (
    <div>
      <div className="mb-6">
        <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Principal</p>
        <h1 className="font-display font-bold text-2xl text-white">Ficha do Equipamento</h1>
        <p className="text-white/40 text-sm mt-1">Consulta Integrada por TAG</p>
      </div>

      {/* Seletor */}
      <div className="mb-6 max-w-sm">
        <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Selecionar Equipamento</label>
        <select value={equipId} onChange={e => setEquipId(e.target.value)} className={sel}>
          <option value="">— Selecione uma TAG —</option>
          {lista.map(e => <option key={e.id} value={e.id}>{e.tag} — {e.descricao}</option>)}
        </select>
        {!loadingLista && lista.length === 0 && (
          <p className="text-[10px] text-warning/60 font-mono mt-1">Nenhum equipamento cadastrado</p>
        )}
      </div>

      {loading && (
        <div className="card py-16 flex items-center justify-center text-white/30 text-sm">Carregando...</div>
      )}

      {!loading && !equip && (
        <div className="card py-16 flex flex-col items-center gap-3 text-white/25">
          <Search size={32} className="opacity-40" />
          <p className="text-sm">Selecione um equipamento para ver a ficha completa</p>
        </div>
      )}

      {!loading && equip && (
        <>
          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="tag-chip text-base">{equip.tag}</span>
              <h2 className="font-display font-bold text-xl text-white">{equip.descricao}</h2>
            </div>
            <button className="btn-primary text-xs" onClick={() => setEditOpen(true)}>
              <Pencil size={13} /> Editar
            </button>
          </div>

          {/* Status cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {cal && CalIcon && (
              <div className={`card px-4 py-3 border ${cal.bg} flex items-center gap-3`}>
                <CalIcon size={18} className={cal.cls} />
                <div>
                  <p className="font-mono text-[8px] tracking-widest text-white/40 uppercase">Calibração</p>
                  <p className={`font-bold text-sm ${cal.cls}`}>{cal.label}</p>
                </div>
              </div>
            )}
            <div className={`card px-4 py-3 border flex items-center gap-3 ${
              equip.status === 'fora' ? 'bg-danger/10 border-danger/20' :
              equip.status === 'calibrar' ? 'bg-warning/10 border-warning/20' :
              'bg-success/10 border-success/20'}`}>
              <div>
                <p className="font-mono text-[8px] tracking-widest text-white/40 uppercase">Status</p>
                <p className={`font-bold text-sm ${equip.status === 'fora' ? 'text-danger' : equip.status === 'calibrar' ? 'text-warning' : 'text-success'}`}>
                  {equip.status === 'fora' ? 'Fora de uso' : equip.status === 'calibrar' ? 'Calibrar antes' : 'Ativo'}
                </p>
              </div>
            </div>
            <div className="card px-4 py-3 flex items-center gap-3">
              <div>
                <p className="font-mono text-[8px] tracking-widest text-white/40 uppercase">Tipo</p>
                <p className="font-bold text-sm text-white/80">{equip.tipo}</p>
              </div>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="card p-5">
              <p className="font-mono text-[9px] tracking-[2px] text-gold uppercase mb-4">Identificação</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Fabricante"   value={equip.fabricante} />
                <Field label="Nº Série"     value={equip.serie} />
                <Field label="Patrimônio"   value={equip.patrimonio} />
                <Field label="Localização"  value={equip.local} />
              </div>
            </div>
            <div className="card p-5">
              <p className="font-mono text-[9px] tracking-[2px] text-gold uppercase mb-4">Calibração</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Última Calibração" value={fmt(equip.cal_data)} />
                <Field label="Validade"           value={fmt(equip.cal_val)} />
                <Field label="Periodicidade"      value={equip.cal_per ? `${equip.cal_per} meses` : null} />
                <Field label="Lab. Calibrador"    value={equip.lab_cal} />
              </div>
            </div>
          </div>

          {equip.normas?.length > 0 && (
            <div className="card px-5 py-4 mb-4 flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[9px] tracking-[2px] text-gold uppercase">Normas:</span>
              {equip.normas.map((n: string) => (
                <span key={n} className="font-mono text-[10px] px-2.5 py-1 rounded bg-white/8 text-white/60 border border-white/10">{n}</span>
              ))}
            </div>
          )}

          {/* ── Mini-abas ──────────────────────────────────────────── */}
          <div className="card overflow-hidden">
            {/* Tab bar */}
            <div className="flex gap-0 border-b border-white/7 bg-navy/40 overflow-x-auto">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[10px] font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${
                    tab === t.key
                      ? 'border-gold text-gold'
                      : 'border-transparent text-white/40 hover:text-white/70'
                  }`}>
                  {t.label}
                  {tabCount[t.key] > 0 && (
                    <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-gold/20 text-gold' : 'bg-white/8 text-white/30'}`}>
                      {tabCount[t.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Certificados */}
            {tab === 'certificados' && (
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/7 bg-navy">
                    {['Nº CERTIFICADO', 'LABORATÓRIO', 'EMISSÃO', 'ACREDITAÇÃO', 'PDF'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.5px] text-white/35 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {certs.map(c => (
                    <tr key={c.id} className="hover:bg-white/3">
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/80">{c.numero}</td>
                      <td className="px-4 py-2.5 text-white/50">{c.laboratorio || '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{fmt(c.emissao)}</td>
                      <td className="px-4 py-2.5 text-white/40 text-[10px]">{c.acreditacao || '—'}</td>
                      <td className="px-4 py-2.5"><PdfButton path={c.pdf_path} /></td>
                    </tr>
                  ))}
                  {certs.length === 0 && <EmptyRow cols={5} label="Nenhum certificado vinculado" />}
                </tbody>
              </table>
            )}

            {/* Checagens */}
            {tab === 'checagens' && (
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/7 bg-navy">
                    {['DATA', 'NORMA', 'TÉCNICO', 'T°C', 'UMID', 'RESULTADO'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.5px] text-white/35 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {checagens.map(c => (
                    <tr key={c.id} className="hover:bg-white/3">
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/60">{fmt(c.data)}</td>
                      <td className="px-4 py-2.5 text-white/50 text-[10px]">{c.norma || '—'}</td>
                      <td className="px-4 py-2.5 text-white/50 text-[10px]">{c.tecnico || '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/40">{c.temperatura ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/40">{c.umidade ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`badge text-[9px] ${c.resultado === 'Conforme' ? 'badge-success' : c.resultado === 'Não conforme' ? 'badge-danger' : 'badge-warning'}`}>
                          {c.resultado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {checagens.length === 0 && <EmptyRow cols={6} label="Nenhuma checagem registrada" />}
                </tbody>
              </table>
            )}

            {/* Auxiliares */}
            {tab === 'auxiliares' && (
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/7 bg-navy">
                    {['TAG', 'CATEGORIA', 'DESCRIÇÃO', 'MANUTENÇÃO'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.5px] text-white/35 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {aux.map(a => (
                    <tr key={a.id} className="hover:bg-white/3">
                      <td className="px-4 py-2.5"><span className="tag-chip">{a.tag}</span></td>
                      <td className="px-4 py-2.5 text-white/50 text-[10px]">{a.categoria}</td>
                      <td className="px-4 py-2.5 text-white/70 max-w-[240px] truncate">{a.descricao}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/40">{fmt(a.manut)}</td>
                    </tr>
                  ))}
                  {aux.length === 0 && <EmptyRow cols={4} label={`Nenhum auxiliar vinculado à TAG ${equip.tag}`} />}
                </tbody>
              </table>
            )}

            {/* Manuais */}
            {tab === 'manuais' && (
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/7 bg-navy">
                    {['TIPO', 'TÍTULO', 'REVISÃO', 'PDF'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.5px] text-white/35 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {manuais.map(m => (
                    <tr key={m.id} className="hover:bg-white/3">
                      <td className="px-4 py-2.5 text-white/50 text-[10px]">{m.tipo}</td>
                      <td className="px-4 py-2.5 text-white/80 max-w-[300px] truncate">{m.titulo}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/40">{m.revisao || '—'}</td>
                      <td className="px-4 py-2.5"><PdfButton path={m.pdf_path} /></td>
                    </tr>
                  ))}
                  {manuais.length === 0 && <EmptyRow cols={4} label={`Nenhum manual vinculado à TAG ${equip.tag}`} />}
                </tbody>
              </table>
            )}

            {/* Softwares */}
            {tab === 'softwares' && (
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/7 bg-navy">
                    {['TIPO', 'NOME', 'VERSÃO', 'DATA', 'VALIDADO'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.5px] text-white/35 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {softwares.map(s => (
                    <tr key={s.id} className="hover:bg-white/3">
                      <td className="px-4 py-2.5 text-white/50 text-[10px]">{s.tipo}</td>
                      <td className="px-4 py-2.5 text-white/80">{s.nome}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/60">{s.versao}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/40">{fmt(s.data)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`badge text-[9px] ${s.validado === 'Sim' ? 'badge-success' : s.validado === 'Não' ? 'badge-danger' : 'badge-warning'}`}>
                          {s.validado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {softwares.length === 0 && <EmptyRow cols={5} label={`Nenhum software/firmware vinculado à TAG ${equip.tag}`} />}
                </tbody>
              </table>
            )}

            {/* Plano de Calibração */}
            {tab === 'calibracao' && (
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/7 bg-navy">
                    {['LAB. CALIBRADOR', 'PERIOD.', 'ÚLTIMA', 'PRÓXIMA', 'Nº CERT.', 'GRANDEZAS'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.5px] text-white/35 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {planos.map(p => (
                    <tr key={p.id} className="hover:bg-white/3">
                      <td className="px-4 py-2.5 text-white/70 max-w-[160px] truncate">{p.laboratorio || '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{p.periodicidade}m</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{fmt(p.ultima)}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{fmt(p.proxima)}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/40">{p.ncert || '—'}</td>
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
                        ) : <span className="text-white/20">—</span>}
                      </td>
                    </tr>
                  ))}
                  {planos.length === 0 && <EmptyRow cols={6} label={`Nenhum plano de calibração para a TAG ${equip.tag}`} />}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <EquipamentoModal
        open={editOpen}
        equipamento={equip}
        onClose={() => { setEditOpen(false); carregar(equipId) }}
      />
    </div>
  )
}

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-white/25 italic text-sm">{label}</td>
    </tr>
  )
}
