'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const LABELS: Record<string, { eyebrow: string; title: string }> = {
  '/dashboard':                        { eyebrow: 'Principal',     title: 'Dashboard' },
  '/dashboard/ficha':                  { eyebrow: 'Principal',     title: 'Ficha do Equipamento' },
  '/dashboard/equipamentos':           { eyebrow: 'Equipamentos',  title: 'Padrões de Trabalho' },
  '/dashboard/auxiliares':             { eyebrow: 'Equipamentos',  title: 'Aparelhos Auxiliares' },
  '/dashboard/checagens/controle':     { eyebrow: 'Checagens',     title: 'Controle de Checagens' },
  '/dashboard/checagens/realizar':     { eyebrow: 'Checagens',     title: 'Realizar Checagem' },
  '/dashboard/calibracao':             { eyebrow: 'Documentação',  title: 'Planos de Calibração' },
  '/dashboard/certificados':           { eyebrow: 'Documentação',  title: 'Certificados' },
  '/dashboard/manuais':                { eyebrow: 'Documentação',  title: 'Manuais' },
  '/dashboard/softwares':              { eyebrow: 'Documentação',  title: 'Softwares / Firmwares' },
  '/dashboard/instrucoes':             { eyebrow: 'Documentação',  title: 'Instruções de Trabalho' },
  '/dashboard/procedimentos':          { eyebrow: 'Documentação',  title: 'Proc. de Checagens' },
  '/dashboard/normas':                 { eyebrow: 'Documentação',  title: 'Docs Normativos' },
  '/dashboard/incerteza':              { eyebrow: 'Análise',       title: 'Incerteza de Medição' },
  '/dashboard/ambiente':               { eyebrow: 'Análise',       title: 'Condições Ambientais' },
  '/dashboard/relatorio':              { eyebrow: 'Projeto',       title: 'Relatório de Status' },
  '/dashboard/changelog':              { eyebrow: 'Projeto',       title: 'Changelog' },
}

function getLabel(pathname: string) {
  if (LABELS[pathname]) return LABELS[pathname]
  // match dynamic routes like /dashboard/equipamentos/[id]
  const base = Object.keys(LABELS).find(k => pathname.startsWith(k + '/'))
  return base ? LABELS[base] : { eyebrow: 'LABIADIO', title: '' }
}

function Clock() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="font-mono text-[12px] text-white/60 tabular-nums leading-none">{time}</p>
        <p className="font-mono text-[9px] text-white/25 uppercase tracking-wider leading-none mt-0.5">{date}</p>
      </div>
      {/* Live indicator */}
      <div className="relative">
        <div className="w-1.5 h-1.5 rounded-full bg-success" />
        <div className="absolute inset-0 rounded-full bg-success animate-ping opacity-40" />
      </div>
    </div>
  )
}

export default function TopBar() {
  const pathname = usePathname()
  const { eyebrow, title } = getLabel(pathname)

  return (
    <header className="flex-shrink-0 flex items-center justify-between px-6 border-b border-white/5"
            style={{ height: 52, background: 'rgba(7,10,16,0.8)', backdropFilter: 'blur(8px)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] tracking-[2.5px] text-white/20 uppercase">{eyebrow}</span>
        {title && (
          <>
            <span className="text-white/10 text-xs">/</span>
            <span className="font-mono text-[10px] text-white/50 tracking-wide">{title}</span>
          </>
        )}
      </div>

      {/* Right: clock + ISO tag */}
      <div className="flex items-center gap-5">
        <span className="hidden sm:flex items-center gap-1.5 font-mono text-[9px] text-white/20 tracking-wider">
          <span className="w-1 h-1 rounded-full bg-gold/50" />
          ISO/IEC 17025:2017
        </span>
        <Clock />
      </div>
    </header>
  )
}
