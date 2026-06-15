import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/sidebar'
import { JarvisVoiceInterface } from '@/components/jarvis/voice-interface'
import { CommandPalette } from '@/components/command-palette'
import { AgendaNotifications } from '@/components/agenda-notifications'
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts'
import { QuickCapture } from '@/components/quick-capture'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mission Control',
  description: 'AI agent monitoring dashboard',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mission Control',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#07070f',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className="h-full">
      <body className={`${geist.className} h-full flex`} style={{ background: '#07070f' }}>
        <Sidebar />
        <main className="flex-1 overflow-auto" id="main-content">
          {children}
        </main>
        <AgendaNotifications />
        <JarvisVoiceInterface />
        <CommandPalette />
        <KeyboardShortcuts />
        <QuickCapture />
      </body>
    </html>
  )
}
