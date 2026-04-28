'use client'

import { useState, useEffect, Suspense } from 'react'
import { Plus, FileText, Paperclip, Search } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NormaModal from '@/components/modals/NormaModal'

const NORMAS_DEFAULT = [
  { norma: 'IEC 61000-4-2',  versao: '2008', titulo: 'ESD — Electrostatic Discharge Immunity',            ensaio: 'Imunidade' },
  { norma: 'IEC 61000-4-3',  versao: '2020', titulo: 'Radiated RF Electromagnetic Field Immunity',        ensaio: 'Imunidade' },
  { norma: 'IEC 61000-4-4',  versao: '2012', titulo: 'EFT/Burst — Electrical Fast Transient',             ensaio: 'Imunidade' },
  { norma: 'IEC 61000-4-5',  versao: '2014', titulo: 'Surge Immunity',                                    ensaio: 'Imunidade' },
  { norma: 'IEC 61000-4-6',  versao: '2013', titulo: 'Conducted Disturbances Immunity',                   ensaio: 'Imunidade' },
  { norma: 'IEC 61000-4-11', versao: '2020', titulo: 'Voltage Dips, Interruptions and Variations',        ensaio: 'Imunidade' },
  { norma: 'IEC 61000-4-19', versao: '2014', titulo: 'Differential Mode Disturbances',                    ensaio: 'Imunidade' },
  { norma: 'CISPR 15',       versao: '2018', titulo: 'Limits for RF Disturbances — Lighting Equipment',   ensaio: 'Emissão' },
  { norma: 'IEC 61000-3-2',  versao: '2018', titulo: 'Limits for Harmonic Current Emissions',             ensaio: 'Emissão' },
]

function NormasContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const deepQ = searchParams.get('q')
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [search, setSearch] = useState(deepQ || '')

  async function load() {
    const { data } = await supabase.from('normas').select('*').order('norma')
    setItems(data && data.length > 0 ? data : NORMAS_DEFAULT)
  }

  useEffect(() => { load() }, [])

  // Deep link: auto-open norma when navigated from chatbot with ?q=
  useEffect(() => {
    if (!deepQ || items.length === 0) return
    const q = deepQ.toLowerCase()
    const match = items.find(n => n.norma?.toLowerCase().includes(q) || n.titulo?.toLowerCase().includes(q))
    if (match) { setEditItem(match); setOpen(true) }
  }, [items, deepQ])

  function handleRowClick(item: any) {
    setEditItem(item)
    setOpen(true)
  }

  function handleNew() {
    setEditItem(null)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setEditItem(null)
    load()
  }

  function hasPdf(item: any) {
    return item.pdf_path || (item.pdfs && item.pdfs.length > 0)
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Documentação</p>
          <h1 className="font-display font-bold text-2xl text-white">Documentos Normativos</h1>
        </div>
        <button className="btn-primary text-xs" onClick={handleNew}>
          <Plus size={13} /> Registrar
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
          <Search size={12} className="text-white/30 flex-shrink-0" />
          <input
            className="flex-1 bg-transparent text-[11.5px] text-white placeholder:text-white/25 outline-none"
            placeholder="Buscar norma ou título..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60 text-[10px]">✕</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b border-white/7 bg-navy">
                {['NORMA','VERSÃO','TÍTULO','TIPO DE ENSAIO','ARQUIVO',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.filter(n => !search || n.norma?.toLowerCase().includes(search.toLowerCase()) || n.titulo?.toLowerCase().includes(search.toLowerCase())).map((n: any, i) => (
                <tr
                  key={n.id || i}
                  className="hover:bg-white/3 transition-colors cursor-pointer"
                  onClick={() => handleRowClick(n)}
                >
                  <td className="px-4 py-2.5"><span className="tag-chip">{n.norma}</span></td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{n.versao || '—'}</td>
                  <td className="px-4 py-2.5 text-white/70 max-w-[280px] truncate">{n.titulo}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge text-[9px] ${
                      n.ensaio === 'Imunidade' ? 'badge-accent' : 'badge-teal'
                    }`}>{n.ensaio}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {hasPdf(n) ? (
                      <span className="flex items-center gap-1 text-teal text-[10px] font-mono">
                        <FileText size={11} /> PDF
                      </span>
                    ) : (
                      <span className="text-white/20 font-mono text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <button
                      className="flex items-center gap-1 text-white/30 hover:text-teal transition-colors font-mono text-[10px]"
                      onClick={() => handleRowClick(n)}
                    >
                      <Paperclip size={11} />
                      {hasPdf(n) ? 'Editar' : 'Anexar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NormaModal open={open} onClose={handleClose} editItem={editItem} />
    </div>
  )
}

export default function NormasPage() {
  return <Suspense fallback={null}><NormasContent /></Suspense>
}
