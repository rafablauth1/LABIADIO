'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function loginGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
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
            {/* Ícone metrológico */}
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
          <h2 className="font-display font-bold text-xl text-white mb-2">
            Acesse o sistema
          </h2>
          <p className="text-white/40 text-sm mb-8">
            Use sua conta Google para entrar no LABIADIO.
          </p>

          <button
            onClick={loginGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3
                       bg-white text-gray-800 rounded-btn font-semibold text-sm
                       hover:bg-gray-50 active:scale-95 transition-all
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {/* Google icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Entrando...' : 'Entrar com Google'}
          </button>

          <div className="mt-8 pt-6 border-t border-white/7 text-center">
            <p className="text-white/25 text-[10px] font-mono tracking-wider uppercase">
              Acesso restrito · Laboratório EMC · LABELO PUCRS
            </p>
          </div>
        </div>

        {/* Nota futura SharePoint */}
        <p className="text-center text-white/20 text-[10px] mt-6 font-mono">
          Integração Microsoft SharePoint disponível em breve
        </p>
      </div>
    </div>
  )
}
