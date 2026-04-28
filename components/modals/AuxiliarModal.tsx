'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid, FileUpload } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { uploadFile } from '@/lib/storage/upload'
import { useRouter } from 'next/navigation'

interface Props { open: boolean; onClose: () => void }

const CATEGORIAS = [
  'CDN / Acoplamento', 'Atenuador', 'Cabo / Conector', 'Terminação / Carga',
  'Filtro', 'Antena Auxiliar', 'Transformador', 'Divisor de Potência',
  'Fonte Auxiliar', 'Outro',
]

export default function AuxiliarModal({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    tag: '', categoria: 'CDN / Acoplamento', descricao: '',
    vinculado: '', manut: '', obs: '',
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  function set(k: keyof typeof f, v: string) { setF(p => ({ ...p, [k]: v })) }

  async function save() {
    if (!f.tag || !f.descricao) { alert('Preencha TAG e descrição.'); return }
    setSaving(true)

    let photo_url: string | null = null
    if (photoFile) {
      const path = await uploadFile(photoFile, 'auxiliares', f.tag || 'foto')
      if (path) photo_url = path
    }

    const { error } = await supabase.from('auxiliares').insert({
      tag: f.tag.toUpperCase(), categoria: f.categoria, descricao: f.descricao,
      vinculado: f.vinculado || null, manut: f.manut || null, obs: f.obs || null,
      photo_url,
    })
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    onClose(); router.refresh()
  }

  const inp = 'input'
  const sel = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors'

  return (
    <Modal open={open} onClose={onClose} title="Cadastrar Aparelho Auxiliar"
      footer={
        <>
          <button className="btn-secondary text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn-primary text-xs" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      <FormGrid>
        <FormField label="TAG *">
          <input className={inp} value={f.tag} onChange={e => set('tag', e.target.value)} placeholder="Ex: 123EMC-AUX-001" />
        </FormField>
        <FormField label="Categoria *">
          <select className={sel} value={f.categoria} onChange={e => set('categoria', e.target.value)}>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="Descrição *" full>
          <input className={inp} value={f.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Fabricante, modelo, S/N..." />
        </FormField>
        <FormField label="Vinculado ao Padrão (TAG)">
          <input className={inp} value={f.vinculado} onChange={e => set('vinculado', e.target.value)} placeholder="TAG do padrão" />
        </FormField>
        <FormField label="Manutenção até">
          <input type="date" className={inp} value={f.manut} onChange={e => set('manut', e.target.value)} />
        </FormField>
        <FormSection>Foto do Aparelho</FormSection>
        {photoPreview && (
          <div className="col-span-2 mb-1">
            <img
              src={photoPreview}
              alt="Foto do aparelho"
              className="h-36 rounded-lg object-contain border border-white/10 bg-navy/60"
            />
          </div>
        )}
        <FileUpload
          label="foto do aparelho"
          accept="image/*"
          onChange={file => {
            setPhotoFile(file)
            setPhotoPreview(URL.createObjectURL(file))
          }}
        />
        <FormSection>Validação (PDF)</FormSection>
        <FileUpload label="PDF de validação" accept=".pdf" />
        <FormSection>Observações</FormSection>
        <FormField label="OBS" full>
          <textarea className={inp} rows={2} value={f.obs} onChange={e => set('obs', e.target.value)} placeholder="Estado, restrições..." />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
