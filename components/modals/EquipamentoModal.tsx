'use client'

import { useState, useEffect, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid, NormasGrid, FileUpload } from '@/components/ui/FormField'
import PhotoImg from '@/components/ui/PhotoImg'
import { createClient } from '@/lib/supabase/client'
import { uploadFile } from '@/lib/storage/upload'
import { useRouter } from 'next/navigation'
import { Sparkles, Paperclip, Loader2 } from 'lucide-react'

interface Props { open: boolean; onClose: () => void; equipamento?: any }

const TIPOS_PADRAO = [
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
    photo_url: e?.photo_url || '',
  }
}

export default function EquipamentoModal({ open, onClose, equipamento }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const certRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [certFileName, setCertFileName] = useState<string | null>(null)
  const [f, setF] = useState(toForm(equipamento))
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [tiposExtra, setTiposExtra] = useState<string[]>([])
  const [tipoSugerido, setTipoSugerido] = useState<string | null>(null)
  const [tipoManual, setTipoManual] = useState(false)

  const todosOsTipos = [...TIPOS_PADRAO, ...tiposExtra]

  useEffect(() => {
    if (open) {
      setF(toForm(equipamento))
      setPhotoFile(null)
      setPhotoPreview('')
      setCertFile(null)
      setCertFileName(null)
    }
  }, [open, equipamento])

  async function analyzeWithAI() {
    if (!certFile) { alert('Selecione um certificado PDF primeiro.'); return }
    setAnalyzing(true)
    try {
      const form = new FormData()
      form.append('file', certFile)
      form.append('tipo', 'equipamento')
      const res = await fetch('/api/analyze-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Erro ao analisar PDF.'); return }
      const tipoIA = data.tipo || ''
      const tipoConhecido = todosOsTipos.some(
        t => t.toLowerCase() === tipoIA.toLowerCase()
      )

      setF(p => ({
        ...p,
        descricao:  data.descricao  || p.descricao,
        tipo:       tipoConhecido ? tipoIA : p.tipo,
        fabricante: data.fabricante || p.fabricante,
        serie:      data.serie      || p.serie,
        ncert:      data.ncert      || p.ncert,
        lab_cal:    data.lab_cal    || p.lab_cal,
        cal_dt:     data.cal_dt     || p.cal_dt,
        cal_val:    data.cal_val    || p.cal_val,
      }))

      if (tipoIA && !tipoConhecido) {
        setTipoSugerido(tipoIA)
      }
    } finally {
      setAnalyzing(false)
    }
  }

  function calcValidade(cal_dt: string, cal_per: string): string {
    if (!cal_dt || !cal_per || cal_per === '0') return ''
    const meses = parseInt(cal_per)
    if (isNaN(meses) || meses <= 0) return ''
    const d = new Date(cal_dt + 'T12:00:00')
    d.setMonth(d.getMonth() + meses)
    return d.toISOString().slice(0, 10)
  }

  function set(k: keyof typeof f, v: string | string[]) {
    setF(p => {
      const next = { ...p, [k]: v }
      if ((k === 'cal_dt' || k === 'cal_per') && typeof v === 'string') {
        const dt  = k === 'cal_dt'  ? v : p.cal_dt
        const per = k === 'cal_per' ? v : p.cal_per
        const val = calcValidade(dt, per)
        if (val) next.cal_val = val
      }
      return next
    })
  }

  async function save() {
    const faltando = [!f.tag && 'TAG', !f.descricao && 'Descrição / Modelo', !f.tipo && 'Tipo Metrológico'].filter(Boolean)
    if (faltando.length) {
      alert('Campo(s) obrigatório(s) não preenchido(s):\n• ' + faltando.join('\n• '))
      return
    }
    setSaving(true)

    let photo_url = f.photo_url || null
    if (photoFile) {
      const path = await uploadFile(photoFile, 'equipamentos', f.tag || 'foto')
      if (path) photo_url = path
    }

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
      photo_url,
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
        {/* ── Cadastrar via certificado de calibração ── */}
        {!equipamento?.id && (
          <>
            <FormSection>Importar via Certificado de Calibração</FormSection>
            <div className="col-span-2 flex flex-col gap-2">
              <div
                className="border border-dashed border-white/15 rounded-lg p-4 text-center hover:border-gold/40 hover:bg-gold/5 transition-colors cursor-pointer"
                onClick={() => certRef.current?.click()}
              >
                <Paperclip size={15} className="mx-auto mb-1 text-white/30" />
                <p className="text-[11px] text-white/40">
                  {certFileName
                    ? <span className="text-white/70">{certFileName}</span>
                    : 'Clique para anexar o certificado de calibração (PDF)'}
                </p>
                <input
                  ref={certRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setCertFile(f); setCertFileName(f.name) } }}
                />
              </div>
              <button
                onClick={analyzeWithAI}
                disabled={analyzing || !certFile}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-btn border border-teal/30 bg-teal/5 text-teal text-xs font-medium hover:bg-teal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {analyzing
                  ? <><Loader2 size={13} className="animate-spin" /> Analisando certificado...</>
                  : <><Sparkles size={13} /> Preencher campos automaticamente via IA</>}
              </button>
              {certFile && !analyzing && (
                <p className="text-[10px] text-white/30 text-center font-mono">
                  Campos preenchidos pela IA podem ser editados abaixo
                </p>
              )}
            </div>
          </>
        )}

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
            {todosOsTipos.map(t => <option key={t}>{t}</option>)}
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

        <FormSection>Foto do Equipamento</FormSection>
        {(photoPreview || f.photo_url) && (
          <div className="col-span-2 mb-1">
            {photoPreview
              ? <img src={photoPreview} alt="Foto do equipamento" className="h-36 rounded-lg object-contain border border-white/10 bg-navy/60" />
              : <PhotoImg path={f.photo_url} alt="Foto do equipamento" className="h-36 rounded-lg object-contain border border-white/10 bg-navy/60" />
            }
          </div>
        )}
        <FileUpload
          label="foto do equipamento"
          accept="image/*"
          onChange={file => {
            setPhotoFile(file)
            setPhotoPreview(URL.createObjectURL(file))
          }}
        />

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
