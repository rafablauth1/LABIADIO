import Sidebar from '@/components/layout/Sidebar'
import TopBar  from '@/components/layout/TopBar'
import Chatbot from '@/components/ui/Chatbot'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-navy">
      <Sidebar user={null} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 dot-grid">
          <div className="p-5 lg:p-6 mx-auto max-w-[1400px] animate-fade-in">
            {children}
          </div>
        </main>
      </div>
      <Chatbot />
    </div>
  )
}
