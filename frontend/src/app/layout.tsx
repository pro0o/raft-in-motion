import './globals.css'
import { ReactNode } from 'react'
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import Footer from './footer';

export const metadata = {
  title: 'Raft-in-motion',
  description: 'A minimal single-page Raft logs demo',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        {children}
      </body>
    </html>
  )
}
