import { createClient } from '@/lib/supabase/server'
import { fmt, diasAte, calStatus } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Clock, Activity, Plus, Play, ArrowRight, Zap, TrendingDown } from 'lucide-react'
import Link from 'next/link'

/* ── Mini ring SVG ────────────────────────────────────────── */
function Ring({ pct, color, size = 40 }: { pct: number; color: string; size?: number }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0 -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  )
}

/* ── Stat card ────────────────────────────────────────────── */
function StatCard({ label, value, sub, color, pct, alert }: {
  label: string; value: number; sub: string; color: string; pct: number; alert?: boolean
}) {
  return (
    <div className="stat-card group hover:shadow-card-hover transition-shadow duration-200">
      <Ring pct={pct} color={color} />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[8.5px] tracking-[2px] text-white/30 uppercase mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="font-display font-bold text-3xl tabular-nums" style={{ color: alert && value > 0 ? color : 'white' }}>
            {value}
          </span>
          {alert && value > 0 && (
            <span className="pulse-dot flex-shrink-0" style={{ background: color }} />
          )}
        </div>
        <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

/* ── Row de alerta ─────────────────────────────────────────── */
function AlertRow({ e, dias }: { e: any; dias: number }) {
  const urgent = dias < 0
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors group">
      <span className="tag-chip">{e.tag}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] text-white/80 truncate">{e.descricao}</p>
        <p className="text-[10px] text-white/30 font-mono mt-0.5">{e.tipo} · {e.lab_cal || '—'}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-mono text-[11px]" style={{ color: urgent ? '#F87171' : '#F59E0B' }}>
          {urgent ? `${Math.abs(dias)}d atraso` : `${dias}d`}
        </p>
        <p className="font-mono text-[9px] text-white/25">{fmt(e.cal_val)}</p>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: equip    = [] } = await supabase.from('equipamentos').select('*').order('tag')
  const { data: checagens = [] } = await supabase.from('checagens').select('*').order('data', { ascending: false }).limit(6)
  const { data: certs    = [] } = await supabase.from('certificados').select('*, equipamentos(tag, descricao)').order('created_at', { ascending: false }).limit(5)

  const ativos       = (equip || []).filter(e => e.status === 'ativo')
  const vencidos     = ativos.filter(e => diasAte(e.cal_val) < 0)
  const aVencer30    = ativos.filter(e => { const d = diasAte(e.cal_val); return d >= 0 && d <= 30 })
  const aVencer60    = ativos.filter(e => { const d = diasAte(e.cal_val); return d > 30 && d <= 60 })
  const emDia        = ativos.filter(e => diasAte(e.cal_val) > 60)
  const foraDuso     = (equip || []).filter(e => e.status === 'fora')
  const calibrarAntes = (equip || []).filter(e => e.status === 'calibrar')
  const total        = equip?.length ?? 0
  const emDiaPct     = total > 0 ? Math.round((emDia.length / total) * 100) : 0

  const alertas = [...vencidos, ...aVencer30]
    .sort((a, b) => diasAte(a.cal_val) - diasAte(b.cal_val))
    .slice(0, 7)

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho ──────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="page-eyebrow">Dashboard</p>
          <h1 className="page-title">Visão Geral</h1>
        </div>
        <div className="flex gap-2 pb-0.5">
          <Link href="/dashboard/equipamentos" className="btn-secondary text-xs">
            <Plus size={12} /> Equipamento
          </Link>
          <Link href="/dashboard/checagens/realizar" className="btn-primary text-xs">
            <Play size={12} /> Realizar Checagem
          </Link>
        </div>
      </div>

      {/* ── Stats strip ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total de Padrões" value={total}
          sub="equipamentos cadastrados"
          color="#4F8EF7" pct={100}
        />
        <StatCard
          label="Em Dia" value={emDia.length}
          sub={`${emDiaPct}% dos ativos conformes`}
          color="#22C55E" pct={emDiaPct}
        />
        <StatCard
          label="Vencendo em 30d" value={aVencer30.length}
          sub="atenção recomendada"
          color="#F59E0B" pct={total > 0 ? (aVencer30.length / total) * 100 : 0}
          alert
        />
        <StatCard
          label="Calibrações Vencidas" value={vencidos.length}
          sub="requer ação imediata"
          color="#F87171" pct={total > 0 ? (vencidos.length / total) * 100 : 0}
          alert
        />
      </div>

      {/* ── Grid principal ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Alertas críticos */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              {vencidos.length > 0
                ? <AlertTriangle size={13} className="text-danger" />
                : <CheckCircle size={13} className="text-success" />}
              <h2 className="font-display font-semibold text-[13px] text-white">Alertas Críticos</h2>
            </div>
            <div className="flex items-center gap-2">
              {alertas.length > 0 && (
                <span className="badge-danger text-[9px]">{alertas.length}</span>
              )}
              <Link href="/dashboard/equipamentos" className="text-white/20 hover:text-teal transition-colors">
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-white/4">
            {alertas.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-white/25">
                <CheckCircle size={16} className="text-success/50" />
                <span className="text-sm">Tudo em dia — nenhum alerta</span>
              </div>
            ) : (
              alertas.map(e => <AlertRow key={e.id} e={e} dias={diasAte(e.cal_val)} />)
            )}
          </div>
        </div>

        {/* Próximas (31–60 dias) */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-gold" />
              <h2 className="font-display font-semibold text-[13px] text-white">Próximas Calibrações</h2>
            </div>
            <span className="font-mono text-[9px] text-white/20">31–60 dias</span>
          </div>
          <div className="divide-y divide-white/4">
            {aVencer60.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/25 text-sm">
                Nenhuma nos próximos 60 dias
              </div>
            ) : (
              aVencer60.slice(0, 6).map(e => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors">
                  <span className="tag-chip">{e.tag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] text-white/80 truncate">{e.descricao}</p>
                    <p className="text-[10px] text-white/30 font-mono mt-0.5">{fmt(e.cal_val)}</p>
                  </div>
                  <span className="badge-gold text-[9px] tabular-nums">{diasAte(e.cal_val)}d</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Últimas checagens */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Zap size={13} className="text-teal" />
              <h2 className="font-display font-semibold text-[13px] text-white">Últimas Checagens</h2>
            </div>
            <Link href="/dashboard/checagens/controle" className="text-white/20 hover:text-teal transition-colors">
              <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-white/4">
            {(checagens || []).length === 0 ? (
              <div className="px-4 py-8 text-center text-white/25 text-sm">Nenhuma checagem registrada</div>
            ) : (
              (checagens || []).map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] text-white/30">{fmt(c.data)}</span>
                      {c.norma && <span className="font-mono text-[9px] text-white/20 truncate">{c.norma}</span>}
                    </div>
                    <p className="text-[11px] text-white/50">{c.tecnico || '—'}</p>
                  </div>
                  <span className={`badge text-[9px] ${c.resultado === 'Conforme' ? 'badge-success' : c.resultado === 'Não conforme' ? 'badge-danger' : 'badge-warning'}`}>
                    {c.resultado === 'Conforme' ? 'PASS' : c.resultado === 'Não conforme' ? 'FAIL' : 'PARCIAL'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status especial + mini-resumo */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-accent" />
              <h2 className="font-display font-semibold text-[13px] text-white">Status do Parque</h2>
            </div>
          </div>

          {/* Resumo visual */}
          <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
            {[
              { label: 'Ativos', value: ativos.length, color: '#22C55E' },
              { label: 'Calibrar', value: calibrarAntes.length, color: '#F59E0B' },
              { label: 'Fora de uso', value: foraDuso.length, color: '#F87171' },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center py-4 gap-1">
                <span className="font-display font-bold text-2xl tabular-nums" style={{ color: s.value > 0 ? s.color : 'rgba(255,255,255,0.3)' }}>
                  {s.value}
                </span>
                <span className="font-mono text-[8.5px] text-white/25 uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Lista status especial */}
          <div className="divide-y divide-white/4">
            {foraDuso.length === 0 && calibrarAntes.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/25 text-sm">
                Nenhum equipamento com status especial
              </div>
            ) : (
              [...foraDuso.map(e => ({ ...e, _s: 'fora' })), ...calibrarAntes.map(e => ({ ...e, _s: 'calibrar' }))]
                .slice(0, 5)
                .map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/2 transition-colors">
                    <span className="tag-chip">{e.tag}</span>
                    <p className="flex-1 text-[11px] text-white/60 truncate">{e.descricao}</p>
                    {e._s === 'fora'
                      ? <span className="badge-danger text-[9px]">FORA DE USO</span>
                      : <span className="badge-warning text-[9px]">CALIBRAR</span>}
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
