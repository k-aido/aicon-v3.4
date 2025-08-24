import type { Metadata } from 'next'
import { Noto_Sans } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { ToastProvider } from '@/components/Modal/ToastContainer'
import { DarkModeProvider } from '@/contexts/DarkModeContext'

const notoSans = Noto_Sans({ 
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})

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
      <body className={notoSans.className}>
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