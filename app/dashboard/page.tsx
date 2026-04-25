import { createClient } from '@/lib/supabase/server'
import { fmt, diasAte, calStatus } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Clock, Activity, Plus, Play, ArrowRight, Zap } from 'lucide-react'
import Link from 'next/link'
import { LABS, getLabCode } from '@/lib/labs'

function Ring({ pct, color, size = 38 }: { pct: number; color: string; size?: number }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(pct / 100, 1) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0 -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  )
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: equip    = [] } = await supabase.from('equipamentos').select('*').order('tag')
  const { data: checagens = [] } = await supabase.from('checagens').select('*').order('data', { ascending: false }).limit(5)

  const ativos    = (equip || []).filter(e => e.status === 'ativo')
  const vencidos  = ativos.filter(e => diasAte(e.cal_val) < 0)
  const aVencer30 = ativos.filter(e => { const d = diasAte(e.cal_val); return d >= 0 && d <= 30 })
  const aVencer60 = ativos.filter(e => { const d = diasAte(e.cal_val); return d > 30 && d <= 60 })
  const emDia     = ativos.filter(e => diasAte(e.cal_val) > 60)
  const total     = equip?.length ?? 0
  const emDiaPct  = total > 0 ? Math.round((emDia.length / total) * 100) : 0

  // Breakdown por lab
  const labBreakdown = LABS.map(lab => ({
    ...lab,
    count: (equip || []).filter(e => getLabCode(e.tag) === lab.code).length,
  })).filter(l => l.count > 0)

  const alertas = [...vencidos, ...aVencer30]
    .sort((a, b) => diasAte(a.cal_val) - diasAte(b.cal_val))
    .slice(0, 6)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="page-eyebrow">Dashboard</p>
          <h1 className="page-title">Visão Geral</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/equipamentos" className="btn-secondary text-xs">
            <Plus size={12} /> Equipamento
          </Link>
          <Link href="/dashboard/checagens/realizar" className="btn-primary text-xs">
            <Play size={12} /> Realizar Checagem
          </Link>
        </div>
      </div>

      {/* Stats — 4 cards compactos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: total, sub: 'padrões cadastrados', color: '#4F8EF7', pct: 100 },
          { label: 'Em Dia', value: emDia.length, sub: `${emDiaPct}% conformes`, color: '#22C55E', pct: emDiaPct },
          { label: 'A Vencer 30d', value: aVencer30.length, sub: 'atenção', color: '#F59E0B', pct: total > 0 ? (aVencer30.length/total)*100 : 0, alert: true },
          { label: 'Vencidos', value: vencidos.length, sub: 'ação imediata', color: '#F87171', pct: total > 0 ? (vencidos.length/total)*100 : 0, alert: true },
        ].map(s => (
          <div key={s.label} className="stat-card group hover:shadow-card-hover transition-shadow">
            <Ring pct={s.pct} color={s.color} />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[8px] tracking-[2px] text-white/28 uppercase mb-0.5">{s.label}</p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-bold text-3xl tabular-nums"
                      style={{ color: (s as any).alert && s.value > 0 ? s.color : 'white' }}>
                  {s.value}
                </span>
                {(s as any).alert && s.value > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color, animation: 'pulseDot 2s ease-in-out infinite' }} />
                )}
              </div>
              <p className="text-[10px] text-white/22 mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lab breakdown — só aparece se houver dados */}
      {labBreakdown.length > 0 && (
        <div className="card px-4 py-3 flex items-center gap-4 overflow-x-auto">
          <span className="font-mono text-[8.5px] tracking-[2px] text-white/25 uppercase whitespace-nowrap">Laboratórios</span>
          <div className="flex items-center gap-2 flex-wrap">
            {labBreakdown.map(l => (
              <Link key={l.code} href={`/dashboard/equipamentos`}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[10px] font-mono font-medium transition-all hover:scale-105"
                    style={{ color: l.color, background: l.bg, border: `1px solid ${l.border}` }}>
                {l.code}
                <span className="opacity-60">{l.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main grid — 2 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Alertas */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              {vencidos.length > 0
                ? <AlertTriangle size={13} className="text-danger" />
                : <CheckCircle  size={13} className="text-success" />}
              <span className="font-display font-semibold text-[13px] text-white">Alertas Críticos</span>
              {alertas.length > 0 && <span className="badge-danger text-[9px] ml-1">{alertas.length}</span>}
            </div>
            <Link href="/dashboard/pendencias" className="text-white/20 hover:text-danger transition-colors flex items-center gap-1 text-[10px] font-mono">
              Ver pendências <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-white/4">
            {alertas.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-white/25">
                <CheckCircle size={15} className="text-success/50" />
                <span className="text-sm">Nenhum alerta — tudo em dia</span>
              </div>
            ) : alertas.map(e => {
              const dias = diasAte(e.cal_val)
              const urgent = dias < 0
              return (
                <Link key={e.id} href={`/dashboard/equipamentos/${e.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors group">
                  <span className="tag-chip">{e.tag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] text-white/80 truncate">{e.descricao}</p>
                    <p className="text-[10px] text-white/30 font-mono">{fmt(e.cal_val)}</p>
                  </div>
                  <span className="font-mono text-[11px] flex-shrink-0" style={{ color: urgent ? '#F87171' : '#F59E0B' }}>
                    {urgent ? `${Math.abs(dias)}d atraso` : `${dias}d`}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Próximas 31–60d */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-gold" />
              <span className="font-display font-semibold text-[13px] text-white">Próximas Calibrações</span>
            </div>
            <span className="font-mono text-[9px] text-white/20">31 – 60 dias</span>
          </div>
          <div className="divide-y divide-white/4">
            {aVencer60.length === 0 ? (
              <div className="px-4 py-10 text-center text-white/25 text-sm">Nenhuma neste período</div>
            ) : aVencer60.slice(0, 6).map(e => (
              <Link key={e.id} href={`/dashboard/equipamentos/${e.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors">
                <span className="tag-chip">{e.tag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] text-white/75 truncate">{e.descricao}</p>
                  <p className="text-[10px] text-white/30 font-mono">{fmt(e.cal_val)} · {e.lab_cal || '—'}</p>
                </div>
                <span className="badge-gold text-[9px] tabular-nums">{diasAte(e.cal_val)}d</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Últimas checagens */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Zap size={13} className="text-teal" />
              <span className="font-display font-semibold text-[13px] text-white">Últimas Checagens</span>
            </div>
            <Link href="/dashboard/checagens/controle" className="text-white/20 hover:text-teal transition-colors">
              <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-white/4">
            {(checagens || []).length === 0 ? (
              <div className="px-4 py-10 text-center text-white/25 text-sm">Nenhuma checagem registrada</div>
            ) : (checagens || []).map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/2 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-white/30 tabular-nums">{fmt(c.data)}</span>
                    {c.norma && <span className="font-mono text-[9px] text-white/18 truncate">{c.norma}</span>}
                  </div>
                  <p className="text-[11px] text-white/45 mt-0.5">{c.tecnico || '—'}</p>
                </div>
                <span className={`badge text-[9px] ${c.resultado === 'Conforme' ? 'badge-success' : c.resultado === 'Não conforme' ? 'badge-danger' : 'badge-warning'}`}>
                  {c.resultado === 'Conforme' ? 'PASS' : c.resultado === 'Não conforme' ? 'FAIL' : 'PARCIAL'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status rápido */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Activity size={13} className="text-accent" />
            <span className="font-display font-semibold text-[13px] text-white">Status do Parque</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
            {[
              { label: 'Ativos',   value: ativos.length,                                         color: '#22C55E' },
              { label: 'Calibrar', value: (equip||[]).filter(e=>e.status==='calibrar').length,   color: '#F59E0B' },
              { label: 'Fora de uso', value: (equip||[]).filter(e=>e.status==='fora').length,   color: '#F87171' },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center py-4 gap-1">
                <span className="font-display font-bold text-2xl tabular-nums"
                      style={{ color: s.value > 0 ? s.color : 'rgba(255,255,255,0.2)' }}>{s.value}</span>
                <span className="font-mono text-[8px] text-white/22 uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="font-mono text-[9px] text-white/20">{total} equipamentos no total</span>
            <Link href="/dashboard/pendencias" className="text-[10px] text-teal/60 hover:text-teal font-mono transition-colors flex items-center gap-1">
              Ver pendências <ArrowRight size={10} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
