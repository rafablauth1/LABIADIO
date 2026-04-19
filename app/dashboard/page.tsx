import { createClient } from '@/lib/supabase/server'
import { fmt, diasAte, calStatus } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Clock, Activity, Plus, Play } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()

  // Buscar dados do laboratório
  const { data: equip = [] }    = await supabase.from('equipamentos').select('*').order('tag')
  const { data: checagens = [] } = await supabase.from('checagens').select('*').order('data', { ascending: false }).limit(5)
  const { data: certs = [] }    = await supabase.from('certificados').select('*, equipamentos(tag, descricao)').order('created_at', { ascending: false }).limit(5)

  // Filtrar apenas equipamentos ativos para alertas
  const ativos = (equip || []).filter(e => e.status === 'ativo')
  const vencidos   = ativos.filter(e => diasAte(e.cal_val) < 0)
  const aVencer30  = ativos.filter(e => { const d = diasAte(e.cal_val); return d >= 0 && d <= 30 })
  const aVencer60  = ativos.filter(e => { const d = diasAte(e.cal_val); return d > 30 && d <= 60 })
  const emDia      = ativos.filter(e => diasAte(e.cal_val) > 60)
  const foraDuso   = (equip || []).filter(e => e.status === 'fora')
  const calibrarAntes = (equip || []).filter(e => e.status === 'calibrar')

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">
            Dashboard
          </p>
          <h1 className="font-display font-bold text-2xl text-white">
            Visão Geral
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Gestão de Equipamentos · ISO/IEC 17025:2017
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/equipamentos/novo" className="btn-secondary text-xs">
            <Plus size={13} /> Equipamento
          </Link>
          <Link href="/dashboard/checagens/realizar" className="btn-primary text-xs">
            <Play size={13} /> Realizar Checagem
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total de Padrões', value: equip?.length ?? 0, color: 'border-t-accent', sub: 'cadastrados', icon: Activity },
          { label: 'Calibrações Vencidas', value: vencidos.length, color: 'border-t-danger', sub: 'requer ação imediata', icon: AlertTriangle, alert: vencidos.length > 0 },
          { label: 'Vencendo em 30d', value: aVencer30.length, color: 'border-t-warning', sub: 'atenção necessária', icon: Clock, alert: aVencer30.length > 0 },
          { label: 'Em Dia', value: emDia.length, color: 'border-t-success', sub: 'padrões conformes', icon: CheckCircle },
        ].map(({ label, value, color, sub, icon: Icon, alert }) => (
          <div key={label} className={`card border-t-2 ${color} p-4`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase mb-2">
                  {label}
                </p>
                <p className={`font-display font-bold text-3xl ${alert ? 'text-danger' : 'text-white'}`}>
                  {value}
                </p>
                <p className="text-[10px] text-white/30 mt-1">{sub}</p>
              </div>
              <Icon
                size={18}
                className={alert ? 'text-danger opacity-60' : 'text-white/15'}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Alertas críticos */}
        <div className="card">
          <div className="px-4 py-3 border-b border-white/7 flex items-center justify-between">
            <h2 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <AlertTriangle size={14} className="text-danger" />
              Alertas Críticos
            </h2>
            <span className="badge-danger">{vencidos.length + aVencer30.length}</span>
          </div>
          <div className="divide-y divide-white/5">
            {vencidos.length === 0 && aVencer30.length === 0 && (
              <div className="px-4 py-6 text-center text-white/25 text-sm italic">
                Nenhum alerta — tudo em dia ✓
              </div>
            )}
            {[...vencidos, ...aVencer30].slice(0, 6).map(e => {
              const st = calStatus(e.cal_val)
              return (
                <div key={e.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/3">
                  <span className="tag-chip">{e.tag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white truncate">{e.descricao}</p>
                    <p className="text-[10px] text-white/35 font-mono">
                      Válido até: {fmt(e.cal_val)}
                    </p>
                  </div>
                  <span className={`badge text-[9px] ${st.bg}`}>
                    {st.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Próximas calibrações (30–60 dias) */}
        <div className="card">
          <div className="px-4 py-3 border-b border-white/7">
            <h2 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Clock size={14} className="text-gold" />
              Próximas Calibrações (60 dias)
            </h2>
          </div>
          <div className="divide-y divide-white/5">
            {aVencer60.length === 0 && (
              <div className="px-4 py-6 text-center text-white/25 text-sm italic">
                Nenhuma calibração nos próximos 60 dias
              </div>
            )}
            {aVencer60.slice(0, 6).map(e => {
              const d = diasAte(e.cal_val)
              return (
                <div key={e.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/3">
                  <span className="tag-chip">{e.tag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white truncate">{e.descricao}</p>
                    <p className="text-[10px] text-white/35 font-mono">
                      {fmt(e.cal_val)} · {e.lab_cal || '—'}
                    </p>
                  </div>
                  <span className="badge-gold text-[9px]">{d}d</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Últimas checagens */}
        <div className="card">
          <div className="px-4 py-3 border-b border-white/7">
            <h2 className="font-display font-bold text-sm text-white">
              Últimas Checagens
            </h2>
          </div>
          <div className="divide-y divide-white/5">
            {(checagens || []).length === 0 && (
              <div className="px-4 py-6 text-center text-white/25 text-sm italic">
                Nenhuma checagem registrada ainda
              </div>
            )}
            {(checagens || []).map((c: any) => (
              <div key={c.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="tag-chip">{c.equip_tag || '—'}</span>
                    <span className="text-[10px] text-white/30 font-mono">{fmt(c.data)}</span>
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5">{c.norma}</p>
                </div>
                <span className={`badge text-[9px] ${
                  c.resultado === 'Conforme'
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-danger/10 text-danger border-danger/20'
                }`}>
                  {c.resultado === 'Conforme' ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status especial */}
        {(foraDuso.length > 0 || calibrarAntes.length > 0) && (
          <div className="card">
            <div className="px-4 py-3 border-b border-white/7">
              <h2 className="font-display font-bold text-sm text-white">
                Padrões com Status Especial
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {foraDuso.map(e => (
                <div key={e.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="tag-chip">{e.tag}</span>
                  <p className="flex-1 text-[11px] text-white/60 truncate">{e.descricao}</p>
                  <span className="badge-danger text-[9px]">FORA DE USO</span>
                </div>
              ))}
              {calibrarAntes.map(e => (
                <div key={e.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="tag-chip">{e.tag}</span>
                  <p className="flex-1 text-[11px] text-white/60 truncate">{e.descricao}</p>
                  <span className="badge-warning text-[9px]">CALIBRAR ANTES</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
