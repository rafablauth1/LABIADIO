'use client'

import { useEffect, ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  size?: 'md' | 'lg'
  children: ReactNode
  footer?: ReactNode
}

export default function Modal({ open, onClose, title, size = 'md', children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className={`relative bg-[#0e1220] border border-white/10 rounded-xl shadow-2xl
                    flex flex-col max-h-[90vh] w-full animate-fade-in
                    ${size === 'lg' ? 'max-w-3xl' : 'max-w-lg'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/7 flex-shrink-0">
          <h2 className="font-display font-bold text-base text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white transition-colors p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/7 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
