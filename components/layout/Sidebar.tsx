'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Search, Cpu, Package, CheckSquare, Play,
  ClipboardList, Award, BookOpen, Monitor, FileText, ScrollText,
  BookMarked, Sigma, Thermometer, BarChart2, GitCommitHorizontal,
  LogOut, PanelLeftClose, PanelLeftOpen, Settings,
} from 'lucide-react'

interface SidebarProps {
  user?: { nome?: string; email?: string; role?: string; laboratorios?: { nome?: string } } | null
}

const NAV_GROUPS = [
  {
    items: [
      { href: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/ficha', icon: Search,          label: 'Ficha do Equipamento' },
    ],
  },
  {
    items: [
      { href: '/dashboard/equipamentos', icon: Cpu,     label: 'Equipamentos' },
      { href: '/dashboard/auxiliares',   icon: Package, label: 'Auxiliares' },
    ],
  },
  {
    items: [
      { href: '/dashboard/checagens/controle', icon: CheckSquare, label: 'Controle de Checagens' },
      { href: '/dashboard/checagens/realizar', icon: Play,        label: 'Realizar Checagem' },
    ],
  },
  {
    items: [
      { href: '/dashboard/calibracao',    icon: ClipboardList, label: 'Planos de Calibração' },
      { href: '/dashboard/certificados',  icon: Award,         label: 'Certificados' },
      { href: '/dashboard/manuais',       icon: BookOpen,      label: 'Manuais' },
      { href: '/dashboard/softwares',     icon: Monitor,       label: 'Softwares / Firmwares' },
      { href: '/dashboard/instrucoes',    icon: FileText,      label: 'Instruções de Trabalho' },
      { href: '/dashboard/procedimentos', icon: ScrollText,    label: 'Proc. de Checagens' },
      { href: '/dashboard/normas',        icon: BookMarked,    label: 'Docs Normativos' },
    ],
  },
  {
    items: [
      { href: '/dashboard/incerteza', icon: Sigma,       label: 'Incerteza de Medição' },
      { href: '/dashboard/ambiente',  icon: Thermometer, label: 'Condições Ambientais' },
    ],
  },
  {
    items: [
      { href: '/dashboard/relatorio', icon: BarChart2,           label: 'Relatório de Status' },
      { href: '/dashboard/changelog', icon: GitCommitHorizontal, label: 'Changelog' },
    ],
  },
]

function NavItem({ href, icon: Icon, label, active, collapsed }: {
  href: string; icon: any; label: string; active: boolean; collapsed: boolean
}) {
  return (
    <div className="relative group/nav px-2">
      <Link
        href={href}
        className={cn(
          'nav-item w-full',
          collapsed && 'justify-center px-0 py-2.5',
          active && 'active',
        )}
      >
        <Icon size={14} className={cn('nav-icon flex-shrink-0', collapsed && 'mx-auto')} />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
      {/* Tooltip quando collapsed */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                        px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white whitespace-nowrap
                        opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150"
             style={{ background: 'rgba(20,22,32,0.97)', boxShadow: '0 4px 16px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)' }}>
          {label}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('labiadio_sidebar_collapsed')
    if (saved !== null) setCollapsed(JSON.parse(saved))
  }, [])

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('labiadio_sidebar_collapsed', JSON.stringify(next))
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const initial = (user?.nome || user?.email || '?')[0].toUpperCase()

  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r border-white/5 flex-shrink-0 overflow-hidden transition-all duration-250',
        collapsed ? 'w-14' : 'w-sidebar',
      )}
      style={{ background: '#070A10' }}
    >
      {/* ── Logo + toggle ── */}
      <div className={cn(
        'flex items-center border-b border-white/5 flex-shrink-0',
        collapsed ? 'justify-center py-4 px-2' : 'justify-between px-4 py-4',
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #F5D27A, #C49A2E)', boxShadow: '0 2px 10px rgba(232,185,75,0.3)' }}>
              <svg viewBox="0 0 36 36" className="w-4.5 h-4.5 w-[18px] h-[18px]">
                <rect x="4" y="15" width="28" height="3" rx="1.5" fill="rgba(6,9,17,0.5)"/>
                <rect x="13" y="10" width="10" height="13" rx="2" fill="rgba(6,9,17,0.95)"/>
                <line x1="6"  y1="13" x2="6"  y2="18" stroke="rgba(6,9,17,0.6)" strokeWidth="1"/>
                <line x1="12" y1="13" x2="12" y2="18" stroke="rgba(6,9,17,0.6)" strokeWidth="1"/>
                <line x1="24" y1="13" x2="24" y2="18" stroke="rgba(6,9,17,0.6)" strokeWidth="1"/>
                <line x1="30" y1="13" x2="30" y2="18" stroke="rgba(6,9,17,0.6)" strokeWidth="1"/>
                <line x1="18" y1="8"  x2="18" y2="25" stroke="rgba(6,9,17,0.75)" strokeWidth="1.5"/>
                <circle cx="18" cy="16.5" r="2.5" fill="rgba(6,9,17,0.95)"/>
                <polygon points="18,6 15.5,10 20.5,10" fill="rgba(6,9,17,0.9)"/>
              </svg>
            </div>
            <span className="font-display font-bold text-[15px] tracking-wide text-white">
              LABI<span className="text-gold">ADIO</span>
            </span>
          </div>
        )}
        <button
          onClick={toggle}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-white hover:bg-white/6 transition-all duration-150 flex-shrink-0"
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* ── Navegação ── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && (
              <div className={cn(
                'my-2',
                collapsed ? 'mx-3 border-t border-white/5' : 'mx-4 border-t border-white/5',
              )} />
            )}
            {group.items.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={active}
                  collapsed={collapsed}
                />
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-white/5 p-2 space-y-1 flex-shrink-0">
        {/* Configurações */}
        <div className="relative group/nav px-0">
          <Link
            href="/dashboard/configuracoes"
            className={cn('nav-item w-full', collapsed && 'justify-center px-0 py-2')}
          >
            <Settings size={13} className="nav-icon flex-shrink-0" />
            {!collapsed && <span className="text-[11px]">Configurações</span>}
          </Link>
          {collapsed && (
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                            px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white whitespace-nowrap
                            opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150"
                 style={{ background: 'rgba(20,22,32,0.97)', boxShadow: '0 4px 16px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)' }}>
              Configurações
            </div>
          )}
        </div>

        {/* Usuário */}
        <div className={cn(
          'flex items-center gap-2 px-2 py-2 rounded-lg',
          collapsed && 'justify-center',
        )}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-navy flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #22D3C8, #16A8A0)' }}>
            {initial}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white/80 font-medium truncate leading-tight">
                {user?.nome || 'Usuário'}
              </p>
              <p className="text-[9px] text-white/25 font-mono truncate leading-tight">
                {user?.laboratorios?.nome || 'Lab EMC · PUCRS'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button onClick={logout} className="text-white/20 hover:text-danger transition-colors p-1 rounded" title="Sair">
              <LogOut size={12} />
            </button>
          )}
          {collapsed && (
            <button onClick={logout} className="absolute right-1 bottom-1 text-white/20 hover:text-danger transition-colors p-1 hidden" />
          )}
        </div>
        {collapsed && (
          <button onClick={logout}
            className="w-full flex justify-center py-1.5 text-white/20 hover:text-danger transition-colors rounded-lg hover:bg-white/4">
            <LogOut size={12} />
          </button>
        )}
      </div>
    </aside>
  )
}
