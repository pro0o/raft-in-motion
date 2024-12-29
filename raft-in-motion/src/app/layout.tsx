import './globals.css'
import { ReactNode } from 'react'

export const metadata = {
  title: 'Raft Logs Visualization',
  description: 'A minimal single-page Raft logs demo',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Layout wrapper content, e.g. nav bar or shared providers, if any */}
        {children}
      </body>
    </html>
  )
}
