'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'

export default function FichaPage() {
  const [tag, setTag] = useState('')
  const [loaded, setLoaded] = useState(false)

  return (
    <div>
      <div className="mb-6">
        <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Principal</p>
        <h1 className="font-display font-bold text-2xl text-white">Ficha do Equipamento</h1>
        <p className="text-white/40 text-sm mt-1">Consulta Integrada por TAG</p>
      </div>

      <div className="flex gap-3 mb-6 items-end">
        <div className="flex-1 max-w-xs">
          <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">
            TAG do Equipamento
          </label>
          <input
            value={tag}
            onChange={e => setTag(e.target.value)}
            placeholder="Ex: EMC-001"
            className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                       placeholder:text-white/20 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
          />
        </div>
        <button
          onClick={() => setLoaded(true)}
          className="btn-primary text-xs"
        >
          <Search size={13} /> Carregar
        </button>
      </div>

      {!loaded ? (
        <div className="card py-16 flex flex-col items-center gap-3 text-white/25">
          <Search size={32} className="opacity-40" />
          <p className="text-sm">Digite uma TAG para ver a ficha completa</p>
        </div>
      ) : (
        <div className="card py-16 flex flex-col items-center gap-3 text-white/25">
          <p className="text-sm italic">Nenhum equipamento encontrado com a TAG "{tag}"</p>
        </div>
      )}
    </div>
  )
}
