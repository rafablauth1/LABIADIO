'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'

export default function RealizarChecagemPage() {
  const [tag, setTag] = useState('')

  return (
    <div>
      <div className="mb-6">
        <p className="font-mono text-[9px] tracking-[2.5px] text-gold uppercase mb-1">Checagens</p>
        <h1 className="font-display font-bold text-2xl text-white">Realizar Checagem</h1>
        <p className="text-white/40 text-sm mt-1">Planilha por Equipamento · Cálculo Automático</p>
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-4 items-start">
        {/* Painel de seleção */}
        <div className="card p-4 flex flex-col gap-3">
          <p className="font-display font-bold text-xs text-white/60 uppercase tracking-widest mb-1">Seleção</p>

          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">
              TAG do Equipamento
            </label>
            <select
              value={tag}
              onChange={e => setTag(e.target.value)}
              className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                         focus:outline-none focus:border-gold/50"
            >
              <option value="">Selecione...</option>
            </select>
          </div>

          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Data</label>
            <input
              type="date"
              className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                         focus:outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Técnico</label>
            <input
              placeholder="Nome"
              className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                         placeholder:text-white/20 focus:outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Temperatura (°C)</label>
            <input
              type="number"
              step="0.1"
              placeholder="23.0"
              className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                         placeholder:text-white/20 focus:outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">Umidade (%RH)</label>
            <input
              type="number"
              step="0.1"
              placeholder="50.0"
              className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                         placeholder:text-white/20 focus:outline-none focus:border-gold/50"
            />
          </div>

          <button className="btn-primary text-xs w-full mt-1">
            <Save size={13} /> Salvar Checagem
          </button>
        </div>

        {/* Painel principal */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="px-4 py-3 border-b border-white/7 flex items-center justify-between">
              <h2 className="font-display font-bold text-sm text-white">Planilha de Checagem</h2>
              <span className="badge bg-white/5 text-white/40 border-white/10 text-[9px]">aguardando</span>
            </div>
            <div className="px-4 py-12 text-center text-white/25 text-sm italic">
              Selecione um equipamento
            </div>
          </div>

          <div className="card">
            <div className="px-4 py-3 border-b border-white/7 flex items-center justify-between">
              <h2 className="font-display font-bold text-sm text-white">Histórico de Checagens</h2>
              <span className="text-[10px] text-white/30 font-mono">Clique ✏ para editar todos os campos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/7 bg-navy">
                    {['DATA', 'TÉCNICO', 'RESULTADO', 'TEMP', 'UMID', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] tracking-[1.8px] text-white/35 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-white/25 italic text-sm">
                      Nenhum histórico registrado
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
