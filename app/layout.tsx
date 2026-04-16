import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/sidebar'
import { JarvisVoiceInterface } from '@/components/jarvis/voice-interface'
import { CommandPalette } from '@/components/command-palette'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mission Control',
  description: 'AI agent monitoring dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className="h-full">
      <body className={`${geist.className} h-full flex`} style={{ background: '#07070f' }}>
        <Sidebar />
        <main className="flex-1 overflow-auto" style={{ paddingTop: 0 }} id="main-content">
          {children}
        </main>
        <JarvisVoiceInterface />
        <CommandPalette />
      </body>
    </html>
  )
}
