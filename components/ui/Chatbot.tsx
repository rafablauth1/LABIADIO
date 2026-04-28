'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react'

interface Msg { role: 'user' | 'model'; text: string }

const SUGGESTIONS = [
  'Quais equipamentos estão vencidos?',
  'Status do 1528EMC',
  'Equipamentos que vencem em 30 dias',
  'Qual norma cobre ESD?',
  'Condições ambientais recentes',
  'Listar todas as ITs',
]

export default function Chatbot() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'model', text: 'Olá! Sou o LABI, assistente do laboratório. Tenho acesso aos dados reais do sistema — equipamentos, certificados, normas, ITs e muito mais. Pergunte o que quiser.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, open])

  async function send(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Msg = { role: 'user', text }
    setMsgs(p => [...p, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = msgs.slice(1).map(m => ({ role: m.role, text: m.text }))
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })
      const data = await res.json()
      const reply = data.message || 'Não entendi, pode reformular?'
      setMsgs(p => [...p, { role: 'model', text: reply }])
      if (data.navigate) {
        setTimeout(() => { router.push(data.navigate); setOpen(false) }, 800)
      }
    } catch {
      setMsgs(p => [...p, { role: 'model', text: 'Erro ao conectar com o assistente. Tente novamente.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
        style={{ background: 'linear-gradient(135deg, #C9A94A, #F5D27A)', boxShadow: '0 4px 20px rgba(201,169,74,0.4)' }}
        title="Assistente LABIADIO"
      >
        {open ? <X size={20} className="text-navy" /> : <MessageCircle size={20} className="text-navy" />}
      </button>

      {/* Painel de chat */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '78vh' }}>

          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/7"
            style={{ background: 'linear-gradient(135deg, #0F1520, #1A2235)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #C9A94A, #F5D27A)' }}>
              <Bot size={14} className="text-navy" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-white">Assistente LABIADIO</p>
              <p className="text-[9px] text-white/30 font-mono">ISO/IEC 17025 · Gemini AI</p>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: 200 }}>
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'model' && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg, #C9A94A, #F5D27A)' }}>
                    <Bot size={11} className="text-navy" />
                  </div>
                )}
                <div className={`max-w-[88%] px-3 py-2 rounded-xl text-[11.5px] leading-relaxed ${
                  m.role === 'user'
                    ? 'text-white rounded-tr-sm'
                    : 'text-white/80 rounded-tl-sm'
                }`}
                  style={{
                    background: m.role === 'user'
                      ? 'linear-gradient(135deg, #C9A94A22, #C9A94A44)'
                      : 'rgba(255,255,255,0.05)',
                    border: m.role === 'user'
                      ? '1px solid rgba(201,169,74,0.3)'
                      : '1px solid rgba(255,255,255,0.07)',
                  }}>
                  {m.text.split('\n').map((line, i) => (
                    <span key={i}>{line}{i < m.text.split('\n').length - 1 && <br />}</span>
                  ))}
                </div>
                {m.role === 'user' && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-white/10">
                    <User size={11} className="text-white/60" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #C9A94A, #F5D27A)' }}>
                  <Bot size={11} className="text-navy" />
                </div>
                <div className="px-3 py-2 rounded-xl rounded-tl-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Loader2 size={13} className="animate-spin text-white/40" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Sugestões (só no início) */}
          {msgs.length === 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-[10px] font-mono px-2 py-1 rounded-full border border-white/10 text-white/50 hover:border-gold/40 hover:text-gold/80 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-t border-white/7">
            <input
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-white/25 focus:outline-none focus:border-gold/40 transition-colors"
              placeholder="Digite sua mensagem..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              disabled={loading}
              autoFocus
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
              style={{ background: 'linear-gradient(135deg, #C9A94A, #F5D27A)' }}
            >
              <Send size={13} className="text-navy" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
