'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid, NormasGrid } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { open: boolean; onClose: () => void; equipamento?: any }

const TIPOS = [
  'Gerador de Sinal', 'Amplificador de Potência', 'Analisador de Espectro',
  'Medidor de Potência RF', 'Osciloscópio', 'Multímetro', 'Gerador ESD',
  'Gerador EFT/Burst', 'Gerador de Surto', 'Gerador Dip/Interrupção',
  'Medidor de Energia', 'Variac / Fonte CA', 'Padrão de Frequência',
  'CDN / Acoplador', 'Divisor de Potência', 'Atenuador', 'LISN',
  'Câmara Climática', 'Outro',
]

function toForm(e: any) {
  return {
    tag: e?.tag || '', area: e?.area || '', descricao: e?.descricao || '',
    tipo: e?.tipo || '', fabricante: e?.fabricante || '', serie: e?.serie || '',
    patrimonio: e?.patrimonio || '', localizacao: e?.local || '',
    cal_dt: e?.cal_data || '', cal_val: e?.cal_val || '',
    cal_per: String(e?.cal_per ?? 12), chk_per: String(e?.chk_per ?? 6),
    ncert: e?.ncert || '', lab_cal: e?.lab_cal || '',
    normas: e?.normas || [] as string[],
    obs: e?.obs || '', status: e?.status || 'ativo', status_obs: e?.status_obs || '',
  }
}

