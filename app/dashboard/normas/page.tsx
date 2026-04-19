'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import NormaModal from '@/components/modals/NormaModal'

const NORMAS_DEFAULT = [
  { norma: 'IEC 61000-4-2',  versao: '2008', titulo: 'ESD — Electrostatic Discharge Immunity',       ensaio: 'Imunidade' },
  { norma: 'IEC 61000-4-4',  versao: '2012', titulo: 'EFT/Burst — Electrical Fast Transient',        ensaio: 'Imunidade' },
  { norma: 'IEC 61000-4-5',  versao: '2014', titulo: 'Surge Immunity',                                ensaio: 'Imunidade' },
  { norma: 'IEC 61000-4-6',  versao: '2013', titulo: 'Conducted Disturbances Immunity',              ensaio: 'Imunidade' },
  { norma: 'IEC 61000-4-11', versao: '2020', titulo: 'Voltage Dips, Interruptions and Variations',  ensaio: 'Imunidade' },
  { norma: 'IEC 61000-4-19', versao: '2014', titulo: 'Differential Mode Disturbances',              ensaio: 'Imunidade' },
  { norma: 'CISPR 15',       versao: '2018', titulo: 'Limits for RF Disturbances — Lighting',        ensaio: 'Emissão' },
  { norma: 'IEC 61000-3-2',  versao: '2018', titulo: 'Limits for Harmonic Current Emissions',       ensaio: 'Emissão' },
]

export default function NormasPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  async function load() {
    const { data } = await supabase.from('normas').select('*').order('norma')
    setItems(data && data.length > 0 ? data : NORMAS_DEFAULT)
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Documentação</p>
          <h1 className="font-display font-bold text-2xl text-white">Documentos Normativos</h1>
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
                {['NORMA','VERSÃO','TÍTULO','TIPO DE ENSAIO','ARQUIVO',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((n: any, i) => (
                <tr key={n.id || i} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-2.5"><span className="tag-chip">{n.norma}</span></td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{n.versao || '—'}</td>
                  <td className="px-4 py-2.5 text-white/70 max-w-[280px] truncate">{n.titulo}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge text-[9px] ${
                      n.ensaio === 'Imunidade' ? 'badge-accent' : 'badge-teal'
                    }`}>{n.ensaio}</span>
                  </td>
                  <td className="px-4 py-2.5 text-white/25 font-mono text-[10px]">—</td>
                  <td className="px-4 py-2.5"><button className="text-white/25 hover:text-teal transition-colors font-mono text-[10px]">Anexar →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NormaModal open={open} onClose={() => { setOpen(false); load() }} />
    </div>
  )
}
