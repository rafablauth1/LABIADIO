'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LABS, getLabCode } from '@/lib/labs'
import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { FilterPill } from '@/components/ui/FilterPill'

type TipoPendencia =
  | 'certificado'
  | 'checagem'
  | 'manual'
  | 'plano_cal'
  | 'cal_vencida'
  | 'software'

interface Pendencia {
  equipId: string
  tag: string
  descricao: string
  tipo: TipoPendencia
  detalhe: string
  href: string
  urgente: boolean
}

const TIPOS: { key: TipoPendencia | 'todos'; label: string; color: string }[] = [
  { key: 'todos',       label: 'Todos',              color: '#fff' },
  { key: 'cal_vencida', label: 'Calibração Vencida', color: '#F87171' },
  { key: 'certificado', label: 'Sem Certificado',    color: '#F59E0B' },
  { key: 'checagem',    label: 'Sem Checagem',       color: '#4F8EF7' },
  { key: 'plano_cal',   label: 'Sem Plano Cal.',     color: '#A78BFA' },
  { key: 'manual',      label: 'Sem Manual',         color: '#22D3C8' },
  { key: 'software',    label: 'Sem Software/FW',    color: '#F472B6' },
]

const TIPO_CFG: Record<TipoPendencia, { label: string; color: string; badge: string }> = {
  cal_vencida: { label: 'Calibração Vencida', color: '#F87171', badge: 'badge-danger' },
  certificado: { label: 'Sem Certificado',    color: '#F59E0B', badge: 'badge-warning' },
  checagem:    { label: 'Sem Checagem',       color: '#4F8EF7', badge: 'badge-accent' },
  plano_cal:   { label: 'Sem Plano Cal.',     color: '#A78BFA', badge: 'badge bg-purple-500/10 text-purple-300 border border-purple-500/20' },
  manual:      { label: 'Sem Manual',         color: '#22D3C8', badge: 'badge-teal' },
  software:    { label: 'Sem Software/FW',    color: '#F472B6', badge: 'badge bg-pink-500/10 text-pink-300 border border-pink-500/20' },
}

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

