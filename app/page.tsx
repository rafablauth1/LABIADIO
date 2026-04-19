import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Se logado → dashboard, senão → login
  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/auth/login')
  }
}
