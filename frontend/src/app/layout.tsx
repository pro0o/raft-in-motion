import './globals.css'
import { ReactNode } from 'react'
import { GeistMono } from 'geist/font/mono'

export const metadata = {
  title: 'Raft-in-motion',
  description: 'A minimal single-page Raft logs demo',
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
