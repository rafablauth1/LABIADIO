'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Tag } from 'lucide-react'
import Modal from '@/components/ui/Modal'

type TipoEntry = 'feature' | 'melhoria' | 'fix' | 'infra' | 'doc'

interface Entry {
  id: string
  data: string
  versao?: string
  tipo: TipoEntry
  titulo: string
  descricao?: string
  autor?: string
  itens?: string[]
}

const TIPO_CFG: Record<TipoEntry, { label: string; cls: string }> = {
  feature:  { label: 'Nova Função',  cls: 'bg-teal/10 text-teal border-teal/20' },
  melhoria: { label: 'Melhoria',     cls: 'bg-accent/10 text-accent border-accent/20' },
  fix:      { label: 'Correção',     cls: 'bg-success/10 text-success border-success/20' },
  infra:    { label: 'Infraestrutura', cls: 'bg-gold/10 text-gold border-gold/20' },
  doc:      { label: 'Documentação', cls: 'bg-white/8 text-white/50 border-white/10' },
}

const STORAGE_KEY = 'labiadio_changelog'

const ENTRIES_INICIAIS: Entry[] = [
  {
    id: '10',
    data: '2026-04-25',
    versao: 'S3.4',
    tipo: 'infra',
    titulo: 'Compatibilidade Azure + Abstração de Provedores',
    descricao: 'Projeto preparado para migração completa para Azure sem alterar código de negócio.',
    autor: 'Dev',
    itens: [
      'lib/ai/: abstração com Anthropic, Azure OpenAI e Google Gemini — troca via AI_PROVIDER no .env',
      'lib/db/: abstração de banco com guia de migração para Azure PostgreSQL Flexible Server',
      'lib/auth/: abstração de autenticação + guia NextAuth.js + Microsoft Entra ID',
      'lib/storage/: abstração de storage + guia Azure Blob Storage',
      'Login atualizado para Microsoft 365 (botão "Entrar com Microsoft")',
      '.env.local.example documentado com todas as variáveis por serviço Azure',
      'Migrations SQL 100% compatíveis com Azure PostgreSQL',
    ],
  },
  {
    id: '9',
    data: '2026-04-25',
    versao: 'S3.3',
    tipo: 'feature',
    titulo: 'Checagem via IT CHK PDF com IA',
    descricao: 'Upload de Instrução de Trabalho em PDF — IA extrai grandezas e cria tabela de pontos para o operador.',
    autor: 'Dev',
    itens: [
      'Modal "Carregar IT CHK": upload PDF → IA extrai TAG, grandezas, equipamentos aux, normas e processo',
      'Botão "Carregar IT CHK" na página Realizar Checagem',
      'Equipamento detectado automaticamente pela TAG extraída do PDF',
      'Tabela de pontos: Grandeza | Unidade | Valor Ref. | Valor Medido | Critério | Resultado',
      'Resultado por ponto calculado automaticamente (critério ± absoluto ou %)',
      'Resultado geral da checagem consolidado (Conforme / Não conforme / Parcial)',
      'Novo prompt it_chk no endpoint /api/analyze-pdf',
    ],
  },
  {
    id: '8',
    data: '2026-04-25',
    versao: 'S3.2',
    tipo: 'feature',
    titulo: 'Importação de Excel no Controle de Checagens',
    descricao: 'Upload de planilha .xlsx com pontos de medição, auto-mapeamento de colunas e edição inline.',
    autor: 'Dev',
    itens: [
      'Modal de importação: upload .xlsx/.xls/.csv → preview das primeiras 5 linhas',
      'Auto-detecção de colunas (data, técnico, norma, resultado, temperatura, umidade)',
      'Mapeamento manual de cada coluna para campos do sistema',
      'Pontos importados salvos em checagens.medidos (JSONB)',
      'Controle de checagens: linhas expansíveis com histórico por equipamento',
      'Tabela de pontos editável inline (editar/deletar por linha)',
      'Dependência: SheetJS (xlsx)',
    ],
  },
  {
    id: '7',
    data: '2026-04-25',
    versao: 'S3.1',
    tipo: 'feature',
    titulo: 'Ficha do Equipamento — Mini-abas Integradas',
    descricao: 'Página de consulta integrada com 6 mini-abas ligando todas as informações de um equipamento.',
    autor: 'Dev',
    itens: [
      'Dropdown de seleção de equipamento por TAG (puxado do Supabase)',
      'Mini-abas: Certificados | Checagens | Auxiliares | Manuais | Softwares | Plano de Calibração',
      'Contador de itens em cada aba',
      'Botão PDF com URL assinada do Supabase Storage (válida 1h)',
      'Auxiliares filtrados por vinculado = TAG, Manuais/Softwares por equip_tag = TAG',
      'Botão "Editar" abre EquipamentoModal pré-preenchido',
    ],
  },
  {
    id: '6b',
    data: '2026-04-25',
    versao: 'S3.1',
    tipo: 'feature',
    titulo: 'Edição, Exclusão e Ficha por Equipamento',
    descricao: 'Gerenciamento completo de equipamentos com página de ficha individual.',
    autor: 'Dev',
    itens: [
      'EquipamentoModal: modo edição (UPDATE) e cadastro (INSERT) — detecta automaticamente',
      'Botão lápis por linha na listagem — abre modal pré-preenchido',
      'Botão lixeira com confirmação — exclui equipamento e registros vinculados',
      'Página /equipamentos/[id]: ficha completa com status, identificação, calibração, normas',
      'Ficha exibe certificados e últimas checagens vinculadas',
    ],
  },
  {
    id: '6a',
    data: '2026-04-25',
    versao: 'S3.0',
    tipo: 'fix',
    titulo: 'Integração de Equipamentos nas Outras Abas',
    descricao: 'Equipamentos cadastrados agora aparecem nos dropdowns de todas as funcionalidades.',
    autor: 'Dev',
    itens: [
      'PlanoCalibracaoModal: TAG era texto livre → agora dropdown via useEquipamentos()',
      'PlanoCalibracaoModal: adicionado lab_id no insert (estava ausente)',
      'Grandezas customizadas: migradas de localStorage para tabela Supabase grandezas',
      'Todos os modais (Certificado, Controle, Realizar, Plano Cal.) usam useEquipamentos()',
    ],
  },
  {
    id: '1',
    data: '2026-03-01',
    versao: 'S1',
    tipo: 'infra',
    titulo: 'MVP Online — Sprint 1',
    descricao: 'Infraestrutura base, autenticação e dashboard inicial.',
    autor: 'Dev',
    itens: [
      'Next.js 14 + TypeScript + Tailwind CSS configurado',
      'Autenticação Supabase com Google OAuth',
      'Dashboard com alertas de calibração em tempo real',
      'Sidebar de navegação completa com 13 abas',
      'Design system customizado (Navy + Gold)',
    ],
  },
  {
    id: '2',
    data: '2026-04-19',
    versao: 'S2',
    tipo: 'feature',
    titulo: 'Módulos & Registros — Sprint 2',
    descricao: 'Todas as páginas do sistema com formulários de registro completos.',
    autor: 'Dev',
    itens: [
      '13 páginas do sistema implementadas',
      '10 modais de registro fiel ao protótipo HTML',
      'Componente Modal reutilizável com ESC e backdrop',
      'Formulário de Equipamento com normas multi-select e status',
      'Certificados, Manuais, Softwares, ITs, Procedimentos',
      'Incerteza de Medição — calculadora GUM interativa',
      'Análise automática de PDFs via IA (Claude)',
    ],
  },
  {
    id: '3',
    data: '2026-04-19',
    versao: 'S2.1',
    tipo: 'feature',
    titulo: 'Relatório de Status — Senha + Programação',
    descricao: 'Acesso protegido por senha e seção de programação de próximos passos.',
    autor: 'Dev',
    itens: [
      'Senha de acesso ao relatório (sessão protegida)',
      'Programação de próximos passos com tarefas diárias/semanais/mensais',
      'Status por tarefa: Aprovado / Reprovado / Pendente',
      'Filtros por frequência e status',
      'Dados persistidos em localStorage',
    ],
  },
  {
    id: '4',
    data: '2026-04-19',
    versao: 'S2.1',
    tipo: 'melhoria',
    titulo: 'Documentos Normativos — PDF e Edição',
    descricao: 'Clique em norma para editar, suporte a múltiplos PDFs por norma.',
    autor: 'Dev',
    itens: [
      'IEC 61000-4-3 adicionada à lista padrão e ao cadastro de equipamentos',
      'Clicar em qualquer linha abre modal de edição',
      'Upload e gestão de múltiplos PDFs por norma',
      'Indicador visual de PDF anexado na tabela',
      'Análise de PDF com IA para preencher campos automaticamente',
    ],
  },
  {
    id: '5',
    data: '2026-04-19',
    versao: 'S2.1',
    tipo: 'feature',
    titulo: 'Condições Ambientais — Medidores e Histórico',
    descricao: 'Cadastro de instrumentos com limites por sala e navegação temporal.',
    autor: 'Dev',
    itens: [
      'Nova aba "Medidores": Termômetro, Higrômetro, Barômetro',
      'Campos de limite mínimo/máximo e sala de controle',
      'Alerta visual de calibração vencida',
      'Seletor de ano (← →) + meses clicáveis para histórico',
      'Calendário diário exibe temperatura e umidade registradas',
    ],
  },
  {
    id: '6',
    data: '2026-04-19',
    versao: 'S2.1',
    tipo: 'feature',
    titulo: 'Planos de Calibração — Grandezas',
    descricao: '34 grandezas pré-definidas por categoria + cadastro de grandezas customizadas.',
    autor: 'Dev',
    itens: [
      'Nova aba "Grandezas" com 34 grandezas pré-definidas',
      'Categorias: Elétrica, RF/TF, EMC, Ambiental',
      'Grandezas EMC incluem todas as IEC 61000-4-x e CISPR',
      'Cadastro de grandeza customizada com nome, símbolo e unidade',
      'Seletor de grandezas no modal de novo plano (multi-select com busca)',
    ],
  },
]

