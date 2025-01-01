import './globals.css'
import { ReactNode } from 'react'
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';


export const metadata = {
  title: 'Raft Logs Visualization',
  description: 'A minimal single-page Raft logs demo',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        {/* Layout wrapper content, e.g. nav bar or shared providers, if any */}
        {children}
      </body>
    </html>
  )
}
