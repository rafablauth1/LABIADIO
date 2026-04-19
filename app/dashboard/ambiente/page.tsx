'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function AmbientePage() {
  const [tab, setTab] = useState<'mensal' | 'diario'>('mensal')
  const [mesAtual] = useState(new Date().getMonth())
  const [anoAtual] = useState(new Date().getFullYear())

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Análise</p>
          <h1 className="font-display font-bold text-2xl text-white">Condições Ambientais</h1>
        </div>
        <button className="btn-primary text-xs">
          <Plus size={13} /> {tab === 'mensal' ? 'Novo Registro' : 'Registro Diário'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-white/7">
        {([
          { key: 'mensal', label: 'Planilha Mensal' },
          { key: 'diario', label: 'Controle Diário' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-gold text-gold'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mensal' && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/7 flex items-center gap-3">
            <h2 className="font-display font-bold text-sm text-white">
              {MESES[mesAtual]} / {anoAtual}
            </h2>
            <div className="flex gap-2 ml-auto">
              {MESES.map((m, i) => (
                <button
                  key={m}
                  className={`font-mono text-[9px] px-2 py-1 rounded transition-colors ${
                    i === mesAtual
                      ? 'bg-gold/20 text-gold'
                      : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="border-b border-white/7 bg-navy">
                  {['DIA', 'TEMP. MÁX (°C)', 'TEMP. MÍN (°C)', 'UMID. MÁX (%RH)', 'UMID. MÍN (%RH)', 'OPERADOR', 'OBS.', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(dia => (
                  <tr key={dia} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-2 font-mono text-[10px] text-white/50">{String(dia).padStart(2,'0')}</td>
                    <td className="px-4 py-2 text-white/25">—</td>
                    <td className="px-4 py-2 text-white/25">—</td>
                    <td className="px-4 py-2 text-white/25">—</td>
                    <td className="px-4 py-2 text-white/25">—</td>
                    <td className="px-4 py-2 text-white/25">—</td>
                    <td className="px-4 py-2 text-white/25">—</td>
                    <td className="px-4 py-2">
                      <button className="text-white/20 hover:text-teal transition-colors font-mono text-[10px]">
                        + Reg.
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'diario' && (
        <div className="card">
          <div className="px-4 py-3 border-b border-white/7">
            <h2 className="font-display font-bold text-sm text-white">Controle Diário · {MESES[mesAtual]} {anoAtual}</h2>
          </div>

          {/* Grade calendário */}
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                <div key={d} className="text-center font-mono text-[8px] text-white/30 tracking-wider uppercase py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }, (_, i) => {
                const day = i - new Date(anoAtual, mesAtual, 1).getDay() + 1
                const valid = day >= 1 && day <= 31
                return (
                  <div
                    key={i}
                    className={`rounded-lg border p-2 min-h-[64px] text-center transition-colors ${
                      valid
                        ? 'border-white/7 hover:border-white/20 cursor-pointer'
                        : 'border-transparent opacity-0 pointer-events-none'
                    }`}
                  >
                    {valid && (
                      <>
                        <p className="font-mono text-[10px] text-white/40 mb-1">{day}</p>
                        <p className="text-[9px] text-white/20">—</p>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
