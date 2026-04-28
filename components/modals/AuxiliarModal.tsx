'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid, FileUpload } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { uploadFile } from '@/lib/storage/upload'
import { useEquipamentos } from '@/lib/hooks/useEquipamentos'
import { useRouter } from 'next/navigation'
import { X, Search } from 'lucide-react'

interface Props { open: boolean; onClose: () => void }

const CATEGORIAS = [
  'CDN / Acoplamento', 'Atenuador', 'Cabo / Conector', 'Terminação / Carga',
  'Filtro', 'Antena Auxiliar', 'Transformador', 'Divisor de Potência',
  'Fonte Auxiliar', 'Outro',
]

export default function AuxiliarModal({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { equip } = useEquipamentos()
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')
  const [f, setF] = useState({
    tag: '', categoria: 'CDN / Acoplamento', descricao: '',
    vinculados: [] as string[], manut: '', obs: '',
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')

  function set<K extends keyof typeof f>(k: K, v: typeof f[K]) {
    setF(p => ({ ...p, [k]: v }))
  }

  function toggleEquip(tag: string) {
    setF(p => ({
      ...p,
      vinculados: p.vinculados.includes(tag)
        ? p.vinculados.filter(t => t !== tag)
        : [...p.vinculados, tag],
    }))
  }

  async function save() {
    if (!f.tag || !f.descricao) { alert('Preencha TAG e descrição.'); return }
    setSaving(true)

    let photo_url: string | null = null
    if (photoFile) {
      const path = await uploadFile(photoFile, 'auxiliares', f.tag || 'foto')
      if (path) photo_url = path
    }

    const { data: labId } = await supabase.rpc('get_user_lab_id')
    const { error } = await supabase.from('auxiliares').insert({
      lab_id:    labId,
      tag:       f.tag.toUpperCase(),
      categoria: f.categoria,
      descricao: f.descricao,
      vinculado: f.vinculados.length > 0 ? f.vinculados : null,
      manut:     f.manut || null,
      obs:       f.obs   || null,
      photo_url,
    })
    setSaving(false)
    if (error) { alert('Erro: ' + error.message); return }
    onClose(); router.refresh()
  }

  const inp = 'input'
  const sel = 'input w-full bg-navy border border-white/10 rounded-btn text-white text-sm px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors'

  const equipFiltrado = equip.filter(e =>
    !busca || e.tag.toLowerCase().includes(busca.toLowerCase()) || e.descricao.toLowerCase().includes(busca.toLowerCase())
  )

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

        {/* Multi-select de padrões vinculados */}
        <div className="col-span-2">
          <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">
            Padrões Vinculados
          </label>

          {/* Chips dos selecionados */}
          {f.vinculados.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {f.vinculados.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-gold/12 text-gold/90 font-mono text-[9px] px-2 py-1 rounded border border-gold/20">
                  {tag}
                  <button onClick={() => toggleEquip(tag)} className="hover:text-danger transition-colors ml-0.5">
                    <X size={9} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Busca */}
          <div className="relative mb-1.5">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              className="input w-full pl-7 text-[11px] py-1.5"
              placeholder="Buscar equipamento..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          {/* Lista de equipamentos */}
          <div className="max-h-36 overflow-y-auto border border-white/8 rounded-lg divide-y divide-white/5">
            {equipFiltrado.length === 0 ? (
              <p className="text-[10px] text-white/25 italic px-3 py-3">
                {equip.length === 0 ? 'Nenhum equipamento cadastrado.' : 'Nenhum resultado.'}
              </p>
            ) : equipFiltrado.map(e => {
              const checked = f.vinculados.includes(e.tag)
              return (
                <label key={e.id}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${checked ? 'bg-gold/8' : 'hover:bg-white/4'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleEquip(e.tag)}
                    className="accent-gold flex-shrink-0"
                  />
                  <span className="tag-chip text-[9px]">{e.tag}</span>
                  <span className="text-[10px] text-white/50 truncate">{e.descricao}</span>
                </label>
              )
            })}
          </div>
        </div>

        <FormField label="Manutenção até">
          <input type="date" className={inp} value={f.manut} onChange={e => set('manut', e.target.value)} />
        </FormField>

        <FormSection>Foto do Aparelho</FormSection>
        {photoPreview && (
          <div className="col-span-2 mb-1">
            <img src={photoPreview} alt="Foto do aparelho"
              className="h-36 rounded-lg object-contain border border-white/10 bg-navy/60" />
          </div>
        )}
        <FileUpload label="foto do aparelho" accept="image/*"
          onChange={file => { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)) }} />

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
