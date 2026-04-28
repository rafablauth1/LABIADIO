import Sidebar from '@/components/layout/Sidebar'
import TopBar  from '@/components/layout/TopBar'
import Chatbot from '@/components/ui/Chatbot'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0B0E14' }}>
      <Sidebar user={null} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto dot-grid">
          <div className="p-6 animate-fade-in max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
      <Chatbot />
    </div>
  )
}
