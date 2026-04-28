'use client'

import { useState, useEffect, Suspense } from 'react'
import { Plus, FileText, ExternalLink, Pencil, Trash2, Search } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ManualModal from '@/components/modals/ManualModal'

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

function PdfButton({ path }: { path: string | null }) {
  const [loading, setLoading] = useState(false)
  if (!path) return <span className="text-white/20 font-mono text-[10px]">—</span>
  async function open() {
    setLoading(true)
    const res = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(path!)}`)
    const data = await res.json()
    setLoading(false)
    if (data?.url) window.open(data.url, '_blank')
  }
  return (
    <button onClick={open} disabled={loading}
      className="flex items-center gap-1 text-teal hover:text-teal/80 font-mono text-[10px] transition-colors disabled:opacity-40">
      <FileText size={11} />
      {loading ? 'Abrindo...' : 'PDF'}
      <ExternalLink size={9} />
    </button>
  )
}

function ManuaisContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const deepQ = searchParams.get('q')
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [manEdit, setManEdit] = useState<any>(null)
  const [yearFilter, setYearFilter] = useState<string | null>(null)
  const [search, setSearch] = useState(deepQ || '')

  async function load() {
    const { data } = await supabase.from('manuais').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  useEffect(() => { load() }, [])

  // Deep link: auto-open manual when navigated from chatbot with ?q=
  useEffect(() => {
    if (!deepQ || items.length === 0) return
    const q = deepQ.toLowerCase()
    const match = items.find(m => m.equip_tag?.toLowerCase() === q || m.titulo?.toLowerCase().includes(q))
    if (match) { setManEdit(match); setOpen(true) }
  }, [items, deepQ])

  const years = [...new Set(items.map(i => i.created_at?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[]
  const filtered = (yearFilter ? items.filter(i => i.created_at?.startsWith(yearFilter)) : items)
    .filter(i => !search || i.equip_tag?.toLowerCase().includes(search.toLowerCase()) || i.titulo?.toLowerCase().includes(search.toLowerCase()))

  const rows: ({ type: 'sep'; year: string } | { type: 'row'; item: any })[] = []
  let lastYear = ''
  filtered.forEach(item => {
    const y = item.created_at?.slice(0, 4) || 'Sem data'
    if (!yearFilter && y !== lastYear) { lastYear = y; rows.push({ type: 'sep', year: y }) }
    rows.push({ type: 'row', item })
  })

  async function deleteManual(m: any) {
    if (!confirm(`Excluir o manual "${m.titulo}"?`)) return
    const { error } = await supabase.from('manuais').delete().eq('id', m.id)
    if (error) { alert('Erro: ' + error.message); return }
    load()
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Documentação</p>
          <h1 className="font-display font-bold text-2xl text-white">Manuais</h1>
        </div>
        <button className="btn-primary text-xs" onClick={() => { setManEdit(null); setOpen(true) }}>
          <Plus size={13} /> Registrar
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
          <Search size={12} className="text-white/30 flex-shrink-0" />
          <input
            className="flex-1 bg-transparent text-[11.5px] text-white placeholder:text-white/25 outline-none"
            placeholder="Buscar por TAG ou título..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60 text-[10px]">✕</button>}
        </div>
        {years.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5 bg-navy/30 flex-wrap">
            <span className="font-mono text-[8px] text-white/25 uppercase tracking-widest mr-1">Ano:</span>
            <button onClick={() => setYearFilter(null)} className={`font-mono text-[9px] px-2.5 py-1 rounded-full transition-colors ${!yearFilter ? 'bg-gold/20 text-gold' : 'text-white/35 hover:text-white/70'}`}>Todos</button>
            {years.map(y => (
              <button key={y} onClick={() => setYearFilter(yearFilter === y ? null : y)} className={`font-mono text-[9px] px-2.5 py-1 rounded-full transition-colors ${yearFilter === y ? 'bg-gold/20 text-gold' : 'text-white/35 hover:text-white/70'}`}>{y}</button>
            ))}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b border-white/7 bg-navy">
                {['TAG', 'TIPO', 'TÍTULO', 'REV.', 'CADASTRO', 'ARQUIVO', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => r.type === 'sep'
                ? (
                  <tr key={`sep-${r.year}`} className="bg-white/2">
                    <td colSpan={7} className="px-4 py-1.5 font-mono text-[8px] tracking-[2px] text-white/30 uppercase">── {r.year}</td>
                  </tr>
                ) : (
                  <tr key={r.item.id} className="hover:bg-white/3 transition-colors group">
                    <td className="px-4 py-2.5"><span className="tag-chip">{r.item.equip_tag || '—'}</span></td>
                    <td className="px-4 py-2.5 text-white/50 text-[10px]">{r.item.tipo}</td>
                    <td className="px-4 py-2.5 text-white/80 max-w-[240px] truncate">{r.item.titulo}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{r.item.revisao || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-white/40">{fmt(r.item.created_at)}</td>
                    <td className="px-4 py-2.5"><PdfButton path={r.item.pdf_path} /></td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setManEdit(r.item); setOpen(true) }} className="text-white/30 hover:text-gold transition-colors"><Pencil size={12} /></button>
                        <button onClick={() => deleteManual(r.item)} className="text-white/30 hover:text-danger transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-white/25 italic text-sm">Nenhum manual registrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ManualModal open={open} manual={manEdit} onClose={() => { setOpen(false); setManEdit(null); load() }} />
    </div>
  )
}

export default function ManuaisPage() {
  return <Suspense fallback={null}><ManuaisContent /></Suspense>
}
