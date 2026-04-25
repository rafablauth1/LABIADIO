'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LABS, getLabCode } from '@/lib/labs'
import { ExternalLink, X } from 'lucide-react'
import Link from 'next/link'

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

function vencimento(proxima: string | null) {
  if (!proxima) return { label: '—', cls: 'text-white/25' }
  const d = Math.floor((new Date(proxima).getTime() - Date.now()) / 86400000)
  if (d < 0)   return { label: `${Math.abs(d)}d atraso`, cls: 'text-danger' }
  if (d <= 30) return { label: `${d}d`,                  cls: 'text-warning' }
  if (d <= 60) return { label: `${d}d`,                  cls: 'text-gold' }
  return        { label: 'Em dia',                        cls: 'text-success' }
}

type StatusFilter = 'todos' | 'vencida' | 'a_vencer' | 'ok'

export default function ControleChecagensPage() {
  const supabase = createClient()
  const [items, setItems]         = useState<any[]>([])
  const [labFilter, setLabFilter] = useState('TODOS')
  const [stFilter, setStFilter]   = useState<StatusFilter>('todos')

  async function load() {
    const { data } = await supabase
      .from('controle_checagens')
      .select('*')
      .order('proxima', { ascending: true })
    setItems(data || [])
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return items.filter(c => {
      if (labFilter !== 'TODOS' && getLabCode(c.tag) !== labFilter) return false
      if (stFilter !== 'todos') {
        const d = c.proxima
          ? Math.floor((new Date(c.proxima).getTime() - Date.now()) / 86400000)
          : null
        if (stFilter === 'vencida'  && (d === null || d >= 0)) return false
        if (stFilter === 'a_vencer' && (d === null || d < 0 || d > 60)) return false
        if (stFilter === 'ok'       && (d === null || d <= 60)) return false
      }
      return true
    })
  }, [items, labFilter, stFilter])

  const labCounts = useMemo(() => {
    const c: Record<string, number> = { TODOS: items.length }
    LABS.forEach(l => { c[l.code] = items.filter(i => getLabCode(i.tag) === l.code).length })
    return c
  }, [items])

  const vencidas  = items.filter(c => c.proxima && new Date(c.proxima) < new Date()).length
  const aVencer   = items.filter(c => {
    if (!c.proxima) return false
    const d = Math.floor((new Date(c.proxima).getTime() - Date.now()) / 86400000)
    return d >= 0 && d <= 60
  }).length

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Checagens</p>
          <h1 className="page-title">Controle de Checagens</h1>
          <p className="page-sub">Periodicidade — §6.4.6</p>
        </div>
        <div className="flex items-center gap-3">
          {vencidas > 0 && <span className="badge-danger">{vencidas} vencida{vencidas > 1 ? 's' : ''}</span>}
          {aVencer > 0  && <span className="badge-warning">{aVencer} a vencer</span>}
        </div>
      </div>

      {/* Filtro status */}
      <div className="flex items-center gap-1.5">
        {([
          { key: 'todos',    label: 'Todos',       count: items.length },
          { key: 'vencida',  label: 'Vencidas',    count: vencidas,   color: '#F87171' },
          { key: 'a_vencer', label: 'A vencer 60d', count: aVencer,   color: '#F59E0B' },
          { key: 'ok',       label: 'Em dia',       count: items.length - vencidas - aVencer, color: '#22C55E' },
        ] as const).map(f => {
          const active = stFilter === f.key
          return (
            <button key={f.key} onClick={() => setStFilter(f.key as StatusFilter)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-[11px] font-medium whitespace-nowrap transition-all"
              style={{
                color:      active ? (f as any).color || '#fff' : 'rgba(255,255,255,0.35)',
                background: active ? `${(f as any).color || '#fff'}18` : 'transparent',
                border:     `1px solid ${active ? `${(f as any).color || '#fff'}30` : 'transparent'}`,
              }}>
              {f.label}
              <span className="font-mono text-[9px] opacity-60">{f.count}</span>
            </button>
          )
        })}
      </div>

      {/* Filtro lab */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
        {[{ code: 'TODOS', color: '#fff', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' } as any,
          ...LABS.filter(l => (labCounts[l.code] ?? 0) > 0),
        ].map(lab => {
          const active = labFilter === lab.code
          return (
            <button key={lab.code} onClick={() => setLabFilter(lab.code)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[10px] font-mono whitespace-nowrap transition-all"
              style={{
                color:      active ? lab.color : 'rgba(255,255,255,0.25)',
                background: active ? lab.bg    : 'transparent',
                border:     `1px solid ${active ? lab.border : 'transparent'}`,
              }}>
              {lab.code === 'TODOS' ? 'Todos' : lab.code}
              <span className="opacity-50">{labCounts[lab.code] ?? 0}</span>
            </button>
          )
        })}
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="tbl-head">
                {['TAG','LAB','IT CHK','PERÍODO','PRÓXIMA','RESPONSÁVEL',''].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => {
                const lab = LABS.find(l => l.code === getLabCode(c.tag))
                const { label, cls } = vencimento(c.proxima)
                return (
                  <tr key={c.id} className="tbl-row group">
                    <td><span className="tag-chip">{c.tag}</span></td>
                    <td>
                      {lab ? (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                              style={{ color: lab.color, background: lab.bg, border: `1px solid ${lab.border}` }}>
                          {lab.code}
                        </span>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="font-mono text-[10px] text-white/50">{c.obs || '—'}</td>
                    <td className="font-mono text-[10px] text-white/45">{c.periodicidade ? `${c.periodicidade}m` : '—'}</td>
                    <td>
                      <div>
                        <span className="font-mono text-[10px] text-white/45">{fmt(c.proxima)}</span>
                        <span className={`ml-2 font-mono text-[9px] ${cls}`}>{label}</span>
                      </div>
                    </td>
                    <td className="text-white/50 text-[10px]">{c.responsavel || '—'}</td>
                    <td>
                      <Link href={`/dashboard/ficha`}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-white/30 hover:text-teal transition-all font-mono text-[9px]">
                        <ExternalLink size={11} /> Ficha
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-white/25 italic text-sm">
                    {items.length === 0
                      ? 'Nenhuma checagem configurada. Realize uma checagem via IT CHK para registrar automaticamente.'
                      : 'Nenhum resultado para este filtro.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
