import './globals.css'
import { ReactNode } from 'react'
import { GeistMono } from 'geist/font/mono'

export const metadata = {
  title: 'raft-in-motion',
  description: 'A Raft logs demo',
  icons: {
    icon: '/favicon.ico',
  }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={GeistMono.variable}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  )
}