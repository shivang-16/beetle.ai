'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Github, LogIn, MessageCircleMore, Rocket, Sparkles, Users } from 'lucide-react'
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <header className="fixed mt-8 font-scandia top-0 left-0 right-0 z-50 w-full">
      <div className=" container mx-auto px-6">
        <div className="tt-navbar-strip flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-2xl font-semibold text-black dark:text-white">
            <svg width="30" height="30" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="10" />
            </svg>
            Codetector
          </Link>

          
          <nav className="hidden text-xl items-center gap-6 md:flex">
            <div className="relative">
              <button
                className="flex items-center gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors duration-200"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                Features <ChevronDown className="h-4 w-4" />
              </button>
              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-xl border border-white/20 bg-white/90 backdrop-blur-md p-4 shadow-lg dark:border-neutral-800/50 dark:bg-neutral-900/90">
                  <FeatureItem
                    icon={<Sparkles className="h-5 w-5 text-indigo-500" />}
                    title="Editor"
                    description="A modern editor that works like Notion."
                    href="/product/editor"
                  />
                  <FeatureItem
                    icon={<MessageCircleMore className="h-5 w-5 text-pink-500" />}
                    title="Comments"
                    description="Inline and sidebar commenting support."
                    href="/product/comments"
                  />
                  <FeatureItem
                    icon={<Rocket className="h-5 w-5 text-green-500" />}
                    title="Content AI"
                    description="AI assistance for writing and editing."
                    href="/product/content-ai"
                  />
                  <FeatureItem
                    icon={<Users className="h-5 w-5 text-orange-500" />}
                    title="Collaboration"
                    description="Real-time multi-user collaboration."
                    href="/product/collaboration"
                  />
                </div>
              )}
            </div>

            <Link href="/customers" className="text-sm text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors duration-200">
              Customers
            </Link>
            <Link href="/enterprise" className="text-sm text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors duration-200">
              Enterprise
            </Link>
            <Link href="/pricing" className="text-sm text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors duration-200">
              Pricing
            </Link>
            <Link href="/docs" className="text-sm text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors duration-200">
              Docs
            </Link>
          </nav>

          {/* Right section (icons + auth buttons) */}
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/shivang-16/codetector.ai"
              target="_blank"
              className="text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors duration-200"
            >
              <Github className="h-5 w-5" />
            </Link>
            
            {/* Clerk Authentication */}
            <SignedOut>
              <SignInButton>
                <button className="text-sm text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors duration-200">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="px-2 py-1 rounded-full text-sm text-white border border-[#FF6A75] hover:border-white hover:cursor-pointer transition-all duration-200">
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  )
}

function FeatureItem({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}) {
  return (
    <Link href={href} className="flex items-start gap-3 rounded-lg p-3 hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:backdrop-blur-sm transition-all duration-200">
      <div className="mt-1">{icon}</div>
      <div>
        <div className="text-sm font-semibold text-black dark:text-white">{title}</div>
        <div className="text-xs text-neutral-600 dark:text-neutral-400">{description}</div>
      </div>
    </Link>
  )
}