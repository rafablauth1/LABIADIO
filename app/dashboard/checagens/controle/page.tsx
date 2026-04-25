'use client'

import { useState, useEffect } from 'react'
import { Plus, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ControleChecagemModal from '@/components/modals/ControleChecagemModal'

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

export default function ControleChecagensPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  async function load() {
    const { data } = await supabase.from('controle_checagens').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Checagens</p>
          <h1 className="font-display font-bold text-2xl text-white">Controle de Checagens</h1>
          <p className="text-white/40 text-sm mt-1">Periodicidade — §6.4.6</p>
        </div>
        <button className="btn-primary text-xs" onClick={() => setOpen(true)}>
          <Plus size={13} /> Configurar
        </button>
      </div>

      <div className="flex items-start gap-2 bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 mb-5 text-[11.5px] text-accent">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <span>Periodicidade padrão: semestral. Ajustável por equipamento conforme recomendação normativa.</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b border-white/7 bg-navy">
                {['TAG','NORMA','PERIOD.','PRÓXIMA','RESPONSÁVEL',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((c: any) => (
                <tr key={c.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-2.5"><span className="tag-chip">{c.tag}</span></td>
                  <td className="px-4 py-2.5 text-white/60 text-[10px]">{c.norma}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{c.periodicidade}m</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{fmt(c.proxima)}</td>
                  <td className="px-4 py-2.5 text-white/50 text-[10px]">{c.responsavel || '—'}</td>
                  <td className="px-4 py-2.5"><button className="text-white/25 hover:text-danger transition-colors font-mono text-[10px]">✕</button></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-white/25 italic text-sm">Nenhuma checagem configurada ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ControleChecagemModal open={open} onClose={() => { setOpen(false); load() }} />
    </div>
  )
}
