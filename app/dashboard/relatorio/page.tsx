import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle, Clock, AlertTriangle, Circle, TrendingUp, Target, Zap } from 'lucide-react'
import PrintButton from './PrintButton'

type SprintStatus = 'concluido' | 'andamento' | 'iniciado' | 'planejado' | 'bloqueado'

interface Sprint {
  id: string
  nome: string
  descricao: string
  status: SprintStatus
  pct: number
  entregas: string[]
  inicio?: string
  fim?: string
  bloqueio?: string
}

const SPRINTS: Sprint[] = [
  {
    id: 'S1',
    nome: 'MVP Online',
    descricao: 'Infraestrutura base, autenticação e dashboard',
    status: 'concluido',
    pct: 100,
    inicio: '2026-03-01',
    fim: '2026-04-19',
    entregas: [
      'Next.js 14 + TypeScript + Tailwind configurado',
      'Autenticação Supabase com Google OAuth',
      'Dashboard com alertas de calibração em tempo real',
      'Sidebar de navegação completa (13 abas)',
      'Design system customizado (navy + gold)',
    ],
  },
  {
    id: 'S2',
    nome: 'Módulos & Registros',
    descricao: 'Todas as páginas do sistema com formulários de registro completos',
    status: 'andamento',
    pct: 85,
    inicio: '2026-04-19',
    fim: '2026-05-10',
    entregas: [
      '13 páginas do sistema implementadas (todas as abas)',
      '10 modais de registro fiel ao protótipo HTML',
      'Componente Modal reutilizável com ESC e backdrop',
      'Formulário de Equipamento com normas e status',
      'Certificados, Manuais, Softwares, ITs, Procedimentos',
      'Documentos Normativos com normas pré-cadastradas',
      'Incerteza de Medição — calculadora GUM interativa',
      'Condições Ambientais — planilha mensal + calendário diário',
    ],
  },
  {
    id: 'S3',
    nome: 'Checagens',
    descricao: 'Controle e realização de checagens internas com cálculo automático',
    status: 'iniciado',
    pct: 30,
    inicio: '2026-05-11',
    fim: '2026-05-25',
    entregas: [
      'UI de realizar checagem (planilha interativa)',
      'Controle de periodicidade configurável',
      'Resultado automático PASS / FAIL',
      'Registro com temperatura e umidade ambiente',
      'Histórico por equipamento com edição',
    ],
  },
  {
    id: 'S4',
    nome: 'IA Consultora',
    descricao: 'Análise automática de certificados e relatórios via IA',
    status: 'planejado',
    pct: 0,
    inicio: '2026-05-26',
    fim: '2026-06-15',
    entregas: [
      'Extração de dados de certificados PDF',
      'Análise de conformidade ISO 17025',
      'Sugestões de ação baseadas em histórico',
      'Chat contextualizado com dados do lab',
    ],
  },
  {
    id: 'S5',
    nome: 'Auth Microsoft',
    descricao: 'Login SSO com conta corporativa Microsoft 365',
    status: 'planejado',
    pct: 0,
    inicio: '2026-06-16',
    fim: '2026-06-30',
    entregas: [
      'Integração Azure AD / Entra ID',
      'Login único com conta da empresa',
      'Sincronização de usuários e roles',
    ],
  },
  {
    id: 'S6',
    nome: 'Builder IA',
    descricao: 'Geração automática de documentos e instruções de trabalho',
    status: 'planejado',
    pct: 0,
    inicio: '2026-07-01',
    fim: '2026-07-31',
    entregas: [
      'Gerador de Instruções de Trabalho (IT)',
      'Gerador de Procedimentos de Checagem',
      'Templates conformes à ISO 17025',
      'Exportação em PDF formatado',
    ],
  },
  {
    id: 'S7',
    nome: 'Áudio + Relatórios',
    descricao: 'Interface de voz e relatórios executivos automáticos',
    status: 'planejado',
    pct: 0,
    inicio: '2026-08-01',
    fim: '2026-08-31',
    entregas: [
      'Entrada de dados por voz (Speech-to-Text)',
      'Relatório executivo mensal automático',
      'Exportação para Excel e PDF',
      'Dashboard gerencial para liderança',
    ],
  },
]