export default function PendenciasPage() {
  const supabase = createClient()
  const [loading, setLoading]         = useState(true)
  const [pendencias, setPendencias]   = useState<Pendencia[]>([])
  const [tipoFilter, setTipoFilter]   = useState<TipoPendencia | 'todos'>('todos')
  const [labFilter, setLabFilter]     = useState('TODOS')

  async function analisar() {
    setLoading(true)
    const hoje = new Date().toISOString().slice(0, 10)
    const seisM = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)

    const [
      { data: equips },
      { data: certs },
      { data: checagens },
      { data: manuais },
      { data: planos },
      { data: softwares },
    ] = await Promise.all([
      supabase.from('equipamentos').select('id, tag, descricao, status, cal_val').eq('status', 'ativo'),
      supabase.from('certificados').select('equip_id'),
      supabase.from('checagens').select('equip_id, data').gte('data', seisM),
      supabase.from('manuais').select('equip_tag'),
      supabase.from('planos_calibracao').select('tag'),
      supabase.from('softwares').select('equip_tag'),
    ])

    const certIds     = new Set((certs    || []).map((c: any) => c.equip_id))
    const chkIds      = new Set((checagens|| []).map((c: any) => c.equip_id))
    const manualTags  = new Set((manuais  || []).map((m: any) => m.equip_tag?.toUpperCase()))
    const planoTags   = new Set((planos   || []).map((p: any) => p.tag?.toUpperCase()))
    const swTags      = new Set((softwares|| []).map((s: any) => s.equip_tag?.toUpperCase()))

    const result: Pendencia[] = []

    for (const e of (equips || [])) {
      const base = { equipId: e.id, tag: e.tag, descricao: e.descricao }
      const tagUpper = e.tag?.toUpperCase()

      if (e.cal_val && e.cal_val < hoje) {
        result.push({ ...base, tipo: 'cal_vencida',
          detalhe: `Venceu em ${fmt(e.cal_val)}`,
          href: `/dashboard/equipamentos/${e.id}`, urgente: true })
      }
      if (!certIds.has(e.id)) {
        result.push({ ...base, tipo: 'certificado',
          detalhe: 'Nenhum certificado de calibração vinculado',
          href: '/dashboard/certificados', urgente: false })
      }
      if (!chkIds.has(e.id)) {
        result.push({ ...base, tipo: 'checagem',
          detalhe: 'Sem checagem nos últimos 6 meses',
          href: '/dashboard/checagens/realizar', urgente: false })
      }
      if (!planoTags.has(tagUpper)) {
        result.push({ ...base, tipo: 'plano_cal',
          detalhe: 'Nenhum plano de calibração cadastrado',
          href: '/dashboard/calibracao', urgente: false })
      }
      if (!manualTags.has(tagUpper)) {
        result.push({ ...base, tipo: 'manual',
          detalhe: 'Nenhum manual técnico vinculado',
          href: '/dashboard/manuais', urgente: false })
      }
      if (!swTags.has(tagUpper)) {
        result.push({ ...base, tipo: 'software',
          detalhe: 'Nenhum software/firmware registrado',
          href: '/dashboard/softwares', urgente: false })
      }
    }

    // Urgentes primeiro
    result.sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0))
    setPendencias(result)
    setLoading(false)
  }

  useEffect(() => { analisar() }, [])

  const filtered = useMemo(() => {
    return pendencias.filter(p => {
      if (tipoFilter !== 'todos' && p.tipo !== tipoFilter) return false
      if (labFilter !== 'TODOS' && getLabCode(p.tag) !== labFilter) return false
      return true
    })
  }, [pendencias, tipoFilter, labFilter])

  const contPorTipo = useMemo(() => {
    const c: Record<string, number> = { todos: pendencias.length }
    TIPOS.forEach(t => { c[t.key] = pendencias.filter(p => p.tipo === t.key).length })
    return c
  }, [pendencias])

  const urgentes = pendencias.filter(p => p.urgente).length

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Controle</p>
          <h1 className="page-title">Pendências de Preenchimento</h1>
          <p className="page-sub">Equipamentos ativos com dados incompletos ou vencidos</p>
        </div>
        <button onClick={analisar} disabled={loading} className="btn-secondary text-xs">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Analisando...' : 'Reanalisar'}
        </button>
      </div>

      {/* Resumo */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(248,113,113,0.12)' }}>
              <AlertTriangle size={18} className="text-danger" />
            </div>
            <div>
              <p className="font-mono text-[8.5px] tracking-[2px] text-white/30 uppercase mb-1">Urgentes</p>
              <p className="font-display font-bold text-3xl tabular-nums" style={{ color: urgentes > 0 ? '#F87171' : 'rgba(255,255,255,0.3)' }}>{urgentes}</p>
            </div>
          </div>
          <div className="stat-card">
            <div>
              <p className="font-mono text-[8.5px] tracking-[2px] text-white/30 uppercase mb-1">Total de Pendências</p>
              <p className="font-display font-bold text-3xl tabular-nums text-white">{pendencias.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div>
              <p className="font-mono text-[8.5px] tracking-[2px] text-white/30 uppercase mb-1">Equipamentos Afetados</p>
              <p className="font-display font-bold text-3xl tabular-nums text-white">
                {new Set(pendencias.map(p => p.equipId)).size}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtro por tipo */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TIPOS.map(t => {
          const count = contPorTipo[t.key] ?? 0
          if (count === 0 && t.key !== 'todos') return null
          return (
            <FilterPill key={t.key} active={tipoFilter === t.key}
              color={t.color} bg={`${t.color}18`} border={`${t.color}35`}
              onClick={() => setTipoFilter(t.key as any)}>
              {t.label}
              <span className="font-mono text-[9px] opacity-60">{count}</span>
            </FilterPill>
          )
        })}
      </div>

      {/* Filtro por lab */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {[{ code: 'TODOS', color: '#fff', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' } as any,
          ...LABS,
        ].map(lab => {
          const count = pendencias.filter(p => lab.code === 'TODOS' || getLabCode(p.tag) === lab.code).length
          if (count === 0 && lab.code !== 'TODOS') return null
          return (
            <FilterPill key={lab.code} active={labFilter === lab.code}
              color={lab.color} bg={lab.bg || `${lab.color}15`} border={lab.border || `${lab.color}30`}
              onClick={() => setLabFilter(lab.code)}>
              {lab.code === 'TODOS' ? 'Todos' : lab.code}
              <span className="font-mono text-[9px] opacity-50">{count}</span>
            </FilterPill>
          )
        })}
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-white/30 text-sm gap-2">
            <RefreshCw size={14} className="animate-spin" /> Analisando pendências...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-white/25 text-sm italic">
            {pendencias.length === 0 ? '✓ Nenhuma pendência encontrada — tudo em dia!' : 'Nenhuma pendência para este filtro.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="tbl-head">
                  {['TAG','LAB','EQUIPAMENTO','PENDÊNCIA','DETALHE','AÇÃO'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const cfg = TIPO_CFG[p.tipo]
                  const lab = LABS.find(l => l.code === getLabCode(p.tag))
                  return (
                    <tr key={i} className="tbl-row">
                      <td>
                        <div className="flex items-center gap-2">
                          {p.urgente && <span className="w-1 h-1 rounded-full bg-danger animate-pulse" />}
                          <span className="tag-chip">{p.tag}</span>
                        </div>
                      </td>
                      <td>
                        {lab ? (
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                                style={{ color: lab.color, background: lab.bg, border: `1px solid ${lab.border}` }}>
                            {lab.code}
                          </span>
                        ) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="text-white/70 max-w-[200px] truncate">{p.descricao}</td>
                      <td><span className={`${cfg.badge} text-[9px]`}>{cfg.label}</span></td>
                      <td className="text-white/40 text-[10px] max-w-[200px] truncate">{p.detalhe}</td>
                      <td>
                        <Link href={p.href}
                              className="inline-flex items-center gap-1 text-teal/70 hover:text-teal font-mono text-[10px] transition-colors">
                          Resolver <ArrowRight size={10} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
