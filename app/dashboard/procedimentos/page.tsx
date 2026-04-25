'use client'

import { useState, useEffect } from 'react'
import { Plus, FileSpreadsheet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ProcedimentoModal from '@/components/modals/ProcedimentoModal'
import ImportarChecagemModal from '@/components/modals/ImportarChecagemModal'

export default function ProcedimentosPage() {
  const supabase = createClient()
  const [items, setItems]       = useState<any[]>([])
  const [open, setOpen]         = useState(false)
  const [openExcel, setOpenExcel] = useState(false)

  async function load() {
    const { data } = await supabase.from('procedimentos').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Documentação</p>
          <h1 className="page-title">Procedimentos de Checagens</h1>
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
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="tbl-head">
                {['CÓDIGO','NORMAS BASE','PADRÕES','DESCRIÇÃO','VERSÃO','APROVADO POR',''].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((p: any) => (
                <tr key={p.id} className="tbl-row group">
                  <td className="font-mono text-[10px] text-white/70">{p.codigo}</td>
                  <td className="text-white/50 text-[10px] max-w-[140px]">{(p.normas || []).join(', ') || '—'}</td>
                  <td className="text-white/40 text-[10px]">{p.padroes || '—'}</td>
                  <td className="text-white/80 max-w-[200px] truncate">{p.descricao}</td>
                  <td className="font-mono text-[10px] text-white/50">{p.versao || '—'}</td>
                  <td className="text-white/40 text-[10px]">{p.aprovado_por || '—'}</td>
                  <td>
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
