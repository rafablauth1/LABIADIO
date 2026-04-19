import type { Metadata } from 'next'
import { Syne, Figtree, DM_Mono } from 'next/font/google'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '600', '700', '800'],
})

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  weight: ['300', '400', '500', '600'],
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'LABIADIO — Gestão da Qualidade',
  description: 'Software de Gestão da Qualidade para Laboratórios Acreditados · ISO/IEC 17025:2017',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${syne.variable} ${figtree.variable} ${dmMono.variable}`}>
      <body className="bg-navy text-white antialiased font-body">
        {children}
      </body>
    </html>
  )
}
