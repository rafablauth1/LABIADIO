'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle, Clock, AlertTriangle, Circle, TrendingUp, Target, Zap,
  Lock, Plus, Trash2, Check, X, Edit2, Calendar, User, RotateCcw,
} from 'lucide-react'
import PrintButton from './PrintButton'
import Modal from '@/components/ui/Modal'

// ─── Sprint types ──────────────────────────────────────────────────────────────
type SprintStatus = 'concluido' | 'andamento' | 'iniciado' | 'planejado' | 'bloqueado'
interface Sprint {
  id: string; nome: string; descricao: string; status: SprintStatus
  pct: number; entregas: string[]; inicio?: string; fim?: string; bloqueio?: string
}

const SPRINTS: Sprint[] = [
  {
    id: 'S1', nome: 'MVP Online',
    descricao: 'Infraestrutura base, autenticação e dashboard',
    status: 'concluido', pct: 100, inicio: '2026-03-01', fim: '2026-04-19',
    entregas: [
      'Next.js 14 + TypeScript + Tailwind configurado',
      'Autenticação Supabase com Google OAuth',
      'Dashboard com alertas de calibração em tempo real',
      'Sidebar de navegação completa (13 abas)',
      'Design system customizado (navy + gold)',
    ],
  },
  {
    id: 'S2', nome: 'Módulos & Registros',
    descricao: 'Todas as páginas do sistema com formulários de registro completos',
    status: 'concluido', pct: 100, inicio: '2026-04-19', fim: '2026-04-24',
    entregas: [
      '13 páginas do sistema implementadas (todas as abas)',
      '10 modais de registro fiel ao protótipo HTML',
      'Componente Modal reutilizável com ESC e backdrop',
      'Formulário de Equipamento com normas multi-select e status',
      'Certificados, Manuais, Softwares, ITs, Procedimentos',
      'Documentos Normativos com normas pré-cadastradas e múltiplos PDFs',
      'Incerteza de Medição — calculadora GUM interativa',
      'Condições Ambientais — planilha mensal + medidores por sala',
      'Análise automática de PDFs via IA (Anthropic, Azure OpenAI, Gemini)',
    ],
  },
  {
    id: 'S3', nome: 'Integração & Checagens',
    descricao: 'Equipamentos integrados em todo o sistema, checagens completas e ficha unificada',
    status: 'concluido', pct: 100, inicio: '2026-04-25', fim: '2026-04-25',
    entregas: [
      'Integração de equipamentos em todos os dropdowns do sistema',
      'Edição e exclusão de equipamentos com confirmação',
      'Ficha do equipamento (/equipamentos/[id]) com certificados e checagens',
      'Ficha integrada com 6 mini-abas: Certificados, Checagens, Auxiliares, Manuais, Softwares, Plano Cal.',
      'Importação de Excel (.xlsx) no Controle de Checagens com auto-mapeamento de colunas',
      'Pontos de medição editáveis inline (editar/deletar por linha)',
      'Checagem via IT CHK PDF: IA extrai grandezas → tabela de pontos para o operador',
      'Resultado por ponto calculado automaticamente (critério ± absoluto ou %)',
    ],
  },
  {
    id: 'S4', nome: 'Fotos, IA & Ambiente',
    descricao: 'Upload de fotos, análise PDF por IA funcional, condições ambientais por sala e melhorias gerais',
    status: 'concluido', pct: 100, inicio: '2026-04-26', fim: '2026-04-27',
    entregas: [
      'Upload e exibição de foto para equipamentos e auxiliares (Supabase Storage)',
      'Layout ficha: foto 50/50 com campos de identificação lado a lado',
      'Botão "Analisar PDF com IA" funcional — Claude Haiku extrai campos automaticamente',
      'IA ativa em: Certificados, Manuais, ITs, Procedimentos, Normas e IT CHK',
      'Filtro por ano com separadores em Certificados, Checagens, Manuais e Plano de Calibração',
      'Editar e excluir certificados e manuais direto da ficha',
      'Certificado salvo atualiza automaticamente as datas de calibração do equipamento',
      'Manual vinculado por dropdown de equipamentos cadastrados (obrigatório)',
      'Condições Ambientais: instalações por sala (prédio/bloco/sala/área) com termohigrômetro',
      'Limites de temperatura e umidade por instalação — alerta em tempo real ao registrar',
      'Auxiliares com múltiplos padrões vinculados (multi-select com busca)',
      'Migrations executadas via Supabase CLI — todas as tabelas criadas no banco',
    ],
  },
  {
    id: 'S5', nome: 'Infraestrutura Azure',
    descricao: 'Migração para Azure (banco, auth e IA) — aguardando decisão com gestor',
    status: 'iniciado', pct: 40, inicio: '2026-04-25', fim: '2026-05-30',
    entregas: [
      '✅ Abstração de IA (lib/ai/): Anthropic, Azure OpenAI, Google Gemini — troca via .env',
      '✅ Abstração de banco (lib/db/): guia completo para Azure PostgreSQL',
      '✅ Abstração de auth (lib/auth/): guia NextAuth.js + Microsoft Entra ID',
      '✅ Abstração de storage (lib/storage/): guia Azure Blob Storage',
      '✅ Login atualizado para "Entrar com Microsoft 365"',
      '⏳ Aguardando: reunião com gestor para definir tenant Azure e plataforma de IA',
      '⏳ Pendente: App Registration no Azure Entra ID (Client ID + Secret)',
      '⏳ Pendente: Provisionamento Azure PostgreSQL Flexible Server',
      '⏳ Pendente: Configurar provedor Azure no painel Supabase (ou migrar para NextAuth)',
    ],
    bloqueio: 'Aguardando reunião com gestor para definição do tenant Azure e budget de IA',
  },
  {
    id: 'S6', nome: 'IA Consultora',
    descricao: 'Análise automática de documentos, conformidade ISO 17025 e chat contextualizado',
    status: 'planejado', pct: 0, inicio: '2026-06-01', fim: '2026-06-30',
    entregas: [
      'Extração automática de dados de certificados de calibração PDF',
      'Análise de conformidade ISO/IEC 17025 por equipamento',
      'Alertas inteligentes baseados em histórico de checagens',
      'Geração automática de IT CHK a partir de dados do equipamento',
      'Chat contextualizado com dados do laboratório',
    ],
  },
  {
    id: 'S7', nome: 'Builder de Documentos',
    descricao: 'Geração automática de ITs, Procedimentos e relatórios em PDF formatado',
    status: 'planejado', pct: 0, inicio: '2026-07-01', fim: '2026-07-31',
    entregas: [
      'Gerador de Instruções de Trabalho (IT CHK) a partir do cadastro do equipamento',
      'Gerador de Procedimentos de Checagem conformes à ISO 17025',
      'Templates com logo LABELO/PUCRS e assinatura digital',
      'Exportação em PDF formatado e Word editável',
    ],
  },
  {
    id: 'S8', nome: 'Relatórios Executivos',
    descricao: 'Dashboard gerencial, exportações e relatório mensal automático',
    status: 'planejado', pct: 0, inicio: '2026-08-01', fim: '2026-08-31',
    entregas: [
      'Dashboard gerencial com indicadores de qualidade (KPIs)',
      'Relatório executivo mensal gerado automaticamente',
      'Exportação de checagens e calibrações para Excel',
      'Entrada de dados por voz (Speech-to-Text)',
      'Notificações automáticas de vencimento por e-mail (Office 365)',
    ],
  },
]

