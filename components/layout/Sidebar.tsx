'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Search, Cpu, Package, CheckSquare, Play,
  ClipboardList, Award, BookOpen, Monitor, FileText, ScrollText,
  BookMarked, Sigma, Thermometer, Settings, LogOut,
  ChevronRight, AlertCircle, BarChart2, GitCommitHorizontal
} from 'lucide-react'

interface SidebarProps {
  user?: {
    nome?: string
    email?: string
    role?: string
    laboratorios?: { nome?: string }
  } | null
}

const NAV = [
  {
    section: 'PRINCIPAL',
    items: [
      { href: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/ficha', icon: Search,          label: 'Ficha do Equipamento' },
    ],
  },
  {
    section: 'EQUIPAMENTOS',
    items: [
      { href: '/dashboard/equipamentos', icon: Cpu,     label: 'Equipamentos' },
      { href: '/dashboard/auxiliares',   icon: Package, label: 'Aparelhos Auxiliares' },
    ],
  },
  {
    section: 'CHECAGENS',
    items: [
      { href: '/dashboard/checagens/controle', icon: CheckSquare, label: 'Controle de Checagens' },
      { href: '/dashboard/checagens/realizar', icon: Play,        label: 'Realizar Checagem' },
    ],
  },
  {
    section: 'DOCUMENTAÇÃO',
    items: [
      { href: '/dashboard/calibracao',     icon: ClipboardList, label: 'Planos de Calibração' },
      { href: '/dashboard/certificados',   icon: Award,         label: 'Certificados' },
      { href: '/dashboard/manuais',        icon: BookOpen,      label: 'Manuais' },
      { href: '/dashboard/softwares',      icon: Monitor,       label: 'Softwares / Firmwares' },
      { href: '/dashboard/instrucoes',     icon: FileText,      label: 'Instruções de Trabalho' },
      { href: '/dashboard/procedimentos',  icon: ScrollText,    label: 'Proc. de Checagens' },
      { href: '/dashboard/normas',         icon: BookMarked,    label: 'Docs Normativos' },
    ],
  },
  {
    section: 'ANÁLISE',
    items: [
      { href: '/dashboard/incerteza', icon: Sigma,      label: 'Incerteza de Medição' },
      { href: '/dashboard/ambiente',  icon: Thermometer, label: 'Condições Ambientais' },
    ],
  },
  {
    section: 'PROJETO',
    items: [
      { href: '/dashboard/relatorio', icon: BarChart2, label: 'Relatório de Status' },
      { href: '/dashboard/changelog', icon: GitCommitHorizontal, label: 'Changelog' },
    ],
  },
]

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="w-56 min-w-56 bg-[#090c12] flex flex-col h-full border-r border-white/7 overflow-y-auto">

      {/* ── LOGO ─────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 border-b border-white/7">
        {/* Wordmark */}
        <div className="flex items-center gap-2.5 mb-3">
          {/* Ícone calibre */}
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold to-yellow-600
                          flex items-center justify-center flex-shrink-0
                          shadow-[0_2px_12px_rgba(232,185,75,0.35)]">
            <svg viewBox="0 0 36 36" className="w-6 h-6">
              <rect x="4"  y="15" width="28" height="3" rx="1.5" fill="rgba(11,14,20,0.4)"/>
              <rect x="13" y="10" width="10" height="13" rx="2"   fill="rgba(11,14,20,0.9)"/>
              <line x1="6"  y1="13" x2="6"  y2="18" stroke="rgba(11,14,20,0.5)" strokeWidth="1"/>
              <line x1="12" y1="13" x2="12" y2="18" stroke="rgba(11,14,20,0.5)" strokeWidth="1"/>
              <line x1="24" y1="13" x2="24" y2="18" stroke="rgba(11,14,20,0.5)" strokeWidth="1"/>
              <line x1="30" y1="13" x2="30" y2="18" stroke="rgba(11,14,20,0.5)" strokeWidth="1"/>
              <line x1="18" y1="8"  x2="18" y2="25" stroke="rgba(11,14,20,0.7)" strokeWidth="1.5"/>
              <circle cx="18" cy="16.5" r="2.5" fill="rgba(11,14,20,0.9)"/>
              <polygon points="18,6 15.5,10 20.5,10" fill="rgba(11,14,20,0.85)"/>
            </svg>
          </div>
          <span className="font-display font-bold text-[17px] tracking-wide text-white">
            LABI<span className="text-gold">ADIO</span>
          </span>
        </div>

        {/* Slogan */}
        <p className="font-mono text-[7.5px] tracking-[1.6px] text-white/25 leading-relaxed uppercase">
          Quality Management<br />ISO/IEC 17025:2017
        </p>
      </div>

      {/* ── NAVEGAÇÃO ────────────────────────────────── */}
      <nav className="flex-1 py-2">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-4 pt-3 pb-1 font-mono text-[7px] tracking-[2.5px] text-white/18 uppercase">
              {group.section}
            </p>
            {group.items.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-[7px] text-[11.5px] font-medium',
                    'border-l-2 transition-all duration-150',
                    active
                      ? 'bg-[#0f2040] text-white border-gold'
                      : 'text-white/45 border-transparent hover:bg-[#111827] hover:text-white/80'
                  )}
                >
                  <Icon
                    size={12}
                    className={cn('flex-shrink-0', active ? 'text-gold' : 'text-white/25')}
                  />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── FOOTER ───────────────────────────────────── */}
      <div className="border-t border-white/7 p-3 space-y-1">
        {/* Configurações */}
        <Link
          href="/dashboard/configuracoes"
          className="flex items-center gap-2 px-2 py-2 rounded-lg
                     text-white/40 text-[11px] hover:text-white hover:bg-white/5 transition-all"
        >
          <Settings size={13} />
          <span>Configurações</span>
          {user?.role === 'admin' && (
            <span className="ml-auto badge-gold text-[8px] px-1.5 py-0">ADMIN</span>
          )}
        </Link>

        {/* Usuário + Logout */}
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal to-accent
                          flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {user?.nome?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white font-medium truncate">
              {user?.nome || 'Usuário'}
            </p>
            <p className="text-[9px] text-white/30 font-mono truncate">
              {user?.laboratorios?.nome || 'Lab EMC'}
            </p>
          </div>
          <button
            onClick={logout}
            className="text-white/25 hover:text-danger transition-colors p-1"
            title="Sair"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </aside>
  )
}
