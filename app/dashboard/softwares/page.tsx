'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import SoftwareModal from '@/components/modals/SoftwareModal'

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function SoftwaresPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  async function load() {
    const { data } = await supabase.from('softwares').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Documentação</p>
          <h1 className="font-display font-bold text-2xl text-white">Softwares e Firmwares</h1>
        </div>
        <button className="btn-primary text-xs" onClick={() => setOpen(true)}>
          <Plus size={13} /> Registrar
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b border-white/7 bg-navy">
                {['TAG','TIPO','NOME','VERSÃO','DATA','VALIDADO',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((s: any) => (
                <tr key={s.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-2.5"><span className="tag-chip">{s.equip_tag || '—'}</span></td>
                  <td className="px-4 py-2.5 text-white/50 text-[10px]">{s.tipo}</td>
                  <td className="px-4 py-2.5 text-white/80">{s.nome}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-white/60">{s.versao}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{fmt(s.data)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge text-[9px] ${
                      s.validado === 'Sim' ? 'badge-success' :
                      s.validado === 'Não' ? 'badge-danger' : 'badge-warning'
                    }`}>{s.validado}</span>
                  </td>
                  <td className="px-4 py-2.5"><button className="text-white/25 hover:text-teal transition-colors font-mono text-[10px]">Ver →</button></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-white/25 italic text-sm">Nenhum software/firmware registrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SoftwareModal open={open} onClose={() => { setOpen(false); load() }} />
    </div>
  )
}
