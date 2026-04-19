import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── LABIADIO Design Tokens ──────────────────
        navy:    { DEFAULT: '#0B0E14', 2: '#141B28', 3: '#1A2338' },
        gold:    { DEFAULT: '#E8B94B', 2: '#F5D27A', light: 'rgba(232,185,75,0.12)' },
        teal:    { DEFAULT: '#22D3C8', light: 'rgba(34,211,200,0.1)' },
        accent:  { DEFAULT: '#3B82F6', light: 'rgba(59,130,246,0.12)' },
        success: { DEFAULT: '#10B981', light: 'rgba(16,185,129,0.12)' },
        warning: { DEFAULT: '#F59E0B', light: 'rgba(245,158,11,0.12)' },
        danger:  { DEFAULT: '#EF4444', light: 'rgba(239,68,68,0.12)' },
      },
      fontFamily: {
        display: ['var(--font-syne)', 'sans-serif'],
        body:    ['var(--font-figtree)', 'sans-serif'],
        mono:    ['var(--font-dm-mono)', 'monospace'],
      },
      borderRadius: {
        card: '14px',
        btn:  '8px',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.4)',
        modal: '0 24px 64px rgba(0,0,0,0.7)',
        glow:  '0 0 0 1px #E8B94B, 0 4px 20px rgba(232,185,75,0.2)',
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease',
        'pulse-sm': 'pulse 2s infinite',
        'spin-slow': 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
