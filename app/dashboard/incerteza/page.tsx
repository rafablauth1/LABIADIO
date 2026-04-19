'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

type Metodo = 'tipo_a' | 'tipo_b' | 'combinada' | 'expandida' | 'resolucao' | 'deriva'

const METODOS: { value: Metodo; label: string; desc: string }[] = [
  { value: 'tipo_a',    label: 'Tipo A — Estatística',           desc: 'Avaliação por análise estatística de séries de observações repetidas.' },
  { value: 'tipo_b',    label: 'Tipo B — Especificação/Cert.',   desc: 'Avaliação por outros meios: certificados de calibração, especificações do fabricante, dados de literatura.' },
  { value: 'combinada', label: 'Incerteza Combinada (Tipo A+B)', desc: 'Combinação quadrática das contribuições Tipo A e Tipo B.' },
  { value: 'expandida', label: 'Incerteza Expandida (U = k·uc)', desc: 'U = k × uc  —  fator de abrangência k=2 para nível de confiança ~95%.' },
  { value: 'resolucao', label: 'Contribuição por Resolução',     desc: 'Incerteza associada à resolução do instrumento de medição.' },
  { value: 'deriva',    label: 'Contribuição por Deriva',        desc: 'Incerteza associada à deriva e estabilidade do padrão entre calibrações.' },
]

type Row = { id: number; xi: string; ui: string; ci: string; nu: string }

let rowId = 1

export default function IncertezaPage() {
  const [metodo, setMetodo] = useState<Metodo>('tipo_a')
  const [rows, setRows] = useState<Row[]>([{ id: rowId++, xi: '', ui: '', ci: '1', nu: '∞' }])
  const [result, setResult] = useState<string | null>(null)

  const current = METODOS.find(m => m.value === metodo)!

  function addRow() {
    setRows(r => [...r, { id: rowId++, xi: '', ui: '', ci: '1', nu: '∞' }])
  }

  function removeRow(id: number) {
    setRows(r => r.filter(x => x.id !== id))
  }

  function updateRow(id: number, field: keyof Row, val: string) {
    setRows(r => r.map(x => x.id === id ? { ...x, [field]: val } : x))
  }

  function calcular() {
    const vals = rows.map(r => parseFloat(r.ui) || 0)
    const cis  = rows.map(r => parseFloat(r.ci) || 1)
    const uc   = Math.sqrt(vals.reduce((sum, u, i) => sum + Math.pow(cis[i] * u, 2), 0))
    const U    = 2 * uc
    setResult(`uc = ${uc.toFixed(6)}    |    U (k=2) = ${U.toFixed(6)}`)
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Análise</p>
          <h1 className="font-display font-bold text-2xl text-white">Incerteza de Medição</h1>
          <p className="text-white/40 text-sm mt-1">Cálculo GUM · ISO/IEC 17025:2017 §7.6</p>
        </div>
        <div className="flex gap-2">
          <select
            value={metodo}
            onChange={e => setMetodo(e.target.value as Metodo)}
            className="bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                       focus:outline-none focus:border-gold/50"
          >
            {METODOS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <button onClick={calcular} className="btn-primary text-xs">Σ Calcular</button>
          <button onClick={addRow} className="btn-secondary text-xs"><Plus size={13} /> Fonte</button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4 items-start">
        <div className="flex flex-col gap-4">
          {/* Calculadora */}
          <div className="card">
            <div className="px-4 py-3 border-b border-white/7">
              <h2 className="font-display font-bold text-sm text-white">{current.label}</h2>
            </div>
            <div className="px-4 py-3 bg-navy/50 border-b border-white/5 text-[11.5px] text-white/50 leading-relaxed">
              {current.desc}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/7 bg-navy">
                    {['FONTE / GRANDEZA (Xi)', 'u(xi)', 'ci', 'ν (graus lib.)', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td className="px-3 py-2">
                        <input
                          value={row.xi}
                          onChange={e => updateRow(row.id, 'xi', e.target.value)}
                          placeholder="Ex: Resolução do instrumento"
                          className="w-full bg-transparent text-white/80 text-[11px] border-b border-white/10
                                     focus:outline-none focus:border-gold/50 pb-0.5"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.ui}
                          onChange={e => updateRow(row.id, 'ui', e.target.value)}
                          placeholder="0.000"
                          className="w-24 bg-transparent text-white/80 text-[11px] font-mono border-b border-white/10
                                     focus:outline-none focus:border-gold/50 pb-0.5"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.ci}
                          onChange={e => updateRow(row.id, 'ci', e.target.value)}
                          placeholder="1"
                          className="w-16 bg-transparent text-white/80 text-[11px] font-mono border-b border-white/10
                                     focus:outline-none focus:border-gold/50 pb-0.5"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.nu}
                          onChange={e => updateRow(row.id, 'nu', e.target.value)}
                          placeholder="∞"
                          className="w-16 bg-transparent text-white/80 text-[11px] font-mono border-b border-white/10
                                     focus:outline-none focus:border-gold/50 pb-0.5"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeRow(row.id)}
                          className="text-white/20 hover:text-danger transition-colors text-xs"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-white/7 flex gap-2">
              <button onClick={addRow} className="btn-secondary text-xs"><Plus size={12} /> Linha</button>
              <button onClick={calcular} className="btn-primary text-xs">Σ Calcular</button>
              <button onClick={() => { setRows([{ id: rowId++, xi: '', ui: '', ci: '1', nu: '∞' }]); setResult(null) }}
                className="btn-secondary text-xs text-danger/70 hover:text-danger">✕ Limpar</button>
            </div>
          </div>

          {/* Resultado */}
          {result && (
            <div className="card px-5 py-4">
              <p className="font-mono text-[8.5px] tracking-[2px] text-gold uppercase mb-2">Resultado</p>
              <p className="font-mono text-lg text-white">{result}</p>
            </div>
          )}
        </div>

        {/* Painel lateral — Budgets salvos */}
        <div className="card">
          <div className="px-4 py-3 border-b border-white/7">
            <h2 className="font-display font-bold text-sm text-white">Budgets Salvos</h2>
          </div>
          <div className="px-4 py-10 text-center text-white/25 text-sm italic">
            Nenhum budget salvo ainda
          </div>
        </div>
      </div>
    </div>
  )
}