const STATUS_CONFIG: Record<SprintStatus, { label: string; icon: React.ElementType; badgeClass: string; barClass: string }> = {
  concluido: { label: 'CONCLUÍDO', icon: CheckCircle, badgeClass: 'bg-success/10 text-success border border-success/20', barClass: 'bg-success' },
  andamento: { label: 'EM ANDAMENTO', icon: Zap, badgeClass: 'bg-gold/10 text-gold border border-gold/20', barClass: 'bg-gold' },
  iniciado:  { label: 'INICIADO', icon: TrendingUp, badgeClass: 'bg-accent/10 text-accent border border-accent/20', barClass: 'bg-accent' },
  planejado: { label: 'PLANEJADO', icon: Circle, badgeClass: 'bg-white/5 text-white/40 border border-white/10', barClass: 'bg-white/20' },
  bloqueado: { label: 'BLOQUEADO', icon: AlertTriangle, badgeClass: 'bg-danger/10 text-danger border border-danger/20', barClass: 'bg-danger' },
}

function fmtDate(dateStr?: string) {
  if (!dateStr) return '—'
  try { return format(new Date(dateStr + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) } catch { return '—' }
}

// ─── Tarefa types ──────────────────────────────────────────────────────────────
type TarefaStatus = 'pendente' | 'aprovado' | 'reprovado'
type TarefaFreq = 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | 'unica'

interface Tarefa {
  id: string
  titulo: string
  descricao?: string
  frequencia: TarefaFreq
  responsavel?: string
  data_prevista?: string
  status: TarefaStatus
  obs?: string
}

const FREQ_LABELS: Record<TarefaFreq, string> = {
  diaria: 'Diária', semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal', unica: 'Única',
}

const SENHA_CORRETA = 'labiadio2026'
const AUTH_KEY = 'relatorio_auth'
const TAREFAS_KEY = 'labiadio_tarefas'

// ─── Component ────────────────────────────────────────────────────────────────
export default function RelatorioPage() {
  const [hoje, setHoje] = useState('')
  useEffect(() => {
    setHoje(format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))
  }, [])

  // Auth
  const [authed, setAuthed] = useState(false)
  const [senha, setSenha] = useState('')
  const [senhaErr, setSenhaErr] = useState(false)

  // Tarefas
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [filtroFreq, setFiltroFreq] = useState<'todos' | TarefaFreq>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | TarefaStatus>('todos')
  const [modalTarefa, setModalTarefa] = useState(false)
  const [editTarefa, setEditTarefa] = useState<Tarefa | null>(null)
  const [tf, setTf] = useState<Partial<Tarefa>>({ frequencia: 'semanal', status: 'pendente' })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem(AUTH_KEY) === '1') setAuthed(true)
      const saved = localStorage.getItem(TAREFAS_KEY)
      if (saved) { try { setTarefas(JSON.parse(saved)) } catch {} }
    }
  }, [])

  function handleSenha() {
    if (senha === SENHA_CORRETA) {
      sessionStorage.setItem(AUTH_KEY, '1')
      setAuthed(true)
    } else {
      setSenhaErr(true)
      setTimeout(() => setSenhaErr(false), 1800)
    }
  }

  function saveTarefas(list: Tarefa[]) {
    setTarefas(list)
    localStorage.setItem(TAREFAS_KEY, JSON.stringify(list))
  }

  function openNew() {
    setEditTarefa(null)
    setTf({ frequencia: 'semanal', status: 'pendente', data_prevista: '' })
    setModalTarefa(true)
  }

  function openEdit(t: Tarefa) {
    setEditTarefa(t)
    setTf({ ...t })
    setModalTarefa(true)
  }

  function saveTarefa() {
    if (!tf.titulo) { alert('Informe o título da tarefa.'); return }
    if (editTarefa) {
      saveTarefas(tarefas.map(t => t.id === editTarefa.id ? { ...t, ...tf } as Tarefa : t))
    } else {
      saveTarefas([...tarefas, { id: Date.now().toString(), ...tf } as Tarefa])
    }
    setModalTarefa(false)
  }

  function toggleStatus(id: string, status: TarefaStatus) {
    saveTarefas(tarefas.map(t => t.id === id ? { ...t, status } : t))
  }

  function deleteTarefa(id: string) {
    if (!confirm('Remover esta tarefa?')) return
    saveTarefas(tarefas.filter(t => t.id !== id))
  }

  const tarefasFiltradas = tarefas.filter(t => {
    if (filtroFreq !== 'todos' && t.frequencia !== filtroFreq) return false
    if (filtroStatus !== 'todos' && t.status !== filtroStatus) return false
    return true
  })

  const totalPct = Math.round(SPRINTS.reduce((acc, s) => acc + s.pct, 0) / SPRINTS.length)
  const concluidas = SPRINTS.filter(s => s.status === 'concluido').length
  const emAndamento = SPRINTS.filter(s => s.status === 'andamento' || s.status === 'iniciado').length
  const bloqueadas = SPRINTS.filter(s => s.status === 'bloqueado').length
  const sprintAtual = SPRINTS.find(s => s.status === 'andamento' || s.status === 'iniciado')

  // ── Password wall ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
            <Lock size={20} className="text-gold" />
          </div>
          <h2 className="font-display font-bold text-lg text-white mb-1">Relatório de Status</h2>
          <p className="text-white/40 text-sm mb-6">Informe a senha para acessar este relatório.</p>
          <input
            type="password"
            className={`input w-full text-center mb-3 transition-colors ${senhaErr ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
            placeholder="Senha de acesso"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSenha()}
            autoFocus
          />
          {senhaErr && <p className="text-danger text-xs mb-3">Senha incorreta.</p>}
          <button className="btn-primary w-full text-sm" onClick={handleSenha}>
            Acessar
          </button>
        </div>
      </div>
    )
  }

  // ── Main content ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto print:max-w-full print:text-black">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 print:mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1 print:text-yellow-700">
            Relatório de Projeto
          </p>
          <h1 className="font-display font-bold text-2xl text-white print:text-black">
            LABIADIO — Status do Desenvolvimento
          </h1>
          <p className="text-white/40 text-sm mt-1 print:text-gray-500">
            Sistema de Gestão de Equipamentos · ISO/IEC 17025:2017
          </p>
          <p className="text-white/25 text-xs font-mono mt-2 print:text-gray-400">
            Gerado em {hoje}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            className="btn-secondary text-xs flex items-center gap-1"
            onClick={() => { sessionStorage.removeItem(AUTH_KEY); setAuthed(false); setSenha('') }}
          >
            <Lock size={11} /> Bloquear
          </button>
          <PrintButton />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Progresso Geral', value: `${totalPct}%`, color: 'border-t-gold', sub: 'das 7 sprints' },
          { label: 'Concluídas', value: concluidas, color: 'border-t-success', sub: 'sprints finalizadas' },
          { label: 'Em Execução', value: emAndamento, color: 'border-t-accent', sub: 'sprints ativas' },
          { label: 'Bloqueadas', value: bloqueadas, color: 'border-t-danger', sub: bloqueadas > 0 ? 'requer atenção' : 'sem bloqueios' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className={`card border-t-2 ${color} p-4 print:border print:rounded-none`}>
            <p className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase mb-2 print:text-gray-500">{label}</p>
            <p className="font-display font-bold text-3xl text-white print:text-black">{value}</p>
            <p className="text-[10px] text-white/30 mt-1 print:text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Barra de progresso geral */}
      <div className="card p-4 mb-6 print:border print:rounded-none">
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono text-[9px] tracking-[2px] text-white/40 uppercase print:text-gray-500">Progresso Total do Projeto</p>
          <span className="font-display font-bold text-gold text-sm">{totalPct}%</span>
        </div>
        <div className="h-2 bg-white/8 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gold to-yellow-400 rounded-full transition-all" style={{ width: `${totalPct}%` }} />
        </div>
        <div className="flex justify-between mt-2">
          {SPRINTS.map((s) => {
            const cfg = STATUS_CONFIG[s.status]
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-0.5">
                <cfg.icon size={10} className={
                  s.status === 'concluido' ? 'text-success' :
                  s.status === 'andamento' ? 'text-gold' :
                  s.status === 'iniciado' ? 'text-accent' :
                  s.status === 'bloqueado' ? 'text-danger' : 'text-white/20'
                } />
                <span className="font-mono text-[7px] text-white/25">{s.id}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sprint atual */}
      {sprintAtual && (
        <div className="card border border-gold/20 p-5 mb-6 print:border-2 print:border-yellow-400 print:rounded-none">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-gold" />
            <p className="font-mono text-[9px] tracking-[2px] text-gold uppercase">Sprint Atual</p>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display font-bold text-lg text-white print:text-black">
                {sprintAtual.id} · {sprintAtual.nome}
              </h2>
              <p className="text-white/50 text-sm mt-0.5 print:text-gray-500">{sprintAtual.descricao}</p>
              <p className="text-white/25 text-xs font-mono mt-1 print:text-gray-400">
                {fmtDate(sprintAtual.inicio)} → {fmtDate(sprintAtual.fim)}
              </p>
            </div>
            <span className="font-display font-bold text-2xl text-gold">{sprintAtual.pct}%</span>
          </div>
          <div className="h-1.5 bg-white/8 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-gold rounded-full" style={{ width: `${sprintAtual.pct}%` }} />
          </div>
        </div>
      )}

      {/* Tabela de sprints */}
      <div className="card mb-6 print:border print:rounded-none">
        <div className="px-4 py-3 border-b border-white/7">
          <h2 className="font-display font-bold text-sm text-white flex items-center gap-2 print:text-black">
            <Target size={14} className="text-gold" />
            Plano de Sprints
          </h2>
        </div>
        <div className="divide-y divide-white/5">
          {SPRINTS.map((sprint) => {
            const cfg = STATUS_CONFIG[sprint.status]
            const Icon = cfg.icon
            return (
              <div key={sprint.id} className="p-4 hover:bg-white/2 print:hover:bg-transparent">
                <div className="flex items-start gap-4">
                  <div className="w-10 flex-shrink-0 text-center pt-0.5">
                    <span className="tag-chip text-[10px]">{sprint.id}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-display font-bold text-sm text-white print:text-black">{sprint.nome}</h3>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${cfg.badgeClass}`}>
                        <Icon size={8} />{cfg.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40 mb-2 print:text-gray-500">{sprint.descricao}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      {sprint.entregas.map((e) => (
                        <span key={e} className="text-[10px] text-white/35 flex items-center gap-1 print:text-gray-400">
                          <span className={`w-1 h-1 rounded-full flex-shrink-0 ${
                            sprint.status === 'concluido' ? 'bg-success' :
                            sprint.status === 'andamento' || sprint.status === 'iniciado' ? 'bg-gold/60' : 'bg-white/15'
                          }`} />
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="font-display font-bold text-sm text-white print:text-black">{sprint.pct}%</p>
                    <div className="w-20 h-1 bg-white/8 rounded-full mt-1 mb-1 ml-auto overflow-hidden">
                      <div className={`h-full rounded-full ${cfg.barClass}`} style={{ width: `${sprint.pct}%` }} />
                    </div>
                    {sprint.inicio && (
                      <p className="text-[9px] text-white/25 font-mono print:text-gray-400">{fmtDate(sprint.fim)}</p>
                    )}
                  </div>
                </div>
                {sprint.bloqueio && (
                  <div className="mt-2 ml-14 flex items-center gap-1.5 text-danger text-[10px]">
                    <AlertTriangle size={10} />{sprint.bloqueio}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Próximas entregas */}
      <div className="card p-4 mb-6 print:border print:rounded-none">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-accent" />
          <h2 className="font-display font-bold text-sm text-white print:text-black">Próximas Entregas</h2>
        </div>
        <div className="space-y-2">
          {SPRINTS.filter(s => s.status !== 'concluido')
            .slice(0, 3)
            .flatMap(s => s.entregas.slice(0, 2).map(e => ({ sprint: s.id, nome: s.nome, entrega: e })))
            .map(({ sprint, nome, entrega }) => (
              <div key={`${sprint}-${entrega}`} className="flex items-center gap-3">
                <span className="tag-chip text-[9px]">{sprint}</span>
                <span className="text-[10px] text-white/50 print:text-gray-500">{nome}</span>
                <span className="text-[10px] text-white/70 print:text-black">→ {entrega}</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Programação de Próximos Passos ──────────────────────────────────── */}
      <div className="card mb-6 print:border print:rounded-none">
        <div className="px-4 py-3 border-b border-white/7 flex items-center justify-between">
          <h2 className="font-display font-bold text-sm text-white flex items-center gap-2 print:text-black">
            <Calendar size={14} className="text-gold" />
            Programação de Próximos Passos
          </h2>
          <button className="btn-primary text-xs print:hidden" onClick={openNew}>
            <Plus size={12} /> Nova Tarefa
          </button>
        </div>

        {/* Filtros */}
        <div className="px-4 py-2.5 border-b border-white/5 flex flex-wrap gap-2 print:hidden">
          <div className="flex gap-1">
            {(['todos', 'diaria', 'semanal', 'quinzenal', 'mensal', 'unica'] as const).map(f => (
              <button key={f} onClick={() => setFiltroFreq(f)}
                className={`font-mono text-[9px] px-2 py-1 rounded transition-colors ${
                  filtroFreq === f ? 'bg-gold/20 text-gold' : 'text-white/30 hover:text-white/60'
                }`}
              >
                {f === 'todos' ? 'Todos' : FREQ_LABELS[f as TarefaFreq]}
              </button>
            ))}
          </div>
          <div className="w-px bg-white/8 self-stretch" />
          <div className="flex gap-1">
            {(['todos', 'pendente', 'aprovado', 'reprovado'] as const).map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                className={`font-mono text-[9px] px-2 py-1 rounded transition-colors ${
                  filtroStatus === s
                    ? s === 'aprovado' ? 'bg-success/20 text-success'
                    : s === 'reprovado' ? 'bg-danger/20 text-danger'
                    : s === 'pendente' ? 'bg-gold/20 text-gold'
                    : 'bg-white/10 text-white/60'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {tarefasFiltradas.length === 0 ? (
          <div className="px-4 py-10 text-center text-white/25 italic text-sm">
            {tarefas.length === 0 ? 'Nenhuma tarefa cadastrada. Clique em "Nova Tarefa" para começar.' : 'Nenhuma tarefa encontrada com os filtros selecionados.'}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tarefasFiltradas.map(t => (
              <div key={t.id} className="px-4 py-3 hover:bg-white/2 flex items-start gap-3">
                {/* Frequência */}
                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 flex-shrink-0 mt-0.5">
                  {FREQ_LABELS[t.frequencia]}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-white/80">{t.titulo}</p>
                  {t.descricao && <p className="text-[10px] text-white/40 mt-0.5">{t.descricao}</p>}
                  <div className="flex flex-wrap gap-3 mt-1">
                    {t.responsavel && (
                      <span className="text-[10px] text-white/35 flex items-center gap-1">
                        <User size={9} />{t.responsavel}
                      </span>
                    )}
                    {t.data_prevista && (
                      <span className="text-[10px] text-white/35 flex items-center gap-1">
                        <Calendar size={9} />{t.data_prevista!.slice(8,10)+'/'+t.data_prevista!.slice(5,7)+'/'+t.data_prevista!.slice(0,4)}
                      </span>
                    )}
                    {t.obs && <span className="text-[10px] text-white/30 italic">{t.obs}</span>}
                  </div>
                </div>

                {/* Status + ações */}
                <div className="flex items-center gap-1.5 flex-shrink-0 print:hidden">
                  <button
                    title="Aprovado"
                    onClick={() => toggleStatus(t.id, 'aprovado')}
                    className={`p-1.5 rounded transition-colors ${
                      t.status === 'aprovado' ? 'bg-success/20 text-success' : 'text-white/20 hover:text-success/60'
                    }`}
                  ><Check size={12} /></button>
                  <button
                    title="Reprovado"
                    onClick={() => toggleStatus(t.id, 'reprovado')}
                    className={`p-1.5 rounded transition-colors ${
                      t.status === 'reprovado' ? 'bg-danger/20 text-danger' : 'text-white/20 hover:text-danger/60'
                    }`}
                  ><X size={12} /></button>
                  <button
                    title="Pendente"
                    onClick={() => toggleStatus(t.id, 'pendente')}
                    className={`p-1.5 rounded transition-colors ${
                      t.status === 'pendente' ? 'bg-gold/20 text-gold' : 'text-white/20 hover:text-gold/60'
                    }`}
                  ><RotateCcw size={12} /></button>
                  <button onClick={() => openEdit(t)} className="p-1.5 text-white/20 hover:text-accent transition-colors rounded">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => deleteTarefa(t.id)} className="p-1.5 text-white/20 hover:text-danger transition-colors rounded">
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Status badge (print) */}
                <span className={`hidden print:inline font-mono text-[9px] px-2 py-0.5 rounded ${
                  t.status === 'aprovado' ? 'bg-green-100 text-green-700' :
                  t.status === 'reprovado' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Resumo */}
        {tarefas.length > 0 && (
          <div className="px-4 py-2.5 border-t border-white/5 flex gap-4">
            {[
              { label: 'Total', value: tarefas.length, cls: 'text-white/40' },
              { label: 'Aprovadas', value: tarefas.filter(t => t.status === 'aprovado').length, cls: 'text-success' },
              { label: 'Reprovadas', value: tarefas.filter(t => t.status === 'reprovado').length, cls: 'text-danger' },
              { label: 'Pendentes', value: tarefas.filter(t => t.status === 'pendente').length, cls: 'text-gold' },
            ].map(({ label, value, cls }) => (
              <span key={label} className="font-mono text-[9px] text-white/30">
                {label}: <span className={`font-bold ${cls}`}>{value}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Modal de tarefa */}
      <Modal
        open={modalTarefa}
        onClose={() => setModalTarefa(false)}
        title={editTarefa ? 'Editar Tarefa' : 'Nova Tarefa'}
        footer={
          <>
            <button className="btn-secondary text-xs" onClick={() => setModalTarefa(false)}>Cancelar</button>
            <button className="btn-primary text-xs" onClick={saveTarefa}>Salvar</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Título *</label>
            <input className="input w-full" value={tf.titulo || ''} onChange={e => setTf(p => ({ ...p, titulo: e.target.value }))} placeholder="Descreva a tarefa..." />
          </div>
          <div className="col-span-2">
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Descrição</label>
            <textarea className="input w-full" rows={2} value={tf.descricao || ''} onChange={e => setTf(p => ({ ...p, descricao: e.target.value }))} placeholder="Detalhes adicionais..." />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Frequência</label>
            <select className="input w-full bg-navy" value={tf.frequencia || 'semanal'} onChange={e => setTf(p => ({ ...p, frequencia: e.target.value as TarefaFreq }))}>
              <option value="diaria">Diária</option>
              <option value="semanal">Semanal</option>
              <option value="quinzenal">Quinzenal</option>
              <option value="mensal">Mensal</option>
              <option value="unica">Única / Pontual</option>
            </select>
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Status</label>
            <select className="input w-full bg-navy" value={tf.status || 'pendente'} onChange={e => setTf(p => ({ ...p, status: e.target.value as TarefaStatus }))}>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="reprovado">Reprovado</option>
            </select>
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Responsável</label>
            <input className="input w-full" value={tf.responsavel || ''} onChange={e => setTf(p => ({ ...p, responsavel: e.target.value }))} placeholder="Nome..." />
          </div>
          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Data Prevista</label>
            <input type="date" className="input w-full" value={tf.data_prevista || ''} onChange={e => setTf(p => ({ ...p, data_prevista: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Observação</label>
            <input className="input w-full" value={tf.obs || ''} onChange={e => setTf(p => ({ ...p, obs: e.target.value }))} placeholder="Obs. adicionais..." />
          </div>
        </div>
      </Modal>

    </div>
  )
}
