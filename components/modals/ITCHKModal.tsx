'use client'

import { useState, useRef, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { useEquipamentos } from '@/lib/hooks/useEquipamentos'
import { Upload, Sparkles, Loader2, AlertCircle, Check, FileText, Pencil, Trash2 } from 'lucide-react'

interface Props { open: boolean; onClose: () => void }

interface Ponto {
  grandeza: string
  unidade: string
  valor_referencia: string
  valor_medido: string
  criterio: string
  resultado: 'Conforme' | 'Não conforme' | 'Não avaliado'
}

type Step = 'upload' | 'form' | 'done'

const UNIDADES_HINT: Record<string, string> = {
  'tensão alternada': 'V (rms)',
  'tensão ca': 'V (rms)',
  'tensão cc': 'V',
  'corrente': 'A',
  'thd': '%',
  'frequência': 'Hz',
  'potência': 'W',
  'resistência': 'Ω',
  'temperatura': '°C',
  'umidade': '%RH',
}

function guessUnit(grandeza: string): string {
  const g = grandeza.toLowerCase()
  for (const [hint, unit] of Object.entries(UNIDADES_HINT)) {
    if (g.includes(hint)) return unit
  }
  return ''
}

function calcResultado(medido: string, referencia: string, criterio: string): Ponto['resultado'] {
  if (!medido || !referencia) return 'Não avaliado'
  const m = parseFloat(medido.replace(',', '.'))
  const r = parseFloat(referencia.replace(',', '.'))
  if (isNaN(m) || isNaN(r)) return 'Não avaliado'

  // Critério tipo "± X" ou "± X%"
  const pm = criterio.match(/[±+\-]?\s*([\d.,]+)\s*(%?)/)
  if (pm) {
    const tol = parseFloat(pm[1].replace(',', '.'))
    const isPct = pm[2] === '%'
    const limite = isPct ? r * (tol / 100) : tol
    return Math.abs(m - r) <= limite ? 'Conforme' : 'Não conforme'
  }
  return 'Não avaliado'
}

export default function ITCHKModal({ open, onClose }: Props) {
  const supabase = createClient()
  const { equip: listaEquip } = useEquipamentos()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [file, setFile] = useState<File | null>(null)

  // Dados extraídos da IA
  const [itData, setItData] = useState<any>(null)

  // Campos da checagem
  const [equipId, setEquipId] = useState('')
  const [data, setData]       = useState('')
  const [tecnico, setTecnico] = useState('')
  const [obs, setObs]         = useState('')

  // Tabela de pontos de medição
  const [pontos, setPontos] = useState<Ponto[]>([])

  function reset() {
    setStep('upload'); setError(''); setFileName(''); setFile(null)
    setItData(null); setEquipId(''); setData(''); setTecnico('')
    setObs(''); setPontos([])
  }

  // Auto-detecta o equipamento pela TAG extraída
  useEffect(() => {
    if (!itData?.tag || listaEquip.length === 0) return
    const found = listaEquip.find(e => e.tag.toUpperCase() === itData.tag.toUpperCase())
    if (found) setEquipId(found.id)
  }, [itData, listaEquip])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setFileName(f.name)
    setError('')
  }

  async function analisar() {
    if (!file) { setError('Selecione um arquivo PDF.'); return }
    setAnalyzing(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('tipo', 'it_chk')
      const res = await fetch('/api/analyze-pdf', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Erro ao analisar PDF.'); return }

      setItData(json)

      // Cria pontos iniciais para cada grandeza extraída
      const grandezas: string[] = Array.isArray(json.grandezas) ? json.grandezas : []
      setPontos(grandezas.map(g => ({
        grandeza: g,
        unidade: guessUnit(g),
        valor_referencia: '',
        valor_medido: '',
        criterio: '',
        resultado: 'Não avaliado',
      })))

      setStep('form')
    } catch {
      setError('Falha ao conectar com a IA.')
    } finally {
      setAnalyzing(false)
    }
  }

  function updatePonto(i: number, field: keyof Ponto, value: string) {
    setPontos(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      // Recalcula resultado automaticamente
      const p = next[i]
      next[i].resultado = calcResultado(
        field === 'valor_medido'   ? value : p.valor_medido,
        field === 'valor_referencia' ? value : p.valor_referencia,
        field === 'criterio'         ? value : p.criterio,
      )
      return next
    })
  }

  function addPonto() {
    setPontos(prev => [...prev, { grandeza: '', unidade: '', valor_referencia: '', valor_medido: '', criterio: '', resultado: 'Não avaliado' }])
  }

  function removePonto(i: number) {
    setPontos(prev => prev.filter((_, idx) => idx !== i))
  }

  async function salvar() {
    if (!equipId) { setError('Selecione o equipamento.'); return }
    if (!data)    { setError('Informe a data da checagem.'); return }

    // Resultado geral = Conforme só se todos os pontos avaliados forem Conforme
    const avaliados = pontos.filter(p => p.resultado !== 'Não avaliado')
    const resultadoGeral = avaliados.length === 0 ? 'Conforme'
      : avaliados.every(p => p.resultado === 'Conforme') ? 'Conforme'
      : avaliados.some(p => p.resultado === 'Não conforme') ? 'Não conforme'
      : 'Parcialmente conforme'

    setSaving(true)
    const { error: err } = await supabase.from('checagens').insert({
      equip_id:    equipId,
      data,
      tecnico:     tecnico || null,
      norma:       itData?.normas?.[0] || null,
      resultado:   resultadoGeral,
      obs:         obs || `IT: ${itData?.cod || fileName}`,
      medidos:     pontos.map((p, i) => ({ _linha: i + 1, ...p })),
    })
    setSaving(false)
    if (err) { setError('Erro ao salvar: ' + err.message); return }
    setStep('done')
  }

  const inp  = 'w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50'
  const inp2 = 'w-full bg-navy/60 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50'

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title="Checagem via IT CHK"
      size="lg"
      footer={
        step === 'upload' ? (
          <>
            <button className="btn-secondary text-xs" onClick={() => { reset(); onClose() }}>Cancelar</button>
            <button className="btn-primary text-xs" onClick={analisar} disabled={analyzing || !file}>
              {analyzing ? <><Loader2 size={13} className="animate-spin" /> Analisando...</> : <><Sparkles size={13} /> Analisar PDF</>}
            </button>
          </>
        ) : step === 'form' ? (
          <>
            <button className="btn-secondary text-xs" onClick={() => setStep('upload')}>Voltar</button>
            <button className="btn-primary text-xs" onClick={salvar} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Checagem'}
            </button>
          </>
        ) : (
          <button className="btn-primary text-xs" onClick={() => { reset(); onClose() }}>Fechar</button>
        )
      }
    >

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div className="flex flex-col gap-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-white/15 rounded-xl p-10 text-center cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition-colors"
          >
            <FileText size={32} className="mx-auto mb-3 text-white/30" />
            <p className="text-sm text-white/60 mb-1">
              {fileName
                ? <span className="text-white/80 font-medium">{fileName}</span>
                : 'Clique para selecionar a IT CHK em PDF'}
            </p>
            <p className="text-[10px] text-white/30 font-mono">PDF · Instrução de Trabalho de Checagem Intermediária</p>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
          </div>

          <div className="bg-teal/5 border border-teal/20 rounded-lg px-4 py-3 text-[11.5px] text-teal/80">
            A IA vai extrair automaticamente: <strong>TAG</strong>, <strong>grandezas medidas</strong>, <strong>equipamentos auxiliares</strong>, <strong>normas</strong> e <strong>processo de checagem</strong>.
          </div>

          {error && (
            <div className="flex items-center gap-2 text-danger text-[11px] bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Form + tabela de pontos ── */}
      {step === 'form' && itData && (
        <div className="flex flex-col gap-5">

          {/* Cabeçalho extraído */}
          <div className="bg-navy/60 border border-white/8 rounded-xl p-4 grid grid-cols-2 gap-x-8 gap-y-2.5 text-[11.5px]">
            <div className="col-span-2 flex items-center justify-between mb-1">
              <span className="font-mono text-[8.5px] tracking-[2px] text-gold uppercase">Dados extraídos da IT</span>
              <span className="font-mono text-[9px] text-white/30">{itData.cod} — Rev. {itData.revisao}</span>
            </div>
            <InfoRow label="TAG"            value={itData.tag} />
            <InfoRow label="Equipamento"    value={itData.descricao} />
            <InfoRow label="Equipamento Aux." value={itData.equipamentos_aux} />
            <InfoRow label="Norma"          value={itData.normas?.join(', ')} />
            {itData.processo && (
              <div className="col-span-2">
                <span className="font-mono text-[8px] tracking-widest text-white/30 uppercase">Processo</span>
                <p className="text-white/60 mt-0.5 leading-relaxed">{itData.processo}</p>
              </div>
            )}
          </div>

          {/* Campos da checagem */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3">
              <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Equipamento *</label>
              <select className={inp} value={equipId} onChange={e => setEquipId(e.target.value)}>
                <option value="">Selecionar...</option>
                {listaEquip.map(e => <option key={e.id} value={e.id}>{e.tag} — {e.descricao}</option>)}
              </select>
              {equipId && <p className="text-[9px] text-success/70 font-mono mt-1">✓ Equipamento detectado automaticamente pela TAG</p>}
            </div>
            <div>
              <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Data *</label>
              <input type="date" className={inp} value={data} onChange={e => setData(e.target.value)} />
            </div>
            <div>
              <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Técnico</label>
              <input className={inp} value={tecnico} onChange={e => setTecnico(e.target.value)} placeholder="Nome" />
            </div>
            <div>
              <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Observações</label>
              <input className={inp} value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          {/* Tabela de pontos de medição */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] tracking-[2px] text-gold uppercase">Pontos de Medição</span>
              <button onClick={addPonto} className="text-[9px] font-mono text-teal/70 hover:text-teal transition-colors">
                + Adicionar grandeza
              </button>
            </div>
            <div className="rounded-xl border border-white/8 overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-navy border-b border-white/7">
                    {['GRANDEZA', 'UNIDADE', 'VLR. REFERÊNCIA', 'VLR. MEDIDO', 'CRITÉRIO', 'RESULTADO', ''].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-mono text-[7.5px] tracking-[1.5px] text-white/30 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pontos.map((p, i) => (
                    <tr key={i} className="hover:bg-white/2">
                      <td className="px-3 py-2">
                        <input value={p.grandeza} onChange={e => updatePonto(i, 'grandeza', e.target.value)}
                          className={inp2} placeholder="Ex: Tensão CA" />
                      </td>
                      <td className="px-3 py-2 w-24">
                        <input value={p.unidade} onChange={e => updatePonto(i, 'unidade', e.target.value)}
                          className={inp2} placeholder="V, %, Hz..." />
                      </td>
                      <td className="px-3 py-2 w-32">
                        <input value={p.valor_referencia} onChange={e => updatePonto(i, 'valor_referencia', e.target.value)}
                          className={inp2} placeholder="Do certificado" />
                      </td>
                      <td className="px-3 py-2 w-28">
                        <input value={p.valor_medido} onChange={e => updatePonto(i, 'valor_medido', e.target.value)}
                          className={inp2} placeholder="Medido" />
                      </td>
                      <td className="px-3 py-2 w-28">
                        <input value={p.criterio} onChange={e => updatePonto(i, 'criterio', e.target.value)}
                          className={inp2} placeholder="± 1%" />
                      </td>
                      <td className="px-3 py-2 w-28">
                        <span className={`badge text-[8.5px] ${
                          p.resultado === 'Conforme'     ? 'badge-success' :
                          p.resultado === 'Não conforme' ? 'badge-danger'  : 'bg-white/8 text-white/30 border border-white/10'
                        }`}>
                          {p.resultado === 'Não avaliado' ? '—' : p.resultado}
                        </span>
                      </td>
                      <td className="px-3 py-2 w-8">
                        <button onClick={() => removePonto(i)} className="text-white/20 hover:text-danger transition-colors">
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pontos.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-white/25 italic text-sm">
                        Nenhuma grandeza. Clique em "+ Adicionar grandeza".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-white/25 font-mono mt-1.5">
              O resultado é calculado automaticamente quando Valor Referência, Valor Medido e Critério estão preenchidos.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-danger text-[11px] bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Sucesso ── */}
      {step === 'done' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-12 h-12 rounded-full bg-success/20 border border-success/30 flex items-center justify-center">
            <Check size={22} className="text-success" />
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-white mb-1">Checagem registrada!</p>
            <p className="text-sm text-white/50">Pontos de medição salvos e disponíveis para consulta no histórico.</p>
          </div>
        </div>
      )}
    </Modal>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="font-mono text-[8px] tracking-widest text-white/30 uppercase">{label} </span>
      <span className="text-white/70">{value || '—'}</span>
    </div>
  )
}
