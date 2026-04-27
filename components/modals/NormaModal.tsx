'use client'

import { useState, useRef, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, FormSection, FormGrid } from '@/components/ui/FormField'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sparkles, Paperclip, Loader2, FileText, Trash2, ExternalLink, Plus } from 'lucide-react'
import { uploadFile, getSignedUrl, removeFile } from '@/lib/storage/upload'

interface PdfEntry { nome: string; path: string }

interface NormaItem {
  id?: string
  norma: string
  versao?: string
  titulo: string
  ensaio?: string
  obs?: string
  pdf_path?: string
  pdfs?: PdfEntry[]
}

interface Props {
  open: boolean
  onClose: () => void
  editItem?: NormaItem | null
}

export default function NormaModal({ open, onClose, editItem }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [pdfs, setPdfs] = useState<PdfEntry[]>([])
  const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({})
  const [f, setF] = useState({ norma: '', ver: '', titulo: '', ensaio: '', obs: '' })

  const isEdit = !!editItem?.id

  useEffect(() => {
    if (!open) return
    if (editItem) {
      setF({
        norma: editItem.norma || '',
        ver: editItem.versao || '',
        titulo: editItem.titulo || '',
        ensaio: editItem.ensaio || '',
        obs: editItem.obs || '',
      })
      const existing: PdfEntry[] = editItem.pdfs || (editItem.pdf_path ? [{ nome: editItem.norma + '.pdf', path: editItem.pdf_path }] : [])
      setPdfs(existing)
      loadPdfUrls(existing)
    } else {
      setF({ norma: '', ver: '', titulo: '', ensaio: '', obs: '' })
      setPdfs([])
      setPdfUrls({})
    }
    setFile(null)
    setFileName(null)
  }, [open, editItem])

  async function loadPdfUrls(list: PdfEntry[]) {
    const urls: Record<string, string> = {}
    for (const p of list) {
      if (!p.path) continue
      const url = await getSignedUrl(p.path)
      if (url) urls[p.path] = url
    }
    setPdfUrls(urls)
  }

  function set(k: keyof typeof f, v: string) { setF(p => ({ ...p, [k]: v })) }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setFileName(selected.name)
  }

  async function analyzeWithAI() {
    if (!file) { alert('Selecione um PDF primeiro.'); return }
    setAnalyzing(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('tipo', 'norm')
      const res = await fetch('/api/analyze-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Erro ao analisar PDF.'); return }
      setF(p => ({
        ...p,
        norma:  data.norma  || p.norma,
        ver:    data.ver    || p.ver,
        titulo: data.titulo || p.titulo,
        ensaio: data.ensaio || p.ensaio,
      }))
    } finally {
      setAnalyzing(false)
    }
  }

  async function uploadPdf(): Promise<PdfEntry | null> {
    if (!file) return null
    setUploading(true)
    try {
      const slug = f.norma.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
      const path = await uploadFile(file, 'normas', slug)
      if (!path) return null
      return { nome: file.name, path }
    } finally {
      setUploading(false)
    }
  }

  async function removePdf(idx: number) {
    const target = pdfs[idx]
    if (target?.path) await removeFile(target.path)
    const updated = pdfs.filter((_, i) => i !== idx)
    setPdfs(updated)
    if (isEdit && editItem?.id) {
      await supabase.from('normas').update({ pdfs: updated }).eq('id', editItem.id)
    }
  }

  async function save() {
    if (!f.norma || !f.titulo) { alert('Preencha norma e título.'); return }
    setSaving(true)
    try {
      let newPdfs = [...pdfs]
      if (file) {
        const entry = await uploadPdf()
        if (entry) {
          newPdfs = [...newPdfs, entry]
          setPdfs(newPdfs)
        }
      }

      const payload = {
        norma: f.norma,
        versao: f.ver || null,
        titulo: f.titulo,
        ensaio: f.ensaio || null,
        obs: f.obs || null,
        pdfs: newPdfs,
        pdf_path: newPdfs[0]?.path || null,
      }

      if (isEdit && editItem?.id) {
        const { error } = await supabase.from('normas').update(payload).eq('id', editItem.id)
        if (error) { alert('Erro: ' + error.message); return }
      } else {
        const { error } = await supabase.from('normas').insert(payload)
        if (error) { alert('Erro: ' + error.message); return }
      }
      onClose()
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const inp = 'input'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Editar Norma — ${editItem?.norma}` : 'Documento Normativo'}
      size="lg"
      footer={
        <>
          <button className="btn-secondary text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn-primary text-xs" onClick={save} disabled={saving || uploading}>
            {saving || uploading ? 'Salvando...' : isEdit ? 'Atualizar' : 'Salvar'}
          </button>
        </>
      }
    >
      <FormGrid>
        {/* PDFs existentes */}
        {pdfs.length > 0 && (
          <>
            <FormSection>PDFs Anexados</FormSection>
            <div className="col-span-2 space-y-2">
              {pdfs.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-white/4 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-teal flex-shrink-0" />
                    <span className="text-[11px] text-white/70 truncate max-w-[280px]">{p.nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pdfUrls[p.path] && (
                      <a
                        href={pdfUrls[p.path]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal hover:text-white transition-colors"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <button
                      onClick={() => removePdf(i)}
                      className="text-white/25 hover:text-danger transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Upload novo PDF */}
        <FormSection>{pdfs.length > 0 ? 'Adicionar Outro PDF' : 'PDF da Norma'}</FormSection>
        <div className="col-span-2 flex flex-col gap-2">
          <div
            className="border border-dashed border-white/15 rounded-lg p-4 text-center
                       hover:border-gold/40 hover:bg-gold/5 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip size={16} className="mx-auto mb-1 text-white/30" />
            <p className="text-[11px] text-white/40">
              {fileName
                ? <span className="text-white/70">{fileName}</span>
                : <><Plus size={11} className="inline mr-1" />Clique para anexar PDF</>
              }
            </p>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
          </div>
          <button
            onClick={analyzeWithAI}
            disabled={analyzing || !file}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-btn border border-teal/30
                       bg-teal/5 text-teal text-xs font-medium hover:bg-teal/10 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {analyzing
              ? <><Loader2 size={13} className="animate-spin" /> Analisando...</>
              : <><Sparkles size={13} /> Analisar PDF com IA e Preencher Campos</>
            }
          </button>
        </div>

        {/* Dados da norma */}
        <FormSection>Dados da Norma</FormSection>
        <FormField label="Norma * (ex: IEC 61000-4-2)">
          <input className={inp} value={f.norma} onChange={e => set('norma', e.target.value)} placeholder="Nº da norma" />
        </FormField>
        <FormField label="Versão / Ano *">
          <input className={inp} value={f.ver} onChange={e => set('ver', e.target.value)} placeholder="2014, Ed.2..." />
        </FormField>
        <FormField label="Título *" full>
          <input className={inp} value={f.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Título completo" />
        </FormField>
        <FormField label="Tipo de Ensaio" full>
          <input className={inp} value={f.ensaio} onChange={e => set('ensaio', e.target.value)} placeholder="EMC - Imunidade ESD..." />
        </FormField>
        <FormField label="OBS" full>
          <textarea className={inp} rows={2} value={f.obs} onChange={e => set('obs', e.target.value)} placeholder="Diferenças de versão..." />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
