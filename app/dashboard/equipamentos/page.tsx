'use client'

import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import EquipamentoModal from '@/components/modals/EquipamentoModal'

function calStatus(val: string | null) {
  if (!val) return { label: 'Sem data', bg: 'bg-white/5 text-white/30 border-white/10' }
  const d = Math.floor((new Date(val).getTime() - Date.now()) / 86400000)
  if (d < 0)  return { label: 'VENCIDO',  bg: 'bg-danger/10 text-danger border-danger/20' }
  if (d <= 30) return { label: `${d}d`,   bg: 'bg-warning/10 text-warning border-warning/20' }
  if (d <= 60) return { label: `${d}d`,   bg: 'bg-gold/10 text-gold border-gold/20' }
  return { label: 'Em dia', bg: 'bg-success/10 text-success border-success/20' }
}

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

export default function EquipamentosPage() {
  const supabase = createClient()
  const [equip, setEquip] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  async function load() {
    const { data } = await supabase.from('equipamentos').select('*').order('tag')
    setEquip(data || [])
  }

  useEffect(() => { load() }, [])

  const ativos   = equip.filter(e => e.status === 'ativo')
  const fora     = equip.filter(e => e.status === 'fora')
  const calibrar = equip.filter(e => e.status === 'calibrar')

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Equipamentos</p>
          <h1 className="font-display font-bold text-2xl text-white">Padrões de Trabalho</h1>
        </div>
        <button className="btn-primary text-xs" onClick={() => setOpen(true)}>
          <Plus size={13} /> Cadastrar Padrão
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Ativos', value: ativos.length, cls: 'text-success' },
          { label: 'Calibrar Antes', value: calibrar.length, cls: 'text-warning' },
          { label: 'Fora de Uso', value: fora.length, cls: 'text-danger' },
        ].map(s => (
          <div key={s.label} className="card px-4 py-3 flex items-center justify-between">
            <span className="font-mono text-[8.5px] tracking-widest text-white/40 uppercase">{s.label}</span>
            <span className={`font-display font-bold text-2xl ${s.cls}`}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-white/7 flex items-center justify-between">
          <h2 className="font-display font-bold text-sm text-white">
            Todos os equipamentos ({equip.length})
          </h2>
          <div className="flex items-center gap-2 bg-navy border border-white/10 rounded-lg px-3 py-1.5">
            <Search size={12} className="text-white/30" />
            <span className="text-[10px] text-white/30 font-mono">busca em breve</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b border-white/7 bg-navy">
                {['TAG','DESCRIÇÃO','TIPO','LAB. CALIBRADOR','VALIDADE','STATUS',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {equip.map((e: any) => {
                const st = calStatus(e.cal_val)
                return (
                  <tr key={e.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-2.5"><span className="tag-chip">{e.tag}</span></td>
                    <td className="px-4 py-2.5 text-white/80 max-w-[220px] truncate">{e.descricao}</td>
                    <td className="px-4 py-2.5 text-white/40 font-mono text-[10px]">{e.tipo}</td>
                    <td className="px-4 py-2.5 text-white/40 text-[10.5px] max-w-[140px] truncate">{e.lab_cal || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-white/50">{e.status !== 'ativo' ? '—' : fmt(e.cal_val)}</td>
                    <td className="px-4 py-2.5">
                      {e.status === 'fora'
                        ? <span className="badge-danger text-[9px]">FORA DE USO</span>
                        : e.status === 'calibrar'
                        ? <span className="badge-warning text-[9px]">CALIBRAR ANTES</span>
                        : <span className={`badge text-[9px] ${st.bg}`}>{st.label}</span>
                      }
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/dashboard/equipamentos/${e.id}`} className="text-white/25 hover:text-teal transition-colors font-mono text-[10px]">Ver →</Link>
                    </td>
                  </tr>
                )
              })}
              {equip.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-white/25 italic text-sm">
                    Nenhum equipamento cadastrado ainda.{' '}
                    <button className="text-gold hover:underline" onClick={() => setOpen(true)}>Cadastrar o primeiro →</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EquipamentoModal open={open} onClose={() => { setOpen(false); load() }} />
    </div>
  )
}
