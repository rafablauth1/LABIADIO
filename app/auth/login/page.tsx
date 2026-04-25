'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function loginMicrosoft() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'openid email profile',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error('OAuth error:', error.message)
      alert(`Erro ao autenticar: ${error.message}`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-yellow-600
                            flex items-center justify-center text-navy font-bold font-mono text-xs
                            shadow-[0_2px_16px_rgba(232,185,75,0.4)]">
              <svg viewBox="0 0 36 36" className="w-8 h-8">
                <rect x="4" y="15" width="28" height="3" rx="1.5" fill="rgba(11,14,20,0.4)"/>
                <rect x="13" y="10" width="10" height="13" rx="2" fill="rgba(11,14,20,0.9)"/>
                <line x1="6"  y1="13" x2="6"  y2="18" stroke="rgba(11,14,20,0.5)" strokeWidth="1"/>
                <line x1="12" y1="13" x2="12" y2="18" stroke="rgba(11,14,20,0.5)" strokeWidth="1"/>
                <line x1="24" y1="13" x2="24" y2="18" stroke="rgba(11,14,20,0.5)" strokeWidth="1"/>
                <line x1="30" y1="13" x2="30" y2="18" stroke="rgba(11,14,20,0.5)" strokeWidth="1"/>
                <line x1="18" y1="8"  x2="18" y2="25" stroke="rgba(11,14,20,0.7)" strokeWidth="1.5"/>
                <circle cx="18" cy="16.5" r="2.5" fill="rgba(11,14,20,0.9)"/>
                <polygon points="18,6 15.5,10 20.5,10" fill="rgba(11,14,20,0.85)"/>
              </svg>
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl tracking-wider">
                LABI<span className="text-gold">ADIO</span>
              </h1>
            </div>
          </div>
          <p className="text-white/40 text-xs font-mono tracking-[2px] uppercase">
            Gestão da Qualidade · ISO/IEC 17025:2017
          </p>
        </div>

        {/* Card de login */}
        <div className="card p-8">
          <h2 className="font-display font-bold text-xl text-white mb-2">Acesse o sistema</h2>
          <p className="text-white/40 text-sm mb-8">
            Use sua conta institucional da PUCRS para entrar.
          </p>

          {/* Microsoft button */}
          <button
            onClick={loginMicrosoft}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3
                       bg-[#2F2F2F] text-white rounded-btn font-semibold text-sm
                       hover:bg-[#404040] active:scale-95 transition-all
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {/* Microsoft logo */}
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 21 21">
              <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
              <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            {loading ? 'Redirecionando...' : 'Entrar com Microsoft 365'}
          </button>

          <div className="mt-8 pt-6 border-t border-white/7 text-center">
            <p className="text-white/25 text-[10px] font-mono tracking-wider uppercase">
              Acesso restrito · Laboratório EMC · LABELO PUCRS
            </p>
          </div>
        </div>

        <p className="text-center text-white/20 text-[10px] mt-6 font-mono">
          Autenticação via Microsoft Entra ID · Office 365
        </p>
      </div>
    </div>
  )
}
