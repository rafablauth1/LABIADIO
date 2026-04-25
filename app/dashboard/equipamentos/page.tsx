'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import EquipamentoModal from '@/components/modals/EquipamentoModal'
import { LABS, getLabCode } from '@/lib/labs'

function calStatus(val: string | null) {
  if (!val) return { label: 'Sem data', cls: 'badge bg-white/5 text-white/30 border-white/10' }
  const d = Math.floor((new Date(val).getTime() - Date.now()) / 86400000)
  if (d < 0)   return { label: 'VENCIDO',  cls: 'badge-danger' }
  if (d <= 30) return { label: `${d}d`,    cls: 'badge-warning' }
  if (d <= 60) return { label: `${d}d`,    cls: 'badge-gold' }
  return        { label: 'Em dia',         cls: 'badge-success' }
}

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

export default function EquipamentosPage() {
  const supabase = createClient()
  const [equip, setEquip]     = useState<any[]>([])
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [labFilter, setLabFilter] = useState('TODOS')
  const [search, setSearch]   = useState('')

  async function load() {
    const { data } = await supabase.from('equipamentos').select('*').order('tag')
    setEquip(data || [])
  }

  async function excluir(id: string, tag: string) {
    if (!confirm(`Excluir ${tag}? Isso remove checagens e certificados vinculados.`)) return
    setDeleting(id)
    await supabase.from('checagens').delete().eq('equip_id', id)
    await supabase.from('certificados').delete().eq('equip_id', id)
    await supabase.from('controle_checagens').delete().eq('equip_id', id)
    const { error } = await supabase.from('equipamentos').delete().eq('id', id)
    setDeleting(null)
    if (error) { alert('Erro: ' + error.message); return }
    load()
  }

  useEffect(() => { load() }, [])

  // Contagem por lab
  const labCounts = useMemo(() => {
    const counts: Record<string, number> = { TODOS: equip.length }
    LABS.forEach(l => { counts[l.code] = 0 })
    counts['OUTRO'] = 0
    equip.forEach(e => {
      const code = getLabCode(e.tag)
      if (counts[code] !== undefined) counts[code]++
      else counts['OUTRO'] = (counts['OUTRO'] || 0) + 1
    })
    return counts
  }, [equip])

  const filtered = useMemo(() => {
    let list = equip
    if (labFilter !== 'TODOS') {
      list = list.filter(e => {
        const code = getLabCode(e.tag)
        return labFilter === 'OUTRO' ? !LABS.some(l => l.code === code) : code === labFilter
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.tag?.toLowerCase().includes(q) ||
        e.descricao?.toLowerCase().includes(q) ||
        e.tipo?.toLowerCase().includes(q)
      )
    }
    return list
  }, [equip, labFilter, search])

  const stats = useMemo(() => ({
    ativos:   filtered.filter(e => e.status === 'ativo').length,
    calibrar: filtered.filter(e => e.status === 'calibrar').length,
    fora:     filtered.filter(e => e.status === 'fora').length,
  }), [filtered])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Equipamentos</p>
          <h1 className="page-title">Padrões de Trabalho</h1>
        </div>
        <button className="btn-primary text-xs" onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus size={13} /> Cadastrar Padrão
        </button>
      </div>

      {/* Lab filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {[{ code: 'TODOS', label: 'Todos', color: '#fff', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' },
          ...LABS.map(l => ({ code: l.code, label: l.name, color: l.color, bg: l.bg, border: l.border })),
          { code: 'OUTRO', label: 'Outros', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
        ].map(tab => {
          const active = labFilter === tab.code
          const count  = labCounts[tab.code] ?? 0
          if (count === 0 && tab.code !== 'TODOS') return null
          return (
            <button
              key={tab.code}
              onClick={() => setLabFilter(tab.code)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-[11px] font-medium whitespace-nowrap transition-all duration-150"
              style={{
                color:      active ? tab.color : 'rgba(255,255,255,0.35)',
                background: active ? tab.bg    : 'transparent',
                border:     `1px solid ${active ? tab.border : 'transparent'}`,
              }}
            >
              {tab.label}
              <span className="font-mono text-[9px] opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Stats mini + search */}
      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          {[
            { label: 'Ativos',   value: stats.ativos,   color: '#22C55E' },
            { label: 'Calibrar', value: stats.calibrar, color: '#F59E0B' },
            { label: 'Fora',     value: stats.fora,     color: '#F87171' },
          ].map(s => (
            <div key={s.label} className="card px-3 py-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="font-mono text-[9px] text-white/35 uppercase tracking-wider">{s.label}</span>
              <span className="font-display font-bold text-sm" style={{ color: s.value > 0 ? s.color : 'rgba(255,255,255,0.3)' }}>{s.value}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 relative max-w-xs ml-auto">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar TAG, descrição..."
            className="input pl-8 text-xs"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white">
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="tbl-head">
                {['TAG','LAB','DESCRIÇÃO','TIPO','VALIDADE','STATUS',''].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e: any) => {
                const st  = calStatus(e.cal_val)
                const lab = LABS.find(l => l.code === getLabCode(e.tag))
                return (
                  <tr key={e.id} className="tbl-row group">
                    <td><span className="tag-chip">{e.tag}</span></td>
                    <td>
                      {lab ? (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                              style={{ color: lab.color, background: lab.bg, border: `1px solid ${lab.border}` }}>
                          {lab.name}
                        </span>
                      ) : (
                        <span className="text-white/20 font-mono text-[9px]">—</span>
                      )}
                    </td>
                    <td className="text-white/75 max-w-[200px] truncate">{e.descricao}</td>
                    <td className="text-white/40 font-mono text-[10px]">{e.tipo}</td>
                    <td className="font-mono text-[10px] text-white/45">{e.status !== 'ativo' ? '—' : fmt(e.cal_val)}</td>
                    <td>
                      {e.status === 'fora'
                        ? <span className="badge-danger text-[9px]">FORA DE USO</span>
                        : e.status === 'calibrar'
                        ? <span className="badge-warning text-[9px]">CALIBRAR</span>
                        : <span className={`badge text-[9px] ${st.cls}`}>{st.label}</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditing(e); setOpen(true) }}
                                className="text-white/30 hover:text-gold transition-colors" title="Editar">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => excluir(e.id, e.tag)} disabled={deleting === e.id}
                                className="text-white/30 hover:text-danger transition-colors disabled:opacity-30" title="Excluir">
                          <Trash2 size={12} />
                        </button>
                        <Link href={`/dashboard/equipamentos/${e.id}`}
                              className="text-white/30 hover:text-teal transition-colors font-mono text-[10px]">
                          Ver →
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-white/25 italic text-sm">
                    {equip.length === 0
                      ? <><span>Nenhum equipamento cadastrado. </span><button className="text-gold hover:underline" onClick={() => setOpen(true)}>Cadastrar o primeiro →</button></>
                      : 'Nenhum equipamento para este filtro.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EquipamentoModal open={open} equipamento={editing} onClose={() => { setOpen(false); setEditing(null); load() }} />
    </div>
  )
}
