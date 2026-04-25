'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

function hoje() {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function PlanoRelatorioPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const supabase = createClient()
  const [plano, setPlano]   = useState<any>(null)
  const [equip, setEquip]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('planos_calibracao').select('*').eq('id', id).single()
      setPlano(p)
      if (p?.tag) {
        const { data: e } = await supabase.from('equipamentos').select('*').ilike('tag', p.tag).maybeSingle()
        setEquip(e)
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="text-white/30 p-8">Carregando...</div>
  if (!plano)  return <div className="text-white/30 p-8">Plano não encontrado.</div>

  const pontos: any[] = Array.isArray(plano.pontos) ? plano.pontos : []
  const grandezas: string[] = Array.isArray(plano.grandezas) ? plano.grandezas : []

  return (
    <>
      {/* Barra de ação (não imprime) */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-primary text-xs">
            <Printer size={13} /> Gerar PDF / Imprimir
          </button>
        </div>
      </div>

      {/* ── Documento de Plano de Calibração ── */}
      <div id="plano-print" className="card p-8 max-w-4xl mx-auto print:shadow-none print:border-0 print:p-6 print:max-w-none">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b border-white/10 pb-6 mb-6">
          <div>
            <p className="font-mono text-[9px] tracking-[3px] text-gold/70 uppercase mb-1">LABELO · PUCRS</p>
            <h1 className="font-display font-bold text-2xl text-white mb-1">Plano de Calibração</h1>
            <p className="font-mono text-[10px] text-white/40">Documento gerado em {hoje()}</p>
          </div>
          <div className="text-right">
            <span className="tag-chip text-lg">{plano.tag}</span>
            <p className="font-mono text-[9px] text-white/30 mt-2">ID: {plano.id?.slice(0, 8)}</p>
          </div>
        </div>

        {/* Seção 1 — Equipamento */}
        <section className="mb-6">
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold/60 uppercase mb-3">1. Equipamento</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'TAG', value: equip?.tag || plano.tag },
              { label: 'Descrição / Modelo', value: equip?.descricao || '—' },
              { label: 'Tipo', value: equip?.tipo || '—' },
              { label: 'Fabricante', value: equip?.fabricante || '—' },
              { label: 'Nº Série', value: equip?.serie || '—' },
              { label: 'Localização', value: equip?.local || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="font-mono text-[8px] text-white/28 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm text-white/75">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Seção 2 — Calibração */}
        <section className="mb-6">
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold/60 uppercase mb-3">2. Dados de Calibração</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Laboratório Acreditado', value: plano.laboratorio || '—' },
              { label: 'Periodicidade', value: equip?.cal_per ? `${equip.cal_per} meses` : plano.periodicidade ? `${plano.periodicidade} meses` : '—' },
              { label: 'Última Calibração', value: fmt(equip?.cal_data || plano.ultima) },
              { label: 'Próxima Calibração', value: fmt(equip?.cal_val || plano.proxima) },
              { label: 'Escopo', value: plano.escopo || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="font-mono text-[8px] text-white/28 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm text-white/75">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Seção 3 — Grandezas */}
        {grandezas.length > 0 && (
          <section className="mb-6">
            <p className="font-mono text-[9px] tracking-[2.5px] text-gold/60 uppercase mb-3">3. Grandezas a Calibrar</p>
            <div className="flex flex-wrap gap-2">
              {grandezas.map((g, i) => (
                <span key={i} className="font-mono text-[10px] px-2.5 py-1 rounded border border-white/10 bg-white/4 text-white/60">{g}</span>
              ))}
            </div>
          </section>
        )}

        {/* Seção 4 — Pontos de calibração */}
        <section className="mb-6">
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold/60 uppercase mb-3">
            {grandezas.length > 0 ? '4' : '3'}. Pontos de Calibração
          </p>
          {pontos.length === 0 ? (
            <p className="text-white/30 text-sm italic">Nenhum ponto de calibração registrado.</p>
          ) : (
            <table className="w-full text-[11.5px] border border-white/8 rounded-lg overflow-hidden">
              <thead>
                <tr className="tbl-head">
                  <th className="w-8">#</th>
                  <th>Grandeza</th>
                  <th>Critério de Aceitação</th>
                  <th>Configuração / Especificação</th>
                  <th>Data de Registro</th>
                </tr>
              </thead>
              <tbody>
                {pontos.map((p: any, i: number) => (
                  <tr key={i} className="tbl-row">
                    <td className="font-mono text-[9px] text-white/30 text-center">{i + 1}</td>
                    <td className="font-medium text-white/80">{p.grandeza || '—'}</td>
                    <td className="text-white/60">{p.criterio || '—'}</td>
                    <td className="text-white/50 text-[10.5px]">{p.configuracao || '—'}</td>
                    <td className="font-mono text-[10px] text-white/40">{fmt(p.data_registro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Rodapé */}
        <div className="border-t border-white/8 pt-5 mt-8 flex items-end justify-between">
          <div>
            <p className="font-mono text-[8px] text-white/20 uppercase tracking-wider">Elaborado por</p>
            <div className="mt-6 w-40 border-b border-white/15" />
            <p className="font-mono text-[8px] text-white/20 mt-1">Data: ___/___/______</p>
          </div>
          <div>
            <p className="font-mono text-[8px] text-white/20 uppercase tracking-wider">Aprovado por</p>
            <div className="mt-6 w-40 border-b border-white/15" />
            <p className="font-mono text-[8px] text-white/20 mt-1">Data: ___/___/______</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[8px] text-white/15">LABIADIO · ISO/IEC 17025:2017</p>
            <p className="font-mono text-[8px] text-white/15">Plano gerado em {hoje()}</p>
          </div>
        </div>
      </div>

      {/* CSS de impressão */}
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          .tag-chip { background: #f5f0e0 !important; color: #8a6a10 !important; border-color: #d4aa40 !important; }
          #plano-print { color: #111 !important; background: white !important; }
          #plano-print * { color: #333 !important; border-color: #ddd !important; }
          #plano-print h1 { color: #000 !important; }
          #plano-print .text-gold\\/60 { color: #8a6a10 !important; }
        }
      `}</style>
    </>
  )
}
