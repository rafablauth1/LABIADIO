'use client'

import { useState, useMemo } from 'react'
import { Calculator, TrendingUp, Grid3X3, Info } from 'lucide-react'

// ── Tipos ────────────────────────────────────────────────
export interface PontoCalib {
  fase?:       string   // 'L1' | 'L2' | 'L3' | 'Fase 1' | 'Fase 2' | 'Fase 3' | 'N'
  faixa?:      string   // ex: '100 V', '10 A', '−50 a 0 dBm'
  frequencia?: number   // Hz — presente em CA e RF
  nominal:     number   // valor nominal / referência (pode ser negativo em dB)
  medido:      number   // valor medido / indicação
  erro:        number   // medido − nominal
  correcao:    number   // nominal − medido = −erro
  incerteza?:  number   // incerteza expandida U (k=2), sempre positiva
}

interface Props {
  pontos:    PontoCalib[]
  grandeza?: string
  unidade?:  string
}

// ── Formatadores ─────────────────────────────────────────
function fmt(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs < 0.0001 || abs >= 1e7) return n.toExponential(3)
  if (abs < 1)    return n.toFixed(5).replace(/0+$/, '').replace(/\.$/, '')
  if (abs < 100)  return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  if (abs < 1000) return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function fmtFreq(hz: number): string {
  if (hz >= 1e9) return `${+(hz / 1e9).toFixed(3)} GHz`
  if (hz >= 1e6) return `${+(hz / 1e6).toFixed(3)} MHz`
  if (hz >= 1e3) return `${+(hz / 1e3).toFixed(3)} kHz`
  return `${hz} Hz`
}

function sign(n: number) { return n > 0 ? '+' : '' }

// ── Interpolação linear ──────────────────────────────────
function linearInterp(x: number, pts: PontoCalib[]) {
  if (pts.length < 2) return null
  const s = [...pts].sort((a, b) => a.nominal - b.nominal)
  if (x <= s[0].nominal) return { correcao: s[0].correcao, erro: s[0].erro }
  const last = s[s.length - 1]
  if (x >= last.nominal) return { correcao: last.correcao, erro: last.erro }
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i], b = s[i + 1]
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

// ── Interpolação bilinear ────────────────────────────────
function bilinear(
  x: number, y: number,
  x1: number, x2: number, y1: number, y2: number,
  c11: number, c12: number, c21: number, c22: number
) {
  if (x2 === x1 || y2 === y1) return null
  return (
    c11 * (x2 - x) * (y2 - y) +
    c21 * (x  - x1) * (y2 - y) +
    c12 * (x2 - x) * (y  - y1) +
    c22 * (x  - x1) * (y  - y1)
  ) / ((x2 - x1) * (y2 - y1))
}

// ── Helpers ──────────────────────────────────────────────
function unique<T>(arr: (T | undefined)[]): T[] {
  return [...new Set(arr.filter((v): v is T => v !== undefined && v !== null))]
}

