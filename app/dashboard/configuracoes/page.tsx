import { Settings } from 'lucide-react'

export default function Page() {
  return (
    <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-navy-3 border border-white/7 flex items-center justify-center mx-auto mb-4">
          <Settings size={24} className="text-white/20" />
        </div>
        <h1 className="font-display font-bold text-xl text-white mb-2">Configurações</h1>
        <p className="text-white/30 text-sm mb-4">Perfil do laboratório, usuários e integrações</p>
        <span className="badge-warning text-[10px] px-3 py-1">Em desenvolvimento · Sprint 2+</span>
      </div>
    </div>
  )
}
