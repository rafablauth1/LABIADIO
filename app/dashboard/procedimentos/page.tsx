'use client'

import { useState, useEffect, Suspense } from 'react'
import { Plus, FileSpreadsheet, Search } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ProcedimentoModal from '@/components/modals/ProcedimentoModal'
import ImportarChecagemModal from '@/components/modals/ImportarChecagemModal'

function ProcedimentosContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const deepQ = searchParams.get('q')
  const [items, setItems]         = useState<any[]>([])
  const [open, setOpen]           = useState(false)
  const [openExcel, setOpenExcel] = useState(false)
  const [search, setSearch]       = useState(deepQ || '')

  async function load() {
    const { data } = await supabase.from('procedimentos').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  useEffect(() => { load() }, [])

  const filtered = items.filter(p => !search ||
    p.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    p.descricao?.toLowerCase().includes(search.toLowerCase()) ||
    p.padroes?.toLowerCase().includes(search.toLowerCase()) ||
    (p.normas || []).some((n: string) => n.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Documentação</p>
          <h1 className="font-display font-bold text-2xl text-white">Procedimentos de Checagens</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={() => setOpenExcel(true)}>
            <FileSpreadsheet size={13} /> Importar Excel de Checagem
          </button>
          <button className="btn-primary text-xs" onClick={() => setOpen(true)}>
            <Plus size={13} /> Novo Procedimento
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
          <Search size={12} className="text-white/30 flex-shrink-0" />
          <input
            className="flex-1 bg-transparent text-[11.5px] text-white placeholder:text-white/25 outline-none"
            placeholder="Buscar por código, norma ou padrão..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60 text-[10px]">✕</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b border-white/7 bg-navy">
                {['CÓDIGO', 'NORMAS BASE', 'PADRÕES', 'DESCRIÇÃO', 'VERSÃO', 'APROVADO POR', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((p: any) => (
                <tr key={p.id} className="hover:bg-white/3 transition-colors group">
                  <td className="px-4 py-2.5 font-mono text-[10px] text-white/70">{p.codigo}</td>
                  <td className="px-4 py-2.5 text-white/50 text-[10px] max-w-[140px]">{(p.normas || []).join(', ') || '—'}</td>
                  <td className="px-4 py-2.5 text-white/40 text-[10px]">{p.padroes || '—'}</td>
                  <td className="px-4 py-2.5 text-white/80 max-w-[200px] truncate">{p.descricao}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{p.versao || '—'}</td>
                  <td className="px-4 py-2.5 text-white/40 text-[10px]">{p.aprovado_por || '—'}</td>
                  <td className="px-4 py-2.5">
                    <button className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-teal transition-all font-mono text-[10px]">
                      Ver →
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-white/25 italic text-sm">
                    Nenhum procedimento cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProcedimentoModal open={open} onClose={() => { setOpen(false); load() }} />
      <ImportarChecagemModal open={openExcel} onClose={() => setOpenExcel(false)} />
    </div>
  )
}

export default function ProcedimentosPage() {
  return <Suspense fallback={null}><ProcedimentosContent /></Suspense>
}
