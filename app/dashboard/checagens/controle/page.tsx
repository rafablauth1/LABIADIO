'use client'

import { useState, useEffect } from 'react'
import { Plus, Info, FileSpreadsheet, ChevronDown, ChevronRight, Pencil, Trash2, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ControleChecagemModal from '@/components/modals/ControleChecagemModal'
import ImportarChecagemModal from '@/components/modals/ImportarChecagemModal'

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

// Tabela de pontos editável inline
function PontosTable({ checagem, onUpdate }: { checagem: any; onUpdate: () => void }) {
  const supabase = createClient()
  const pontos: Record<string, any>[] = checagem.medidos || []
  const [editing, setEditing] = useState<number | null>(null)
  const [editRow, setEditRow] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  if (pontos.length === 0) {
    return <p className="text-[11px] text-white/25 italic px-4 py-4">Sem pontos de medição registrados.</p>
  }

  const cols = Object.keys(pontos[0]).filter(k => k !== '_linha')

  function startEdit(i: number) {
    setEditing(i)
    setEditRow({ ...pontos[i] })
  }

  async function saveEdit(i: number) {
    setSaving(true)
    const newPontos = pontos.map((p, idx) => idx === i ? { ...editRow, _linha: p._linha } : p)
    await supabase.from('checagens').update({ medidos: newPontos }).eq('id', checagem.id)
    setSaving(false)
    setEditing(null)
    onUpdate()
  }

  async function deleteRow(i: number) {
    if (!confirm('Remover este ponto?')) return
    const newPontos = pontos.filter((_, idx) => idx !== i)
    await supabase.from('checagens').update({ medidos: newPontos }).eq('id', checagem.id)
    onUpdate()
  }

  return (
    <div className="overflow-x-auto border-t border-white/5">
      <table className="w-full text-[10.5px]">
        <thead>
          <tr className="bg-navy/60 border-b border-white/5">
            <th className="px-3 py-2 text-left font-mono text-[7.5px] tracking-widest text-white/25 uppercase w-8">#</th>
            {cols.map(c => (
              <th key={c} className="px-3 py-2 text-left font-mono text-[7.5px] tracking-widest text-white/25 uppercase whitespace-nowrap">{c}</th>
            ))}
            <th className="px-3 py-2 w-16" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/4">
          {pontos.map((p, i) => (
            <tr key={i} className="hover:bg-white/2 group">
              <td className="px-3 py-1.5 font-mono text-[9px] text-white/25">{p._linha ?? i + 1}</td>
              {cols.map(c => (
                <td key={c} className="px-3 py-1.5 text-white/60 max-w-[160px]">
                  {editing === i ? (
                    <input
                      value={editRow[c] ?? ''}
                      onChange={e => setEditRow(prev => ({ ...prev, [c]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/15 rounded px-2 py-0.5 text-[10px] text-white focus:outline-none focus:border-gold/50"
                    />
                  ) : (
                    <span className="truncate block">{String(p[c] ?? '')}</span>
                  )}
                </td>
              ))}
              <td className="px-3 py-1.5">
                {editing === i ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => saveEdit(i)} disabled={saving} className="text-success hover:text-success/80 transition-colors" title="Salvar">
                      <Check size={12} />
                    </button>
                    <button onClick={() => setEditing(null)} className="text-white/30 hover:text-white/60 transition-colors" title="Cancelar">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(i)} className="text-white/30 hover:text-gold transition-colors" title="Editar">
                      <Pencil size={11} />
                    </button>
                    <button onClick={() => deleteRow(i)} className="text-white/30 hover:text-danger transition-colors" title="Remover">
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Histórico de checagens de um equipamento
function HistoricoChecagens({ equipId, equipTag }: { equipId: string; equipTag: string }) {
  const supabase = createClient()
  const [checagens, setChecagens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('checagens').select('*')
      .eq('equip_id', equipId).order('data', { ascending: false })
    setChecagens(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [equipId])

  async function excluir(id: string) {
    if (!confirm('Excluir esta checagem e todos os seus pontos?')) return
    setDeletingId(id)
    await supabase.from('checagens').delete().eq('id', id)
    setDeletingId(null)
    load()
  }

  if (loading) return <div className="px-6 py-4 text-[11px] text-white/30">Carregando...</div>
  if (checagens.length === 0) return (
    <div className="px-6 py-4 text-[11px] text-white/25 italic">Nenhuma checagem registrada para {equipTag}.</div>
  )

  return (
    <div className="divide-y divide-white/4">
      {checagens.map(ch => {
        const hasPontos = Array.isArray(ch.medidos) && ch.medidos.length > 0
        const isExp = expanded === ch.id
        return (
          <div key={ch.id}>
            <div className="flex items-center gap-3 px-6 py-2.5 hover:bg-white/2 group">
              <button
                onClick={() => setExpanded(isExp ? null : ch.id)}
                disabled={!hasPontos}
                className={`transition-colors ${hasPontos ? 'text-white/40 hover:text-white' : 'text-white/15 cursor-default'}`}
              >
                {isExp ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
              <span className="font-mono text-[10px] text-white/50 w-20">{fmt(ch.data)}</span>
              <span className="text-[10.5px] text-white/60 flex-1">{ch.norma || '—'}</span>
              <span className="text-[10px] text-white/40 w-24">{ch.tecnico || '—'}</span>
              <span className={`badge text-[9px] w-24 text-center ${ch.resultado === 'Conforme' ? 'badge-success' : ch.resultado === 'Não conforme' ? 'badge-danger' : 'badge-warning'}`}>
                {ch.resultado}
              </span>
              {hasPontos && (
                <span className="font-mono text-[9px] text-white/25 w-16 text-right">{ch.medidos.length} pts</span>
              )}
              {ch.obs?.startsWith('Importado') && (
                <FileSpreadsheet size={11} className="text-teal/50 flex-shrink-0" />
              )}
              <button
                onClick={() => excluir(ch.id)}
                disabled={deletingId === ch.id}
                className="text-white/15 hover:text-danger transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                <Trash2 size={11} />
              </button>
            </div>
            {isExp && hasPontos && (
              <div className="bg-navy/30 border-t border-white/5">
                <PontosTable checagem={ch} onUpdate={load} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ControleChecagensPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [openConfig, setOpenConfig]     = useState(false)
  const [openImport, setOpenImport]     = useState(false)
  const [expandedRow, setExpandedRow]   = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('controle_checagens').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  async function excluirControle(id: string, tag: string) {
    if (!confirm(`Remover configuração de checagem para ${tag}?`)) return
    await supabase.from('controle_checagens').delete().eq('id', id)
    load()
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Checagens</p>
          <h1 className="font-display font-bold text-2xl text-white">Controle de Checagens</h1>
          <p className="text-white/40 text-sm mt-1">Periodicidade — §6.4.6</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs" onClick={() => setOpenImport(true)}>
            <FileSpreadsheet size={13} /> Importar Excel
          </button>
          <button className="btn-primary text-xs" onClick={() => setOpenConfig(true)}>
            <Plus size={13} /> Configurar
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 mb-5 text-[11.5px] text-accent">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <span>Periodicidade padrão: semestral. Clique em uma linha para ver o histórico de checagens e os pontos importados.</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b border-white/7 bg-navy">
                <th className="px-4 py-2.5 w-6" />
                {['TAG','NORMA','PERIOD.','PRÓXIMA','RESPONSÁVEL',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((c: any) => {
                const isExp = expandedRow === c.id
                return (
                  <>
                    <tr
                      key={c.id}
                      className="hover:bg-white/3 transition-colors border-b border-white/5 cursor-pointer group"
                      onClick={() => setExpandedRow(isExp ? null : c.id)}
                    >
                      <td className="px-4 py-2.5 text-white/30">
                        {isExp ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </td>
                      <td className="px-4 py-2.5"><span className="tag-chip">{c.tag}</span></td>
                      <td className="px-4 py-2.5 text-white/60 text-[10px]">{c.norma}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{c.periodicidade}m</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{fmt(c.proxima)}</td>
                      <td className="px-4 py-2.5 text-white/50 text-[10px]">{c.responsavel || '—'}</td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={e => { e.stopPropagation(); excluirControle(c.id, c.tag) }}
                          className="text-white/15 hover:text-danger transition-colors opacity-0 group-hover:opacity-100 font-mono text-[10px]"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                    {isExp && (
                      <tr key={`${c.id}-hist`} className="border-b border-white/5">
                        <td colSpan={7} className="p-0 bg-navy/20">
                          <div className="px-4 py-2 flex items-center gap-2 border-b border-white/5">
                            <span className="font-mono text-[8.5px] tracking-[2px] text-gold/70 uppercase">Histórico de Checagens — {c.tag}</span>
                            <button
                              onClick={() => setOpenImport(true)}
                              className="ml-auto flex items-center gap-1 text-[9px] text-teal/70 hover:text-teal font-mono transition-colors"
                            >
                              <FileSpreadsheet size={11} /> Importar Excel
                            </button>
                          </div>
                          <HistoricoChecagens equipId={c.equip_id} equipTag={c.tag} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-white/25 italic text-sm">
                    Nenhuma checagem configurada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ControleChecagemModal open={openConfig} onClose={() => { setOpenConfig(false); load() }} />
      <ImportarChecagemModal open={openImport} onClose={() => { setOpenImport(false); load() }} />
    </div>
  )
}
