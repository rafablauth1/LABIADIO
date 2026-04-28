'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import EquipamentoModal from '@/components/modals/EquipamentoModal'
import PhotoImg from '@/components/ui/PhotoImg'

function fmt(d: string | null) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)
}

function calStatus(val: string | null) {
  if (!val) return { label: 'Sem data', icon: Clock, cls: 'text-white/40', bg: 'bg-white/5 border-white/10' }
  const d = Math.floor((new Date(val).getTime() - Date.now()) / 86400000)
  if (d < 0)  return { label: 'VENCIDO', icon: XCircle, cls: 'text-danger', bg: 'bg-danger/10 border-danger/20' }
  if (d <= 30) return { label: `Vence em ${d}d`, icon: AlertTriangle, cls: 'text-warning', bg: 'bg-warning/10 border-warning/20' }
  if (d <= 60) return { label: `Vence em ${d}d`, icon: AlertTriangle, cls: 'text-gold', bg: 'bg-gold/10 border-gold/20' }
  return { label: 'Em dia', icon: CheckCircle2, cls: 'text-success', bg: 'bg-success/10 border-success/20' }
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="font-mono text-[8px] tracking-[1.8px] text-white/30 uppercase mb-1">{label}</p>
      <p className="text-sm text-white/80">{value || '—'}</p>
    </div>
  )
}

