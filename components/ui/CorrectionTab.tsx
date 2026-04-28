'use client'

import { useState, useMemo } from 'react'
import { Calculator, TrendingUp, Grid3X3, Info } from 'lucide-react'

export interface PontoCalib {
  nominal:   number
  medido:    number
  erro:      number
  correcao:  number
  incerteza?: number
}

interface Props {
  pontos:    PontoCalib[]
  grandeza?: string
  unidade?:  string
}

function fmt(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs < 0.0001 || abs >= 1e6) return n.toExponential(3)
  if (abs < 1)    return n.toFixed(5).replace(/0+$/, '').replace(/\.$/, '')
  if (abs < 100)  return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  if (abs < 1000) return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function sign(n: number) { return n > 0 ? '+' : '' }

function linearInterp(x: number, pts: PontoCalib[]) {
  if (pts.length < 2) return null
  const sorted = [...pts].sort((a, b) => a.nominal - b.nominal)
  if (x <= sorted[0].nominal) return { correcao: sorted[0].correcao, erro: sorted[0].erro }
  const last = sorted[sorted.length - 1]
  if (x >= last.nominal) return { correcao: last.correcao, erro: last.erro }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1]
    if (x >= a.nominal && x <= b.nominal) {
      const t = (x - a.nominal) / (b.nominal - a.nominal)
      return {
        correcao: a.correcao + t * (b.correcao - a.correcao),
        erro:     a.erro     + t * (b.erro     - a.erro),
      }
    }
  }
  return null
}

function bilinearInterp(
  x: number, y: number,
  x1: number, x2: number, y1: number, y2: number,
  c11: number, c12: number, c21: number, c22: number
) {
  if (x2 === x1 || y2 === y1) return null
  return (
    c11 * (x2 - x) * (y2 - y) +
    c21 * (x - x1) * (y2 - y) +
    c12 * (x2 - x) * (y - y1) +
    c22 * (x - x1) * (y - y1)
  ) / ((x2 - x1) * (y2 - y1))
}

