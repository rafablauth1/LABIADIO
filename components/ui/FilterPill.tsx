'use client'

import { useState } from 'react'

interface FilterPillProps {
  active: boolean
  color?: string           // cor do texto e borda quando ativo
  bg?: string              // fundo quando ativo
  border?: string          // borda quando ativo
  onClick: () => void
  children: React.ReactNode
  className?: string
}

export function FilterPill({
  active,
  color  = '#E8B94B',
  bg     = 'rgba(232,185,75,0.10)',
  border = 'rgba(232,185,75,0.22)',
  onClick,
  children,
  className = '',
}: FilterPillProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-[11px] font-medium whitespace-nowrap transition-all duration-150 select-none focus:outline-none ${className}`}
      style={{
        color:      active ? color  : hovered ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.35)',
        background: active ? bg     : hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
        border:     `1px solid ${active ? border : hovered ? 'rgba(255,255,255,0.12)' : 'transparent'}`,
      }}
    >
      {children}
    </button>
  )
}
