// app/layout.tsx

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NSIB Motor Comparison',
  description: 'Compare motor insurance quotes across insurers',
}

// The global nav bar lived here and carried a "Single Quote Generator" link to a
// route that does not exist (404). Navigation now belongs to the in-app sidebar,
// so this layout stays a plain shell.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-nsib-cream text-nsib-ink`}>
        {children}
      </body>
    </html>
  )
}