// ── Componente principal ─────────────────────────────────
export default function CorrectionTab({ pontos, grandeza, unidade }: Props) {
  const uni = unidade || ''

  // detecta quais colunas opcionais existem
  const hasFase  = pontos.some(p => p.fase)
  const hasFreq  = pontos.some(p => p.frequencia != null)
  const faixas   = unique(pontos.map(p => p.faixa))
  const fases    = unique(pontos.map(p => p.fase))
  const multiRange = faixas.length > 1

  // filtros ativos
  const [filtFaixa, setFiltFaixa] = useState<string>('todas')
  const [filtFase,  setFiltFase]  = useState<string>('todas')

  // pontos filtrados para interpolar
  const ptsFiltrados = useMemo(() => pontos.filter(p =>
    (filtFaixa === 'todas' || p.faixa === filtFaixa) &&
    (filtFase  === 'todas' || p.fase  === filtFase)
  ), [pontos, filtFaixa, filtFase])

  // agrupamento por faixa para exibição da tabela
  const grupos = useMemo(() => {
    if (!multiRange) return [{ faixa: faixas[0] || null, pts: pontos }]
    const map = new Map<string, PontoCalib[]>()
    for (const p of pontos) {
      const k = p.faixa || '—'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(p)
    }
    return [...map.entries()].map(([faixa, pts]) => ({ faixa, pts }))
  }, [pontos, multiRange, faixas])

  // interpolação simples
  const [mode, setMode] = useState<'simple' | 'double'>('simple')
  const [qs, setQs]     = useState('')
  const rSimple = useMemo(() => {
    const x = parseFloat(qs)
    if (isNaN(x)) return null
    return linearInterp(x, ptsFiltrados)
  }, [qs, ptsFiltrados])

  // interpolação dupla
  const [dbl, setDbl] = useState({
    x1: '', x2: '', y1: '', y2: '',
    c11: '', c12: '', c21: '', c22: '',
    qx: '', qy: '',
    lbl1: grandeza || 'Grandeza', lbl2: 'Temperatura (°C)',
  })
  const setD = (k: keyof typeof dbl, v: string) => setDbl(p => ({ ...p, [k]: v }))
  const rDouble = useMemo(() => {
    const n = (k: keyof typeof dbl) => parseFloat(dbl[k] as string)
    const [x1,x2,y1,y2,c11,c12,c21,c22,qx,qy] =
      ['x1','x2','y1','y2','c11','c12','c21','c22','qx','qy'].map(k => n(k as keyof typeof dbl))
    if ([x1,x2,y1,y2,c11,c12,c21,c22,qx,qy].some(isNaN)) return null
    return bilinear(qx, qy, x1, x2, y1, y2, c11, c12, c21, c22)
  }, [dbl])

  // ── Renderiza uma linha da tabela ─────────────────────
  function Linha({ p }: { p: PontoCalib }) {
    return (
      <tr className="hover:bg-white/[0.025] transition-colors">
        {hasFase && (
          <td className="px-3 py-2">
            <span className="font-mono text-[10px] font-bold text-gold/80 bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded">
              {p.fase || '—'}
            </span>
          </td>
        )}
        {hasFreq && (
          <td className="px-3 py-2 font-mono text-[10px] text-white/50 whitespace-nowrap">
            {p.frequencia != null ? fmtFreq(p.frequencia) : '—'}
          </td>
        )}
        <td className="px-3 py-2 font-mono text-[10.5px] text-white/70 whitespace-nowrap">
          {fmt(p.nominal)}<span className="text-white/25 ml-0.5 text-[9px]">{uni}</span>
        </td>
        <td className="px-3 py-2 font-mono text-[10.5px] text-white/70 whitespace-nowrap">
          {fmt(p.medido)}<span className="text-white/25 ml-0.5 text-[9px]">{uni}</span>
        </td>
        <td className={`px-3 py-2 font-mono text-[10.5px] whitespace-nowrap ${p.erro === 0 ? 'text-green-400' : 'text-amber-400'}`}>
          {sign(p.erro)}{fmt(p.erro)}<span className="text-white/25 ml-0.5 text-[9px]">{uni}</span>
        </td>
        <td className={`px-3 py-2 font-mono text-[10.5px] font-semibold whitespace-nowrap
          ${p.correcao > 0 ? 'text-teal' : p.correcao < 0 ? 'text-red-400' : 'text-green-400'}`}>
          {sign(p.correcao)}{fmt(p.correcao)}<span className="text-white/25 ml-0.5 text-[9px]">{uni}</span>
        </td>
        <td className="px-3 py-2 font-mono text-[10px] text-white/40 whitespace-nowrap">
          {p.incerteza != null ? `±${fmt(p.incerteza)}` : '—'}
        </td>
      </tr>
    )
  }

  // ── Cabeçalho da tabela ──────────────────────────────
  function Thead() {
    return (
      <thead>
        <tr className="bg-navy/60 border-b border-white/8">
          {hasFase && <th className="px-3 py-2 text-left font-mono text-[7.5px] tracking-[1.5px] text-white/30 uppercase">Fase</th>}
          {hasFreq && <th className="px-3 py-2 text-left font-mono text-[7.5px] tracking-[1.5px] text-white/30 uppercase">Frequência</th>}
          {['Nominal','Medido','Erro','Correção','Incert. U'].map(h => (
            <th key={h} className="px-3 py-2 text-left font-mono text-[7.5px] tracking-[1.5px] text-white/30 uppercase whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Tabela de calibração ─────────────────────── */}
      {pontos.length > 0 ? (
        <div>
          <div className="flex items-baseline gap-3 mb-2">
            <p className="font-mono text-[8px] tracking-[2px] text-gold uppercase">
              {grandeza || 'Tabela de Resultados'}{uni ? ` — ${uni}` : ''}
            </p>
            {!multiRange && faixas[0] && (
              <span className="font-mono text-[9px] text-gold/50 border border-gold/15 bg-gold/5 px-2 py-0.5 rounded">
                {faixas[0]}
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/8">
            <table className="w-full text-[10.5px]">
              <Thead />
              <tbody className="divide-y divide-white/5">
                {grupos.map(({ faixa, pts }) => (
                  <>
                    {multiRange && (
                      <tr key={`faixa-${faixa}`} className="bg-white/[0.03]">
                        <td
                          colSpan={2 + (hasFase ? 1 : 0) + (hasFreq ? 1 : 0) + 3}
                          className="px-3 py-1.5"
                        >
                          <span className="font-mono text-[8px] tracking-[2px] text-white/40 uppercase">Faixa: </span>
                          <span className="font-mono text-[10px] text-white/70 font-semibold">{faixa}</span>
                        </td>
                      </tr>
                    )}
                    {pts.map((p, i) => <Linha key={`${faixa}-${i}`} p={p} />)}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[9px] text-white/25 mt-1.5 font-mono">
            Erro = Medido − Nominal · Correção = −Erro · Valores negativos válidos (ex: dBm, dB)
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-white/10 rounded-xl text-white/25">
          <Calculator size={22} className="mb-2 opacity-40" />
          <p className="text-xs">Analize o PDF com IA para extrair a tabela de calibração.</p>
        </div>
      )}

      {/* ── Seletor de interpolação ───────────────────── */}
      <div className="flex gap-1 border-b border-white/8">
        {([
          { key: 'simple', label: 'Interpolação Simples', Icon: TrendingUp },
          { key: 'double', label: 'Interpolação Dupla',   Icon: Grid3X3 },
        ] as const).map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setMode(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium border-b-2 -mb-px transition-colors ${
              mode === key ? 'border-teal text-teal' : 'border-transparent text-white/35 hover:text-white/60'
            }`}
          >
            <Icon size={11} />{label}
          </button>
        ))}
      </div>

      {/* ── Interpolação Simples ──────────────────────── */}
      {mode === 'simple' && (
        <div className="space-y-3">

          {/* Filtros de faixa e fase */}
          {(multiRange || fases.length > 1) && (
            <div className="flex flex-wrap gap-3">
              {multiRange && (
                <div className="flex-1 min-w-[120px]">
                  <label className="font-mono text-[8px] tracking-[2px] text-white/35 uppercase block mb-1">Faixa</label>
                  <select className="input w-full text-xs" value={filtFaixa} onChange={e => setFiltFaixa(e.target.value)}>
                    <option value="todas">Todas as faixas</option>
                    {faixas.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              )}
              {fases.length > 1 && (
                <div className="flex-1 min-w-[100px]">
                  <label className="font-mono text-[8px] tracking-[2px] text-white/35 uppercase block mb-1">Fase</label>
                  <div className="flex gap-1 flex-wrap">
                    {(['todas', ...fases] as string[]).map(f => (
                      <button key={f} onClick={() => setFiltFase(f)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                          filtFase === f
                            ? 'bg-gold/15 border-gold/40 text-gold'
                            : 'bg-transparent border-white/10 text-white/40 hover:text-white/60'
                        }`}
                      >{f === 'todas' ? 'Todas' : f}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-[10.5px] text-white/40 leading-relaxed">
            Interpola linearmente entre os pontos calibrados.
            {ptsFiltrados.length < 2 && pontos.length >= 2 && (
              <span className="text-amber-400/70"> — selecione uma faixa/fase específica com ≥ 2 pontos.</span>
            )}
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="font-mono text-[8px] tracking-[2px] text-white/35 uppercase block mb-1.5">
                Valor consultado{uni ? ` (${uni})` : ''}
              </label>
              <input type="number" step="any" className="input w-full text-sm"
                placeholder={uni === 'dBm' || uni === 'dB' ? 'Ex: −20' : 'Ex: 100'}
                value={qs} onChange={e => setQs(e.target.value)}
              />
            </div>

            {rSimple && (
              <div className="flex gap-2 flex-wrap">
                {/* Configuração ativa */}
                {(filtFaixa !== 'todas' || filtFase !== 'todas' || (faixas.length === 1 && faixas[0])) && (
                  <div className="bg-gold/5 border border-gold/15 rounded-lg px-3 py-2 text-center">
                    <p className="font-mono text-[7.5px] text-white/30 uppercase tracking-wider mb-0.5">Configuração</p>
                    <p className="font-mono text-[10.5px] text-gold/80 font-semibold leading-tight">
                      {filtFaixa !== 'todas' ? filtFaixa : faixas[0] || '—'}
                      {filtFase !== 'todas' && (
                        <span className="block text-[9px] text-gold/50">{filtFase}</span>
                      )}
                    </p>
                  </div>
                )}
                <div className="bg-navy rounded-lg px-3 py-2 text-center min-w-[90px]">
                  <p className="font-mono text-[7.5px] text-white/30 uppercase tracking-wider mb-0.5">Erro</p>
                  <p className="font-mono text-sm text-amber-400 font-semibold">
                    {sign(rSimple.erro)}{fmt(rSimple.erro)}
                    <span className="text-[9px] text-white/25 ml-0.5">{uni}</span>
                  </p>
                </div>
                <div className="bg-navy rounded-lg px-3 py-2 text-center min-w-[90px] border border-teal/20">
                  <p className="font-mono text-[7.5px] text-white/30 uppercase tracking-wider mb-0.5">Correção</p>
                  <p className="font-mono text-sm text-teal font-semibold">
                    {sign(rSimple.correcao)}{fmt(rSimple.correcao)}
                    <span className="text-[9px] text-white/25 ml-0.5">{uni}</span>
                  </p>
                </div>
              </div>
            )}
            {qs && !rSimple && (
              <p className="text-[10px] text-amber-400/60">
                {ptsFiltrados.length < 2 ? 'Necessário ≥ 2 pontos.' : 'Valor inválido.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Interpolação Dupla ───────────────────────── */}
      {mode === 'double' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 bg-blue-500/8 border border-blue-500/15 rounded-lg px-3 py-2.5">
            <Info size={12} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-300/80 leading-relaxed">
              Interpolação bilinear — quando a correção depende de 2 parâmetros simultâneos
              (ex: nível + frequência para RF, ou grandeza + temperatura para CA).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'lbl1', label: 'Nome Variável 1' },
              { k: 'lbl2', label: 'Nome Variável 2' },
            ].map(({ k, label }) => (
              <div key={k}>
                <label className="font-mono text-[8px] tracking-[2px] text-white/35 uppercase block mb-1">{label}</label>
                <input className="input w-full text-xs" value={dbl[k as keyof typeof dbl]}
                  onChange={e => setD(k as keyof typeof dbl, e.target.value)} />
              </div>
            ))}
          </div>

          <div>
            <p className="font-mono text-[8px] tracking-[2px] text-gold uppercase mb-2">
              Grade 2×2 — Correção nos 4 cantos
            </p>
            <div className="overflow-x-auto">
              <table className="text-[10.5px] border-collapse">
                <thead>
                  <tr>
                    <th className="px-2 py-1.5 text-right font-mono text-[8px] text-white/30 whitespace-nowrap">
                      {dbl.lbl1} ↓ / {dbl.lbl2} →
                    </th>
                    {(['y1','y2'] as const).map((k, i) => (
                      <th key={k} className="px-2 py-1.5">
                        <input placeholder={i === 0 ? 'y₁ (min)' : 'y₂ (max)'}
                          type="number" step="any" className="input text-center text-xs w-24"
                          value={dbl[k]} onChange={e => setD(k, e.target.value)} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([['x1','c11','c12'],['x2','c21','c22']] as const).map(([xk, c1k, c2k], i) => (
                    <tr key={xk}>
                      <td className="px-2 py-1.5 text-right">
                        <input placeholder={i === 0 ? 'x₁ (min)' : 'x₂ (max)'}
                          type="number" step="any" className="input text-center text-xs w-24"
                          value={dbl[xk]} onChange={e => setD(xk, e.target.value)} />
                      </td>
                      {([c1k, c2k] as const).map(ck => (
                        <td key={ck} className="px-2 py-1.5 text-center">
                          <input type="number" step="any" className="input text-center text-xs w-24 border-teal/25"
                            placeholder="Correção" value={dbl[ck]} onChange={e => setD(ck, e.target.value)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="grid grid-cols-2 gap-3 flex-1">
              {([['qx', dbl.lbl1], ['qy', dbl.lbl2]] as const).map(([k, label]) => (
                <div key={k}>
                  <label className="font-mono text-[8px] tracking-[2px] text-white/35 uppercase block mb-1.5">
                    {label} (consulta)
                  </label>
                  <input type="number" step="any" className="input w-full text-sm"
                    value={dbl[k]} onChange={e => setD(k, e.target.value)} />
                </div>
              ))}
            </div>
            {rDouble !== null && (
              <div className="bg-navy rounded-lg px-4 py-2.5 text-center min-w-[110px] border border-teal/20">
                <p className="font-mono text-[7.5px] text-white/30 uppercase tracking-wider mb-0.5">Correção</p>
                <p className="font-mono text-sm text-teal font-semibold">
                  {sign(rDouble)}{fmt(rDouble)}
                  <span className="text-[9px] text-white/25 ml-0.5">{uni}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