export default function ChangelogPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set(['3','4','5','6']))
  const [open, setOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [itensTxt, setItensTxt] = useState('')
  const [f, setF] = useState<Partial<Entry>>({ tipo: 'feature', data: '' })

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { setEntries(JSON.parse(saved)); return } catch {}
    }
    setEntries(ENTRIES_INICIAIS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ENTRIES_INICIAIS))
  }, [])

  function save(list: Entry[]) {
    setEntries(list)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }

  function openNew() {
    setEditEntry(null)
    setF({ tipo: 'feature', data: new Date().toISOString().slice(0, 10), autor: '' })
    setItensTxt('')
    setOpen(true)
  }

  function openEdit(e: Entry) {
    setEditEntry(e)
    setF({ ...e })
    setItensTxt((e.itens || []).join('\n'))
    setOpen(true)
  }

  function saveEntry() {
    if (!f.titulo || !f.data) { alert('Preencha título e data.'); return }
    const itens = itensTxt.split('\n').map(s => s.trim()).filter(Boolean)
    const entry: Entry = {
      id: editEntry?.id || Date.now().toString(),
      data: f.data!,
      versao: f.versao,
      tipo: f.tipo as TipoEntry,
      titulo: f.titulo!,
      descricao: f.descricao,
      autor: f.autor,
      itens: itens.length ? itens : undefined,
    }
    if (editEntry) {
      save(entries.map(e => e.id === editEntry.id ? entry : e))
    } else {
      const sorted = [...entries, entry].sort((a, b) => b.data.localeCompare(a.data))
      save(sorted)
    }
    setOpen(false)
  }

  function deleteEntry(id: string) {
    if (!confirm('Remover este registro?')) return
    save(entries.filter(e => e.id !== id))
  }

  function toggleExpand(id: string) {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const inp = 'input w-full'

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Projeto</p>
          <h1 className="font-display font-bold text-2xl text-white">Changelog</h1>
          <p className="text-white/35 text-sm mt-1">Histórico de implementações e melhorias do sistema.</p>
        </div>
        <button className="btn-primary text-xs" onClick={openNew}>
          <Plus size={13} /> Novo Registro
        </button>
      </div>

      <div className="space-y-3">
        {entries.map(e => {
          const cfg = TIPO_CFG[e.tipo]
          const expanded = expandidos.has(e.id)
          return (
            <div key={e.id} className="card overflow-hidden">
              <div
                className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-white/2 transition-colors"
                onClick={() => toggleExpand(e.id)}
              >
                {/* Data */}
                <div className="flex-shrink-0 w-20 text-right pt-0.5">
                  <p className="font-mono text-[10px] text-white/35">
                    {e.data.slice(8,10)}/{e.data.slice(5,7)}
                  </p>
                  <p className="font-mono text-[9px] text-white/20">
                    {e.data.slice(0,4)}
                  </p>
                </div>

                {/* Linha vertical */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-1">
                  <div className="w-2 h-2 rounded-full bg-gold/50 flex-shrink-0" />
                  <div className="w-px flex-1 bg-white/8 min-h-[12px]" />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    {e.versao && (
                      <span className="tag-chip text-[9px]">{e.versao}</span>
                    )}
                    <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                    <h3 className="font-display font-bold text-sm text-white">{e.titulo}</h3>
                  </div>
                  {e.descricao && (
                    <p className="text-[11px] text-white/45 mt-0.5">{e.descricao}</p>
                  )}
                  {e.autor && (
                    <p className="text-[10px] text-white/25 font-mono mt-1">por {e.autor}</p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={ev => ev.stopPropagation()}>
                  <button onClick={() => openEdit(e)} className="p-1.5 text-white/20 hover:text-accent transition-colors rounded">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => deleteEntry(e.id)} className="p-1.5 text-white/20 hover:text-danger transition-colors rounded">
                    <Trash2 size={12} />
                  </button>
                  <div className="p-1.5 text-white/20">
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </div>
                </div>
              </div>

              {/* Itens expandidos */}
              {expanded && e.itens && e.itens.length > 0 && (
                <div className="px-4 pb-3 border-t border-white/5">
                  <ul className="mt-2.5 space-y-1.5">
                    {e.itens.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-white/55">
                        <span className="w-1 h-1 rounded-full bg-gold/40 flex-shrink-0 mt-1.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}

        {entries.length === 0 && (
          <div className="card p-10 text-center text-white/25 italic text-sm">
            Nenhum registro ainda. Clique em "Novo Registro" para começar.
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editEntry ? 'Editar Registro' : 'Novo Registro'}
        footer={
          <>
            <button className="btn-secondary text-xs" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn-primary text-xs" onClick={saveEntry}>Salvar</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Data *</label>
            <input type="date" className={inp} value={f.data || ''} onChange={e => setF(p => ({ ...p, data: e.target.value }))} />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Versão / Sprint</label>
            <input className={inp} value={f.versao || ''} onChange={e => setF(p => ({ ...p, versao: e.target.value }))} placeholder="Ex: S2.1, v1.4..." />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Tipo</label>
            <select className={inp + ' bg-navy'} value={f.tipo || 'feature'} onChange={e => setF(p => ({ ...p, tipo: e.target.value as TipoEntry }))}>
              {(Object.keys(TIPO_CFG) as TipoEntry[]).map(t => (
                <option key={t} value={t}>{TIPO_CFG[t].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Autor</label>
            <input className={inp} value={f.autor || ''} onChange={e => setF(p => ({ ...p, autor: e.target.value }))} placeholder="Nome..." />
          </div>
          <div className="col-span-2">
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Título *</label>
            <input className={inp} value={f.titulo || ''} onChange={e => setF(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Módulo de Calibração..." />
          </div>
          <div className="col-span-2">
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Descrição</label>
            <input className={inp} value={f.descricao || ''} onChange={e => setF(p => ({ ...p, descricao: e.target.value }))} placeholder="Resumo curto..." />
          </div>
          <div className="col-span-2">
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">
              Itens <span className="text-white/25 normal-case">(um por linha)</span>
            </label>
            <textarea
              className={inp}
              rows={5}
              value={itensTxt}
              onChange={e => setItensTxt(e.target.value)}
              placeholder={'Nova funcionalidade X\nMelhoria em Y\nCorrigido bug em Z'}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
