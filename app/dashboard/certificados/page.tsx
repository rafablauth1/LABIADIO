'use client'

import { useState, useEffect } from 'react'
import { Plus, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CertificadoModal from '@/components/modals/CertificadoModal'

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

export default function CertificadosPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'certs' | 'period'>('certs')
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  async function load() {
    const { data } = await supabase.from('certificados').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Documentação</p>
          <h1 className="font-display font-bold text-2xl text-white">Certificados de Calibração</h1>
        </div>
        <button className="btn-primary text-xs" onClick={() => setOpen(true)}>
          <Plus size={13} /> Registrar
        </button>
      </div>

      <div className="flex gap-1 mb-5 border-b border-white/7">
        {([{ key: 'certs', label: 'Certificados' }, { key: 'period', label: 'Aumento de Periodicidade' }] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key ? 'border-gold text-gold' : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'certs' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="border-b border-white/7 bg-navy">
                  {['Nº CERT.','TAG','EMITIDO POR','EMISSÃO','ACREDITAÇÃO','STATUS',''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((c: any) => (
                  <tr key={c.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[10px] text-white/70">{c.numero}</td>
                    <td className="px-4 py-2.5"><span className="tag-chip">{c.equip_tag}</span></td>
                    <td className="px-4 py-2.5 text-white/60 max-w-[160px] truncate">{c.lab || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{fmt(c.emissao)}</td>
                    <td className="px-4 py-2.5 text-white/40 font-mono text-[10px]">{c.acreditacao || '—'}</td>
                    <td className="px-4 py-2.5"><span className="badge-success text-[9px]">VÁLIDO</span></td>
                    <td className="px-4 py-2.5"><button className="text-white/25 hover:text-teal transition-colors font-mono text-[10px]">Ver →</button></td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-white/25 italic text-sm">Nenhum certificado registrado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'period' && (
        <>
          <div className="flex items-start gap-2 bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 mb-5 text-[11.5px] text-accent">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <span>Registre pedidos formais de aumento de periodicidade conforme §6.4.7 da ISO/IEC 17025:2017.</span>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/7 bg-navy">
                    {['TAG','PADRÃO','PERIOD. ATUAL','PERIOD. PROPOSTA','JUSTIFICATIVA','STATUS',''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-white/25 italic text-sm">Nenhuma solicitação registrada ainda.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <CertificadoModal open={open} onClose={() => { setOpen(false); load() }} />
    </div>
  )
}
