"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, SignedOut, SignedIn } from "@clerk/nextjs";
import CodetectorLogo from "@/components/shared/codetector-logo";
import ThemeToggle from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

export default function Navbar() {
  return (
    <header className="fixed font-scandia top-0 left-0 right-0 z-50 w-full rounded-full bg-[#010010]/20 backdrop-blur-lg px-5">
      <div className="max-w-[1563px] mx-auto w-full flex items-center justify-between py-4 px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-semibold text-white">
          <CodetectorLogo />
          <span className="sr-only sm:not-sr-only">BEETLE</span>
        </Link>

        {/* Right section (icons + auth buttons) */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* <ThemeToggle className="hover:bg-neutral-700" /> */}

          {/* Clerk Authentication */}
          <SignedOut>
            <SignInButton>
              <Button
                variant={"ghost"}
                className="cursor-pointer border hidden md:inline-flex bg-white text-black hover:text-white/80">
                Launch Agent <ArrowUpRight />
              </Button>
            </SignInButton>
            {/* <SignUpButton>
              <Button
                variant={"outline"}
                className="rounded-full cursor-pointer border-primary text-primary hover:text-primary bg-transparent">
                Sign Up
              </Button>
            </SignUpButton> */}
          </SignedOut>

          <SignedIn>
            <Link href="/dashboard">
              <Button
                variant={"ghost"}
                className="cursor-pointer border bg-white text-black hover:text-white/80">
                Dashboard <ArrowUpRight />
              </Button>
            </Link>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