export default function EquipamentoModal({ open, onClose, equipamento }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState(toForm(equipamento))

  useEffect(() => { if (open) setF(toForm(equipamento)) }, [open, equipamento])

  function set(k: keyof typeof f, v: string | string[]) {
    setF(p => ({ ...p, [k]: v }))
  }

  async function save() {
    const faltando = [!f.tag && 'TAG', !f.descricao && 'Descrição / Modelo', !f.tipo && 'Tipo Metrológico'].filter(Boolean)
    if (faltando.length) {
      alert('Campo(s) obrigatório(s) não preenchido(s):\n• ' + faltando.join('\n• '))
      return
    }
    setSaving(true)
    const payload = {
      tag: f.tag.toUpperCase(),
      descricao: f.descricao,
      tipo: f.tipo,
      fabricante: f.fabricante || null,
      serie: f.serie || null,
      patrimonio: f.patrimonio || null,
      local: f.localizacao || null,
      cal_data: f.cal_dt || null,
      cal_val: f.cal_val || null,
      cal_per: parseInt(f.cal_per),
      chk_per: parseInt(f.chk_per),
      ncert: f.ncert || null,
      lab_cal: f.lab_cal || null,
      normas: f.normas,
      obs: f.obs || null,
      status: f.status,
      status_obs: f.status_obs || null,
    }
    let error
    if (equipamento?.id) {
      ({ error } = await supabase.from('equipamentos').update(payload).eq('id', equipamento.id))
    } else {
      const { data: lab_id } = await supabase.rpc('get_user_lab_id')
      ;({ error } = await supabase.from('equipamentos').insert({ lab_id, ...payload }))
    }
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    onClose()
    router.refresh()
  }

  const inp = 'input'
  const sel = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={equipamento?.id ? 'Editar Padrão de Trabalho' : 'Cadastrar Padrão de Trabalho'}
      size="lg"
      footer={
        <>
          <button className="btn-secondary text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn-primary text-xs" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : equipamento?.id ? 'Salvar Alterações' : 'Salvar Padrão'}
          </button>
        </>
      }
    >
      <FormGrid>
        <FormSection>Identificação</FormSection>

        <FormField label="TAG * (ex: 1528EMC)">
          <input className={inp} value={f.tag} onChange={e => set('tag', e.target.value)} placeholder="TAG única" />
        </FormField>
        <FormField label="TAG de Área / Setor">
          <input className={inp} value={f.area} onChange={e => set('area', e.target.value)} placeholder="Ex: EMC, TEL..." />
        </FormField>
        <FormField label="Descrição / Modelo *" full>
          <input className={inp} value={f.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Fabricante, modelo..." />
        </FormField>
        <FormField label="Tipo Metrológico *">
          <select className={sel} value={f.tipo} onChange={e => set('tipo', e.target.value)}>
            <option value="">Selecionar...</option>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Fabricante">
          <input className={inp} value={f.fabricante} onChange={e => set('fabricante', e.target.value)} placeholder="Fabricante" />
        </FormField>
        <FormField label="Nº Série">
          <input className={inp} value={f.serie} onChange={e => set('serie', e.target.value)} placeholder="S/N" />
        </FormField>
        <FormField label="Patrimônio (opcional)">
          <input className={inp} value={f.patrimonio} onChange={e => set('patrimonio', e.target.value)} placeholder="Nº patrimônio" />
        </FormField>
        <FormField label="Localização">
          <input className={inp} value={f.localizacao} onChange={e => set('localizacao', e.target.value)} placeholder="Sala EMC, Rack 2..." />
        </FormField>

        <FormSection>Calibração <span className="text-white/30 normal-case">(opcional — cadastre depois em Certificados)</span></FormSection>

        <FormField label="Data do Cert. Calibração">
          <input type="date" className={inp} value={f.cal_dt} onChange={e => set('cal_dt', e.target.value)} />
        </FormField>
        <FormField label="Validade">
          <input type="date" className={inp} value={f.cal_val} onChange={e => set('cal_val', e.target.value)} />
        </FormField>
        <FormField label="Periodicidade Calibração">
          <select className={sel} value={f.cal_per} onChange={e => set('cal_per', e.target.value)}>
            <option value="12">Anual (12m)</option>
            <option value="6">Semestral (6m)</option>
            <option value="24">Bienal (24m)</option>
            <option value="36">Trienal (36m)</option>
            <option value="0">Sem periodicidade</option>
          </select>
        </FormField>
        <FormField label="Periodicidade Checagem (meses)">
          <input type="number" className={inp} value={f.chk_per} min="1" onChange={e => set('chk_per', e.target.value)} />
        </FormField>
        <FormField label="Nº Certificado">
          <input className={inp} value={f.ncert} onChange={e => set('ncert', e.target.value)} placeholder="Nº cert." />
        </FormField>
        <FormField label="Laboratório Calibrador">
          <input className={inp} value={f.lab_cal} onChange={e => set('lab_cal', e.target.value)} placeholder="Lab acreditado" />
        </FormField>

        <FormSection>Normas Aplicáveis</FormSection>
        <NormasGrid value={f.normas} onChange={v => set('normas', v)} />

        <FormSection>Observações</FormSection>
        <FormField label="OBS" full>
          <textarea className={inp} rows={3} value={f.obs} onChange={e => set('obs', e.target.value)} placeholder="Restrições, particularidades..." />
        </FormField>

        <FormSection>Status do Padrão</FormSection>
        <FormField label="Situação Atual">
          <select className={sel} value={f.status} onChange={e => set('status', e.target.value)}>
            <option value="ativo">Ativo — Em operação normal</option>
            <option value="calibrar">Calibrar antes do uso</option>
            <option value="fora">Fora de uso</option>
          </select>
        </FormField>
        <FormField label="Motivo / Observação">
          <input className={inp} value={f.status_obs} onChange={e => set('status_obs', e.target.value)} placeholder="Ex: Aguardando retorno de calibração" />
        </FormField>

        <div className="col-span-2 bg-warning/10 border border-warning/20 rounded-lg px-4 py-2.5 text-[11px] text-warning">
          Equipamentos com status <strong>Fora de uso</strong> ou <strong>Calibrar antes do uso</strong> não geram alertas de vencimento no dashboard.
        </div>
      </FormGrid>
    </Modal>
  )
}