const STATUS_CONFIG: Record<SprintStatus, {
  label: string
  icon: React.ElementType
  badgeClass: string
  barClass: string
}> = {
  concluido: {
    label: 'CONCLUÍDO',
    icon: CheckCircle,
    badgeClass: 'bg-success/10 text-success border border-success/20',
    barClass: 'bg-success',
  },
  andamento: {
    label: 'EM ANDAMENTO',
    icon: Zap,
    badgeClass: 'bg-gold/10 text-gold border border-gold/20',
    barClass: 'bg-gold',
  },
  iniciado: {
    label: 'INICIADO',
    icon: TrendingUp,
    badgeClass: 'bg-accent/10 text-accent border border-accent/20',
    barClass: 'bg-accent',
  },
  planejado: {
    label: 'PLANEJADO',
    icon: Circle,
    badgeClass: 'bg-white/5 text-white/40 border border-white/10',
    barClass: 'bg-white/20',
  },
  bloqueado: {
    label: 'BLOQUEADO',
    icon: AlertTriangle,
    badgeClass: 'bg-danger/10 text-danger border border-danger/20',
    barClass: 'bg-danger',
  },
}

function fmtDate(dateStr?: string) {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '—'
  }
}

export default function RelatorioPage() {
  const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  const totalPct = Math.round(
    SPRINTS.reduce((acc, s) => acc + s.pct, 0) / SPRINTS.length
  )

  const concluidas = SPRINTS.filter(s => s.status === 'concluido').length
  const emAndamento = SPRINTS.filter(s => s.status === 'andamento' || s.status === 'iniciado').length
  const bloqueadas = SPRINTS.filter(s => s.status === 'bloqueado').length
  const sprintAtual = SPRINTS.find(s => s.status === 'andamento' || s.status === 'iniciado')

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
        <PrintButton />
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
            <p className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase mb-2 print:text-gray-500">
              {label}
            </p>
            <p className="font-display font-bold text-3xl text-white print:text-black">{value}</p>
            <p className="text-[10px] text-white/30 mt-1 print:text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Barra de progresso geral */}
      <div className="card p-4 mb-6 print:border print:rounded-none">
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono text-[9px] tracking-[2px] text-white/40 uppercase print:text-gray-500">
            Progresso Total do Projeto
          </p>
          <span className="font-display font-bold text-gold text-sm">{totalPct}%</span>
        </div>
        <div className="h-2 bg-white/8 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-yellow-400 rounded-full transition-all"
            style={{ width: `${totalPct}%` }}
          />
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
                  s.status === 'bloqueado' ? 'text-danger' :
                  'text-white/20'
                } />
                <span className="font-mono text-[7px] text-white/25">{s.id}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sprint atual em destaque */}
      {sprintAtual && (
        <div className="card border border-gold/20 p-5 mb-6 print:border-2 print:border-yellow-400 print:rounded-none">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-gold" />
            <p className="font-mono text-[9px] tracking-[2px] text-gold uppercase">
              Sprint Atual
            </p>
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

                  {/* ID */}
                  <div className="w-10 flex-shrink-0 text-center pt-0.5">
                    <span className="tag-chip text-[10px]">{sprint.id}</span>
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-display font-bold text-sm text-white print:text-black">
                        {sprint.nome}
                      </h3>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${cfg.badgeClass}`}>
                        <Icon size={8} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40 mb-2 print:text-gray-500">{sprint.descricao}</p>

                    {/* Entregas */}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      {sprint.entregas.map((e) => (
                        <span key={e} className="text-[10px] text-white/35 flex items-center gap-1 print:text-gray-400">
                          <span className={`w-1 h-1 rounded-full flex-shrink-0 ${
                            sprint.status === 'concluido' ? 'bg-success' :
                            sprint.status === 'andamento' || sprint.status === 'iniciado' ? 'bg-gold/60' :
                            'bg-white/15'
                          }`} />
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Datas e progresso */}
                  <div className="flex-shrink-0 text-right">
                    <p className="font-display font-bold text-sm text-white print:text-black">{sprint.pct}%</p>
                    <div className="w-20 h-1 bg-white/8 rounded-full mt-1 mb-1 ml-auto overflow-hidden">
                      <div className={`h-full rounded-full ${cfg.barClass}`} style={{ width: `${sprint.pct}%` }} />
                    </div>
                    {sprint.inicio && (
                      <p className="text-[9px] text-white/25 font-mono print:text-gray-400">
                        {fmtDate(sprint.fim)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bloqueio */}
                {sprint.bloqueio && (
                  <div className="mt-2 ml-14 flex items-center gap-1.5 text-danger text-[10px]">
                    <AlertTriangle size={10} />
                    {sprint.bloqueio}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Próximos passos */}
      <div className="card p-4 print:border print:rounded-none">
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

    </div>
  )
}
