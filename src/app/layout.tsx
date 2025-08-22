import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { ToastProvider } from '@/components/Modal/ToastContainer'
import { DarkModeProvider } from '@/contexts/DarkModeContext'

export const metadata: Metadata = {
  title: 'Aicon Canvas',
  description: 'AI-powered content analysis platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <DarkModeProvider>
          <ToastProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ToastProvider>
        </DarkModeProvider>
      </body>
    </html>
  )
}