export default function EquipamentoFichaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [equip, setEquip] = useState<any>(null)
  const [certs, setCerts] = useState<any[]>([])
  const [checagens, setChecagens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  async function excluir() {
    if (!confirm(`Excluir o equipamento ${equip.tag}?\n\nIsso também removerá checagens e certificados vinculados.`)) return
    await supabase.from('checagens').delete().eq('equip_id', id)
    await supabase.from('certificados').delete().eq('equip_id', id)
    await supabase.from('controle_checagens').delete().eq('equip_id', id)
    const { error } = await supabase.from('equipamentos').delete().eq('id', id)
    if (error) { alert('Erro: ' + error.message); return }
    router.push('/dashboard/equipamentos')
  }

  async function load() {
    const [{ data: e }, { data: c }, { data: ch }] = await Promise.all([
      supabase.from('equipamentos').select('*').eq('id', id).single(),
      supabase.from('certificados').select('*').eq('equip_id', id).order('emissao', { ascending: false }),
      supabase.from('checagens').select('*').eq('equip_id', id).order('data', { ascending: false }).limit(10),
    ])
    setEquip(e)
    setCerts(c || [])
    setChecagens(ch || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  if (loading) return <div className="text-white/30 text-sm p-8">Carregando...</div>
  if (!equip)  return <div className="text-white/30 text-sm p-8">Equipamento não encontrado.</div>

  const cal = calStatus(equip.cal_val)
  const CalIcon = cal.icon

  const statusLabel = equip.status === 'fora' ? 'Fora de uso'
    : equip.status === 'calibrar' ? 'Calibrar antes do uso'
    : 'Ativo'
  const statusCls = equip.status === 'fora' ? 'text-danger bg-danger/10 border-danger/20'
    : equip.status === 'calibrar' ? 'text-warning bg-warning/10 border-warning/20'
    : 'text-success bg-success/10 border-success/20'

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/30 hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Ficha do Equipamento</p>
            <div className="flex items-center gap-3">
              <span className="tag-chip text-base">{equip.tag}</span>
              <h1 className="font-display font-bold text-2xl text-white">{equip.descricao}</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs text-danger border-danger/30 hover:bg-danger/10" onClick={excluir}>
            <Trash2 size={13} /> Excluir
          </button>
          <button className="btn-primary text-xs" onClick={() => setEditOpen(true)}>
            <Pencil size={13} /> Editar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className={`card px-4 py-3 border ${cal.bg} flex items-center gap-3`}>
          <CalIcon size={18} className={cal.cls} />
          <div>
            <p className="font-mono text-[8px] tracking-widest text-white/40 uppercase">Calibração</p>
            <p className={`font-bold text-sm ${cal.cls}`}>{cal.label}</p>
          </div>
        </div>
        <div className={`card px-4 py-3 border ${statusCls} flex items-center gap-3`}>
          <div>
            <p className="font-mono text-[8px] tracking-widest text-white/40 uppercase">Status</p>
            <p className={`font-bold text-sm`}>{statusLabel}</p>
          </div>
        </div>
        <div className="card px-4 py-3 flex items-center gap-3">
          <div>
            <p className="font-mono text-[8px] tracking-widest text-white/40 uppercase">Tipo</p>
            <p className="font-bold text-sm text-white/80">{equip.tipo}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card overflow-hidden">
          <div className="flex min-h-[200px]">
            {equip.photo_url && (
              <div className="w-1/2 flex-shrink-0 p-4 flex items-center justify-center border-r border-white/7">
                <PhotoImg
                  path={equip.photo_url}
                  alt={`Foto ${equip.tag}`}
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
            )}
            <div className={`flex flex-col gap-3 p-5 ${equip.photo_url ? 'w-1/2' : 'w-full'}`}>
              <p className="font-mono text-[9px] tracking-[2px] text-gold uppercase">Identificação</p>
              <Field label="TAG"          value={equip.tag} />
              <Field label="TAG de Área"  value={equip.area} />
              <Field label="Fabricante"   value={equip.fabricante} />
              <Field label="Nº Série"     value={equip.serie} />
              <Field label="Patrimônio"   value={equip.patrimonio} />
              <Field label="Localização"  value={equip.local} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <p className="font-mono text-[9px] tracking-[2px] text-gold uppercase mb-4">Calibração</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Data do Certificado" value={fmt(equip.cal_data)} />
            <Field label="Validade" value={fmt(equip.cal_val)} />
            <Field label="Periodicidade" value={equip.cal_per ? `${equip.cal_per} meses` : null} />
            <Field label="Periodicidade Checagem" value={equip.chk_per ? `${equip.chk_per} meses` : null} />
            <Field label="Nº Certificado" value={equip.ncert} />
            <Field label="Lab. Calibrador" value={equip.lab_cal} />
          </div>
        </div>
      </div>

      {equip.normas?.length > 0 && (
        <div className="card p-5 mb-4">
          <p className="font-mono text-[9px] tracking-[2px] text-gold uppercase mb-3">Normas Aplicáveis</p>
          <div className="flex flex-wrap gap-2">
            {equip.normas.map((n: string) => (
              <span key={n} className="font-mono text-[10px] px-2.5 py-1 rounded bg-white/8 text-white/60 border border-white/10">{n}</span>
            ))}
          </div>
        </div>
      )}

      {equip.obs && (
        <div className="card p-5 mb-4">
          <p className="font-mono text-[9px] tracking-[2px] text-gold uppercase mb-2">Observações</p>
          <p className="text-sm text-white/60 whitespace-pre-wrap">{equip.obs}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/7">
            <h2 className="font-display font-bold text-sm text-white">Certificados ({certs.length})</h2>
          </div>
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b border-white/7 bg-navy">
                {['Nº CERT.', 'LABORATÓRIO', 'EMISSÃO'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-mono text-[8px] tracking-[1.5px] text-white/35 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {certs.map(c => (
                <tr key={c.id} className="hover:bg-white/3">
                  <td className="px-4 py-2 font-mono text-[10px] text-white/70">{c.numero}</td>
                  <td className="px-4 py-2 text-white/50 text-[10px]">{c.laboratorio || '—'}</td>
                  <td className="px-4 py-2 font-mono text-[10px] text-white/40">{fmt(c.emissao)}</td>
                </tr>
              ))}
              {certs.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-white/25 italic text-sm">Nenhum certificado</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/7">
            <h2 className="font-display font-bold text-sm text-white">Últimas Checagens ({checagens.length})</h2>
          </div>
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b border-white/7 bg-navy">
                {['DATA', 'TÉCNICO', 'RESULTADO'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-mono text-[8px] tracking-[1.5px] text-white/35 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {checagens.map(ch => (
                <tr key={ch.id} className="hover:bg-white/3">
                  <td className="px-4 py-2 font-mono text-[10px] text-white/50">{fmt(ch.data)}</td>
                  <td className="px-4 py-2 text-white/50 text-[10px]">{ch.tecnico || '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`badge text-[9px] ${ch.resultado === 'Conforme' ? 'badge-success' : ch.resultado === 'Não conforme' ? 'badge-danger' : 'badge-warning'}`}>
                      {ch.resultado}
                    </span>
                  </td>
                </tr>
              ))}
              {checagens.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-white/25 italic text-sm">Nenhuma checagem</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EquipamentoModal open={editOpen} equipamento={equip} onClose={() => { setEditOpen(false); load() }} />
    </div>
  )
}
