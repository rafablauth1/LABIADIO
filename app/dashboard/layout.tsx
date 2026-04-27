import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Buscar perfil do usuário
  const { data: profile } = await supabase
    .from('lab_users')
    .select('*, laboratorios(nome)')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen overflow-hidden bg-navy">
      <Sidebar user={profile} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
