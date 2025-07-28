import type { Metadata } from 'next'
import {
  ClerkProvider,
  SignedIn,
  UserButton,
} from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { Brain, Home } from 'lucide-react'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'CodeDetector - AI-Powered Code Analysis',
  description: 'Intelligent code analysis with real-time streaming results',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}>
          <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-8">
                  <Link href="/" className="flex items-center space-x-2">
                    <Brain className="w-8 h-8 text-blue-600" />
                    <span className="text-xl font-bold text-gray-900">CodeDetector</span>
                  </Link>
                  
                  <nav className="flex items-center space-x-6">
                    <Link 
                      href="/" 
                      className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Home className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                    <Link 
                      href="/analysis" 
                      className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Brain className="w-4 h-4" />
                      <span>AI Analysis</span>
                    </Link>
                  </nav>
                </div>
                
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </div>
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}