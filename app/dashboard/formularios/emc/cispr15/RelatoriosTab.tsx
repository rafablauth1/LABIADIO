'use client'

import { useState, useEffect } from 'react'
import { FileText, Trash2, FolderOpen, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type RelatorioSalvo, RELATORIOS_KEY, RELATORIO_DOCX_PFX, CFG_KEY, PHOTOS_KEY, DOCX_HTML_KEY, DOCX_NAME_KEY, EMENDA_DRAFT_KEY } from './types'

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

interface Props {
  onCarregar: (entry: RelatorioSalvo) => void
  onVerPDF:   (entry: RelatorioSalvo) => void
}

export function RelatoriosTab({ onCarregar, onVerPDF }: Props) {
  const [lista,    setLista]    = useState<RelatorioSalvo[]>([])
  const [busca,    setBusca]    = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RELATORIOS_KEY)
      if (raw) setLista(JSON.parse(raw))
    } catch {}
  }, [])

  function remover(id: string) {
    if (!confirm('Remover este relatório do histórico local?')) return
    const updated = lista.filter(r => r.id !== id)
    setLista(updated)
    localStorage.setItem(RELATORIOS_KEY, JSON.stringify(updated))
    localStorage.removeItem(RELATORIO_DOCX_PFX + id)
  }

  const filtrados = busca.trim()
    ? lista.filter(r =>
        r.numRelatorio.toLowerCase().includes(busca.toLowerCase()) ||
        r.clienteNome.toLowerCase().includes(busca.toLowerCase()) ||
        r.protocolo.toLowerCase().includes(busca.toLowerCase()) ||
        r.produto.toLowerCase().includes(busca.toLowerCase())
      )
    : lista

  if (lista.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-white/20">
        <FileText size={36} strokeWidth={1} />
        <p className="text-sm">Nenhum relatório gerado ainda.</p>
        <p className="text-xs text-white/15">Os relatórios gerados aparecerão aqui automaticamente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <input
        className="input text-sm w-full"
        placeholder="Buscar por N° relatório, cliente, protocolo ou produto…"
        value={busca}
        onChange={e => setBusca(e.target.value)}
      />

      {filtrados.length === 0 ? (
        <p className="text-center py-8 text-white/20 text-sm">Nenhum resultado encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtrados.map(r => {
            const isOpen = expanded === r.id
            const hasDocx = !!localStorage.getItem(RELATORIO_DOCX_PFX + r.id)
            return (
              <div key={r.id} className="card overflow-hidden">
                {/* linha principal */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gold font-mono">
                        {r.numRelatorio || '—'}
                      </span>
                      <span className={cn(
                        'text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border',
                        r.cfg.tipo === 'lampada'
                          ? 'text-amber-400/70 border-amber-400/20 bg-amber-400/5'
                          : 'text-teal/70 border-teal/20 bg-teal/5'
                      )}>
                        {r.cfg.tipo === 'lampada' ? 'Lâmpada' : 'Luminária'}
                      </span>
                      {r.emendas.length > 0 && (
                        <span className="text-[9px] font-mono text-red-400/60 border border-red-400/20 bg-red-400/5 px-1.5 py-0.5 rounded">
                          {r.emendas.length} emenda{r.emendas.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/60 mt-0.5 truncate">{r.clienteNome || '—'}</p>
                    <p className="text-[10px] text-white/30 font-mono truncate">
                      {r.produto || '—'} · Prot. {r.protocolo || '—'} · {fmtDate(r.dataEmissao)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onVerPDF(r)}
                      title="Ver / Baixar PDF"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gold/8 border border-gold/20 text-gold text-[11px] font-semibold hover:bg-gold/18 transition-all">
                      <FileText size={11} /> PDF
                    </button>
                    <button
                      onClick={() => onCarregar(r)}
                      title="Carregar no formulário"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal/8 border border-teal/20 text-teal text-[11px] font-semibold hover:bg-teal/15 transition-all">
                      <FolderOpen size={11} /> Carregar
                    </button>
                    <button
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                      className="w-7 h-7 rounded-lg border border-white/10 text-white/30 hover:text-white/60 flex items-center justify-center transition-all">
                      {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <button
                      onClick={() => remover(r.id)}
                      className="w-7 h-7 rounded-lg border border-white/10 text-white/30 hover:text-red-400 hover:border-red/30 flex items-center justify-center transition-all">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* detalhe expandido */}
                {isOpen && (
                  <div className="border-t border-white/5 px-4 py-3 space-y-2 bg-navy/40">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                      <Row label="N° Relatório"   value={r.numRelatorio} />
                      <Row label="Data Emissão"   value={fmtDate(r.dataEmissao)} />
                      <Row label="Cliente"        value={r.clienteNome} />
                      <Row label="Protocolo"      value={r.protocolo} />
                      <Row label="Produto"        value={r.produto} />
                      <Row label="Modelo"         value={r.cfg.modelo} />
                      <Row label="Fabricante"     value={r.cfg.fabricante} />
                      <Row label="Responsável"    value={r.cfg.responsavel} />
                      <Row label="Fotos"          value={`${r.photos.length} arquivo(s)`} />
                      <Row label="DOCX"           value={r.docxFilename || '—'} />
                    </div>
                    {!hasDocx && (
                      <div className="flex items-center gap-2 text-[10px] text-amber-400/70 bg-amber-500/6 border border-amber-500/15 rounded px-2.5 py-1.5">
                        <AlertTriangle size={11} />
                        DOCX não salvo — re-faça upload do .docx para regenerar o PDF com resultados.
                      </div>
                    )}
                    {r.emendas.length > 0 && (
                      <div className="text-[10px] text-white/30 font-mono">
                        {r.emendas.map(e => (
                          <span key={e.numero} className="mr-3">
                            Emenda {e.numero}: {fmtDate(e.dataEmenda)} ({e.alteracoes.length} alteração{e.alteracoes.length !== 1 ? 'ões' : ''})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-white/25 font-mono uppercase tracking-wider text-[9px]">{label}: </span>
      <span className="text-white/60">{value || '—'}</span>
    </div>
  )
}
