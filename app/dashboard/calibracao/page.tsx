'use client'

import { useState, useEffect } from 'react'
import { Plus, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PlanoCalibracaoModal from '@/components/modals/PlanoCalibracaoModal'

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function CalibracaoPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'planos' | 'params'>('planos')
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  async function load() {
    const { data } = await supabase.from('planos_calibracao').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Documentação</p>
          <h1 className="font-display font-bold text-2xl text-white">Planos de Calibração</h1>
        </div>
        <button className="btn-primary text-xs" onClick={() => setOpen(true)}>
          <Plus size={13} /> Novo Plano
        </button>
      </div>

      <div className="flex gap-1 mb-5 border-b border-white/7">
        {([{ key: 'planos', label: 'Planos' }, { key: 'params', label: 'Parâmetros Normativos' }] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key ? 'border-gold text-gold' : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'planos' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="border-b border-white/7 bg-navy">
                  {['TAG','LABORATÓRIO','PERIOD.','ÚLTIMA','PRÓXIMA','Nº CERT.',''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((p: any) => (
                  <tr key={p.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-2.5"><span className="tag-chip">{p.tag}</span></td>
                    <td className="px-4 py-2.5 text-white/60 max-w-[160px] truncate">{p.laboratorio || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{p.periodicidade}m</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{fmt(p.ultima)}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{fmt(p.proxima)}</td>
                    <td className="px-4 py-2.5 text-white/40 font-mono text-[10px]">{p.ncert || '—'}</td>
                    <td className="px-4 py-2.5"><button className="text-white/25 hover:text-teal transition-colors font-mono text-[10px]">Ver →</button></td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-white/25 italic text-sm">Nenhum plano cadastrado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'params' && (
        <>
          <div className="flex items-start gap-2 bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 mb-5 text-[11.5px] text-accent">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <span>Registre os parâmetros normativos que justificam os pontos de calibração. Cite a norma, seção e critério técnico.</span>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/7 bg-navy">
                    {['TAG','NORMA','SEÇÃO','PARÂMETRO','FAIXA / CRITÉRIO','OBSERVAÇÕES',''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-white/25 italic text-sm">Nenhum parâmetro cadastrado ainda.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <PlanoCalibracaoModal open={open} onClose={() => { setOpen(false); load() }} />
    </div>
  )
}
