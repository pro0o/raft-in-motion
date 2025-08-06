import './globals.css'
import { ReactNode } from 'react'
import { GeistMono } from 'geist/font/mono'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL("https://raft-in-motion.vercel.app"),
  title: {
    default: "Wings in Motion",
    template: "%s | raft-in-motion",
  },
  description: "Simulate core feats of raft.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "raft-in-motion",
    description: "A Raft consensus viz.",
    url: "https://raft-in-motion.vercel.app",
    siteName: "raft-in-motion",
    locale: "en_US",
    type: "website",
    images: ["https://raft-in-motion.vercel.app/og/home"], 
  },
  robots: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
  twitter: {
    title: "raft-in-motion",
    card: "summary_large_image",
    creator: "@probin",
  },
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