export default function CorrectionTab({ pontos, grandeza, unidade }: Props) {
  const [mode, setMode] = useState<'simple' | 'double'>('simple')
  const [qs, setQs]     = useState('')

  const [dbl, setDbl] = useState({
    x1: '', x2: '', y1: '', y2: '',
    c11: '', c12: '', c21: '', c22: '',
    qx: '', qy: '',
    lbl1: 'Grandeza', lbl2: 'Temperatura (°C)',
  })
  const setD = (k: keyof typeof dbl, v: string) => setDbl(p => ({ ...p, [k]: v }))

  const uni = unidade ? ` ${unidade}` : ''

  const rSimple = useMemo(() => {
    const x = parseFloat(qs)
    if (isNaN(x)) return null
    return linearInterp(x, pontos)
  }, [qs, pontos])

  const rDouble = useMemo(() => {
    const n = (k: keyof typeof dbl) => parseFloat(dbl[k] as string)
    const [x1, x2, y1, y2, c11, c12, c21, c22, qx, qy] =
      ['x1','x2','y1','y2','c11','c12','c21','c22','qx','qy'].map(k => n(k as keyof typeof dbl))
    if ([x1,x2,y1,y2,c11,c12,c21,c22,qx,qy].some(isNaN)) return null
    return bilinearInterp(qx, qy, x1, x2, y1, y2, c11, c12, c21, c22)
  }, [dbl])

  return (
    <div className="space-y-4">

      {/* ── Tabela de calibração ─────────────────────────── */}
      {pontos.length > 0 ? (
        <div>
          <p className="font-mono text-[8px] tracking-[2px] text-gold uppercase mb-2">
            {grandeza || 'Tabela de Resultados'}
          </p>
          <div className="overflow-x-auto rounded-lg border border-white/8">
            <table className="w-full text-[10.5px]">
              <thead>
                <tr className="bg-navy border-b border-white/8">
                  {['Valor Nominal','Valor Medido','Erro','Correção','Incert. U'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-mono text-[7.5px] tracking-[1.5px] text-white/30 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pontos.map((p, i) => (
                  <tr key={i} className="hover:bg-white/3 transition-colors">
                    <td className="px-3 py-2 font-mono text-white/70">{fmt(p.nominal)}<span className="text-white/25 ml-0.5 text-[9px]">{unidade}</span></td>
                    <td className="px-3 py-2 font-mono text-white/70">{fmt(p.medido)}<span className="text-white/25 ml-0.5 text-[9px]">{unidade}</span></td>
                    <td className={`px-3 py-2 font-mono ${p.erro === 0 ? 'text-green-400' : 'text-amber-400'}`}>
                      {sign(p.erro)}{fmt(p.erro)}<span className="text-white/25 ml-0.5 text-[9px]">{unidade}</span>
                    </td>
                    <td className={`px-3 py-2 font-mono font-semibold ${p.correcao > 0 ? 'text-teal' : p.correcao < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {sign(p.correcao)}{fmt(p.correcao)}<span className="text-white/25 ml-0.5 text-[9px]">{unidade}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-white/40">
                      {p.incerteza != null ? `±${fmt(p.incerteza)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[9px] text-white/25 mt-1.5 font-mono">
            Erro = Medido − Nominal · Correção = −Erro = Nominal − Medido
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-white/10 rounded-xl text-white/25">
          <Calculator size={22} className="mb-2 opacity-40" />
          <p className="text-xs">Analize o PDF com IA para extrair a tabela de calibração.</p>
          <p className="text-[10px] mt-1">Os pontos aparecerão aqui automaticamente.</p>
        </div>
      )}

      {/* ── Modo de interpolação ─────────────────────────── */}
      <div className="flex gap-1 border-b border-white/8">
        {([
          { key: 'simple', label: 'Interpolação Simples', Icon: TrendingUp },
          { key: 'double', label: 'Interpolação Dupla',   Icon: Grid3X3 },
        ] as const).map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setMode(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium border-b-2 -mb-px transition-colors ${
              mode === key
                ? 'border-teal text-teal'
                : 'border-transparent text-white/35 hover:text-white/60'
            }`}
          >
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      {/* ── Interpolação Simples ─────────────────────────── */}
      {mode === 'simple' && (
        <div className="space-y-3">
          <p className="text-[10.5px] text-white/45 leading-relaxed">
            Interpola linearmente a correção para qualquer valor entre os pontos calibrados.
            Para valores fora do intervalo, usa o ponto extremo mais próximo (extrapolação plana).
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="font-mono text-[8px] tracking-[2px] text-white/35 uppercase block mb-1.5">
                Valor consultado{unidade ? ` (${unidade})` : ''}
              </label>
              <input
                type="number" step="any"
                className="input w-full text-sm"
                placeholder="Ex: 5.0"
                value={qs}
                onChange={e => setQs(e.target.value)}
              />
            </div>

            {rSimple ? (
              <div className="flex gap-2">
                <div className="bg-navy rounded-lg px-3 py-2 text-center min-w-[88px]">
                  <p className="font-mono text-[7.5px] text-white/30 uppercase tracking-wider mb-0.5">Erro</p>
                  <p className="font-mono text-sm text-amber-400 font-semibold">
                    {sign(rSimple.erro)}{fmt(rSimple.erro)}
                    <span className="text-[9px] text-white/25 ml-0.5">{unidade}</span>
                  </p>
                </div>
                <div className="bg-navy rounded-lg px-3 py-2 text-center min-w-[88px] border border-teal/20">
                  <p className="font-mono text-[7.5px] text-white/30 uppercase tracking-wider mb-0.5">Correção</p>
                  <p className="font-mono text-sm text-teal font-semibold">
                    {sign(rSimple.correcao)}{fmt(rSimple.correcao)}
                    <span className="text-[9px] text-white/25 ml-0.5">{unidade}</span>
                  </p>
                </div>
              </div>
            ) : qs && (
              <p className="text-[10px] text-amber-400/60">
                {pontos.length < 2 ? 'Necessário ≥ 2 pontos na tabela.' : 'Valor inválido.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Interpolação Dupla (bilinear) ────────────────── */}
      {mode === 'double' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 bg-blue-500/8 border border-blue-500/15 rounded-lg px-3 py-2.5">
            <Info size={12} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-300/80 leading-relaxed">
              Interpolação bilinear entre 4 pontos — útil quando a correção depende de dois parâmetros
              (ex: valor e temperatura, ou frequência e nível).
            </p>
          </div>

          {/* Labels das variáveis */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[8px] tracking-[2px] text-white/35 uppercase block mb-1">Nome Variável 1</label>
              <input className="input w-full text-xs" value={dbl.lbl1} onChange={e => setD('lbl1', e.target.value)} />
            </div>
            <div>
              <label className="font-mono text-[8px] tracking-[2px] text-white/35 uppercase block mb-1">Nome Variável 2</label>
              <input className="input w-full text-xs" value={dbl.lbl2} onChange={e => setD('lbl2', e.target.value)} />
            </div>
          </div>

          {/* Grade 2×2 */}
          <div>
            <p className="font-mono text-[8px] tracking-[2px] text-gold uppercase mb-2">Grade de referência — Correções nos 4 cantos</p>
            <div className="overflow-x-auto">
              <table className="text-[10.5px] w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-32 px-2 py-1.5 text-right font-mono text-[8px] text-white/30 uppercase">{dbl.lbl1} ↓ / {dbl.lbl2} →</th>
                    <th className="px-2 py-1.5 text-center font-mono text-[8px] text-white/30 uppercase">
                      <input placeholder="y₁ min" type="number" step="any" className="input text-center text-xs w-24"
                        value={dbl.y1} onChange={e => setD('y1', e.target.value)} />
                    </th>
                    <th className="px-2 py-1.5 text-center font-mono text-[8px] text-white/30 uppercase">
                      <input placeholder="y₂ max" type="number" step="any" className="input text-center text-xs w-24"
                        value={dbl.y2} onChange={e => setD('y2', e.target.value)} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-1.5 text-right">
                      <input placeholder="x₁ min" type="number" step="any" className="input text-center text-xs w-24"
                        value={dbl.x1} onChange={e => setD('x1', e.target.value)} />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input placeholder="C(x₁,y₁)" type="number" step="any" className="input text-center text-xs w-24 border-teal/30"
                        value={dbl.c11} onChange={e => setD('c11', e.target.value)} />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input placeholder="C(x₁,y₂)" type="number" step="any" className="input text-center text-xs w-24 border-teal/30"
                        value={dbl.c12} onChange={e => setD('c12', e.target.value)} />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5 text-right">
                      <input placeholder="x₂ max" type="number" step="any" className="input text-center text-xs w-24"
                        value={dbl.x2} onChange={e => setD('x2', e.target.value)} />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input placeholder="C(x₂,y₁)" type="number" step="any" className="input text-center text-xs w-24 border-teal/30"
                        value={dbl.c21} onChange={e => setD('c21', e.target.value)} />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input placeholder="C(x₂,y₂)" type="number" step="any" className="input text-center text-xs w-24 border-teal/30"
                        value={dbl.c22} onChange={e => setD('c22', e.target.value)} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Ponto de consulta */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid grid-cols-2 gap-3 flex-1">
              <div>
                <label className="font-mono text-[8px] tracking-[2px] text-white/35 uppercase block mb-1.5">
                  {dbl.lbl1} (consulta)
                </label>
                <input type="number" step="any" className="input w-full text-sm"
                  value={dbl.qx} onChange={e => setD('qx', e.target.value)} />
              </div>
              <div>
                <label className="font-mono text-[8px] tracking-[2px] text-white/35 uppercase block mb-1.5">
                  {dbl.lbl2} (consulta)
                </label>
                <input type="number" step="any" className="input w-full text-sm"
                  value={dbl.qy} onChange={e => setD('qy', e.target.value)} />
              </div>
            </div>
            {rDouble !== null && (
              <div className="bg-navy rounded-lg px-4 py-2.5 text-center min-w-[110px] border border-teal/20">
                <p className="font-mono text-[7.5px] text-white/30 uppercase tracking-wider mb-0.5">Correção</p>
                <p className="font-mono text-sm text-teal font-semibold">
                  {sign(rDouble)}{fmt(rDouble)}
                  <span className="text-[9px] text-white/25 ml-0.5">{unidade}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
