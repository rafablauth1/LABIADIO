'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import InstrucaoModal from '@/components/modals/InstrucaoModal'

export default function InstrucoesPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  async function load() {
    const { data } = await supabase.from('instrucoes_trabalho').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Documentação</p>
          <h1 className="font-display font-bold text-2xl text-white">Instruções de Trabalho</h1>
        </div>
        <button className="btn-primary text-xs" onClick={() => setOpen(true)}>
          <Plus size={13} /> Nova IT
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b border-white/7 bg-navy">
                {['CÓDIGO','TÍTULO','EQUIPAMENTOS','REV.','STATUS','APROVADO POR',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((it: any) => (
                <tr key={it.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-[10px] text-white/70">{it.codigo}</td>
                  <td className="px-4 py-2.5 text-white/80 max-w-[220px] truncate">{it.titulo}</td>
                  <td className="px-4 py-2.5 text-white/40 text-[10px] max-w-[140px] truncate">{it.tags || '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{it.revisao || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge text-[9px] ${
                      it.status === 'Vigente' ? 'badge-success' :
                      it.status === 'Em revisão' ? 'badge-warning' : 'badge-danger'
                    }`}>{it.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-white/40 text-[10px]">{it.aprovado_por || '—'}</td>
                  <td className="px-4 py-2.5"><button className="text-white/25 hover:text-teal transition-colors font-mono text-[10px]">Ver →</button></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-white/25 italic text-sm">Nenhuma instrução de trabalho cadastrada ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InstrucaoModal open={open} onClose={() => { setOpen(false); load() }} />
    </div>
  )
}
