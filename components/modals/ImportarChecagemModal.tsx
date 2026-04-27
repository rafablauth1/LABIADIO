'use client'

import { useState, useRef, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { useEquipamentos } from '@/lib/hooks/useEquipamentos'
import { Upload, FileSpreadsheet, AlertCircle, Check } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Props { open: boolean; onClose: () => void }

// Tenta detectar automaticamente qual coluna mapeia para qual campo
const FIELD_HINTS: Record<string, string[]> = {
  data:        ['data', 'date', 'dia'],
  tecnico:     ['tecnico', 'técnico', 'operador', 'operator', 'responsavel'],
  norma:       ['norma', 'norm', 'standard'],
  resultado:   ['resultado', 'result', 'status', 'situacao'],
  temperatura: ['temperatura', 'temp', 'temperature'],
  umidade:     ['umidade', 'humidity', 'rh', 'ur'],
}

function detectField(header: string): string | null {
  const h = header.toLowerCase().trim()
  for (const [field, hints] of Object.entries(FIELD_HINTS)) {
    if (hints.some(hint => h.includes(hint))) return field
  }
  return null
}

type Step = 'upload' | 'preview' | 'done'

export default function ImportarChecagemModal({ open, onClose }: Props) {
  const supabase = createClient()
  const { equip } = useEquipamentos()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Campos do cabeçalho da checagem
  const [equipId, setEquipId] = useState('')
  const [data, setData]       = useState('')
  const [tecnico, setTecnico] = useState('')
  const [norma, setNorma]     = useState('')

  // Dados do Excel
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders]   = useState<string[]>([])
  const [rows, setRows]         = useState<Record<string, any>[]>([])
  const [preview, setPreview]   = useState<Record<string, any>[]>([])

  // Mapeamento coluna → campo do sistema
  const [mapping, setMapping] = useState<Record<string, string>>({})

  function reset() {
    setStep('upload'); setError(''); setFileName(''); setHeaders([])
    setRows([]); setPreview([]); setMapping({}); setEquipId('')
    setData(''); setTecnico(''); setNorma('')
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError('')

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        if (json.length < 2) { setError('Planilha vazia ou sem dados.'); return }

        // Primeira linha não-vazia = cabeçalhos
        const hdrs = (json[0] as any[]).map(h => String(h).trim()).filter(Boolean)
        const dataRows = json.slice(1).filter(r => r.some((c: any) => c !== ''))
          .map(row => {
            const obj: Record<string, any> = {}
            hdrs.forEach((h, i) => { obj[h] = row[i] ?? '' })
            return obj
          })

        // Auto-mapeamento
        const autoMap: Record<string, string> = {}
        hdrs.forEach(h => {
          const field = detectField(h)
          if (field) autoMap[h] = field
        })

        setHeaders(hdrs)
        setRows(dataRows)
        setPreview(dataRows.slice(0, 5))
        setMapping(autoMap)
        setStep('preview')
      } catch {
        setError('Erro ao ler o arquivo. Verifique se é um .xlsx/.xls válido.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function salvar() {
    if (!equipId) { setError('Selecione o equipamento.'); return }
    if (!data)    { setError('Informe a data da checagem.'); return }
    if (rows.length === 0) { setError('Nenhum ponto encontrado.'); return }

    setSaving(true)
    setError('')

    // Extrai campos mapeados e guarda o restante como pontos brutos
    const pontos = rows.map((row, i) => {
      const ponto: Record<string, any> = { _linha: i + 1 }
      headers.forEach(h => {
        const campo = mapping[h]
        // Campos mapeados para campos conhecidos ficam fora dos pontos
        if (!campo || !['data','tecnico','norma','resultado','temperatura','umidade'].includes(campo)) {
          ponto[h] = row[h]
        }
      })
      return ponto
    })

    // Usa dados mapeados da primeira linha como fallback, se não preenchido manualmente
    const primeiraLinha = rows[0] || {}
    function getMapped(field: string) {
      const col = Object.entries(mapping).find(([, f]) => f === field)?.[0]
      return col ? String(primeiraLinha[col] || '') : ''
    }

    const payload = {
      equip_id:    equipId,
      data:        data,
      tecnico:     tecnico || getMapped('tecnico') || null,
      norma:       norma   || getMapped('norma')   || null,
      resultado:   getMapped('resultado') || 'Conforme',
      temperatura: null as number | null,
      umidade:     null as number | null,
      obs:         `Importado de: ${fileName} (${rows.length} pontos)`,
      medidos:     pontos,
    }

    const tempStr = getMapped('temperatura')
    const umidStr = getMapped('umidade')
    if (tempStr) payload.temperatura = parseFloat(tempStr) || null
    if (umidStr) payload.umidade = parseFloat(umidStr) || null

    const { error: err } = await supabase.from('checagens').insert(payload)
    setSaving(false)
    if (err) { setError('Erro ao salvar: ' + err.message); return }
    setStep('done')
  }

  const inp = 'w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50'
  const sel = inp

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title="Importar Checagem via Excel"
      size="lg"
      footer={
        step === 'upload' ? (
          <button className="btn-secondary text-xs" onClick={() => { reset(); onClose() }}>Cancelar</button>
        ) : step === 'preview' ? (
          <>
            <button className="btn-secondary text-xs" onClick={() => setStep('upload')}>Voltar</button>
            <button className="btn-primary text-xs" onClick={salvar} disabled={saving}>
              {saving ? 'Salvando...' : `Importar ${rows.length} pontos`}
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
            className="border-2 border-dashed border-white/15 rounded-xl p-10 text-center cursor-pointer
                       hover:border-gold/40 hover:bg-gold/5 transition-colors"
          >
            <FileSpreadsheet size={32} className="mx-auto mb-3 text-white/30" />
            <p className="text-sm text-white/60 mb-1">
              {fileName ? <span className="text-white/80 font-medium">{fileName}</span> : 'Clique para selecionar o arquivo Excel'}
            </p>
            <p className="text-[10px] text-white/30 font-mono">.xlsx · .xls · .csv</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Equipamento *</label>
              <select className={sel} value={equipId} onChange={e => setEquipId(e.target.value)}>
                <option value="">Selecionar...</option>
                {equip.map(e => <option key={e.id} value={e.id}>{e.tag} — {e.descricao}</option>)}
              </select>
            </div>
            <div>
              <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Data da Checagem *</label>
              <input type="date" className={inp} value={data} onChange={e => setData(e.target.value)} />
            </div>
            <div>
              <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Técnico</label>
              <input className={inp} value={tecnico} onChange={e => setTecnico(e.target.value)} placeholder="Nome" />
            </div>
            <div className="col-span-2">
              <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Norma</label>
              <input className={inp} value={norma} onChange={e => setNorma(e.target.value)} placeholder="Ex: IEC 61000-4-2" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-danger text-[11px] bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Preview + mapeamento ── */}
      {step === 'preview' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/70">
              <span className="font-mono text-gold">{rows.length}</span> pontos lidos de <span className="font-mono text-white/50">{fileName}</span>
            </p>
            <p className="text-[10px] text-white/30 font-mono">{headers.length} colunas detectadas</p>
          </div>

          {/* Mapeamento de colunas */}
          <div>
            <p className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase mb-2">Mapeamento de Colunas</p>
            <div className="grid grid-cols-2 gap-2">
              {headers.map(h => (
                <div key={h} className="flex items-center gap-2 bg-navy/60 rounded-lg px-3 py-2">
                  <span className="font-mono text-[10px] text-white/60 flex-1 truncate">{h}</span>
                  <span className="text-white/20 text-xs">→</span>
                  <select
                    className="bg-transparent border border-white/10 rounded px-2 py-1 text-[10px] text-white/70 focus:outline-none focus:border-gold/50 w-32"
                    value={mapping[h] || ''}
                    onChange={e => setMapping(p => ({ ...p, [h]: e.target.value }))}
                  >
                    <option value="">ponto (bruto)</option>
                    <option value="data">Data</option>
                    <option value="tecnico">Técnico</option>
                    <option value="norma">Norma</option>
                    <option value="resultado">Resultado</option>
                    <option value="temperatura">Temperatura</option>
                    <option value="umidade">Umidade</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview da tabela */}
          <div>
            <p className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase mb-2">
              Preview — primeiras {preview.length} linhas
            </p>
            <div className="overflow-x-auto rounded-lg border border-white/7">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-navy border-b border-white/7">
                    {headers.map(h => (
                      <th key={h} className="px-3 py-2 text-left font-mono text-[8px] tracking-widest text-white/35 whitespace-nowrap">
                        {h}
                        {mapping[h] && <span className="ml-1 text-gold/60">→{mapping[h]}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-white/3">
                      {headers.map(h => (
                        <td key={h} className="px-3 py-2 text-white/60 whitespace-nowrap max-w-[120px] truncate">
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 5 && (
              <p className="text-[10px] text-white/25 font-mono mt-1">+ {rows.length - 5} linhas adicionais</p>
            )}
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
            <p className="font-display font-bold text-white mb-1">Importação concluída!</p>
            <p className="text-sm text-white/50">{rows.length} pontos importados com sucesso.</p>
          </div>
        </div>
      )}
    </Modal>
  )
}
