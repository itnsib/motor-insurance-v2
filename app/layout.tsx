// app/layout.tsx

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Motor Insurance Quote System',
  description: 'Compare and generate motor insurance quotes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
          <nav className="bg-white/90 backdrop-blur-sm shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-8">
                  <Link href="/" className="text-xl font-bold text-indigo-600">
                    NSIB Quote System
                  </Link>
                  <div className="hidden md:flex space-x-4">
                    <Link 
                      href="/" 
                      className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition"
                    >
                      Multi-Quote Comparison
                    </Link>
                    <Link 
                      href="/quote-generator" 
                      className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition"
                    >
                      Single Quote Generator
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </nav>
          <main className="p-4">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}