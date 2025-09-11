"use client";

import Link from "next/link";
import { Github } from "lucide-react";
import { SignInButton, SignUpButton, SignedOut } from "@clerk/nextjs";
import CodetectorLogo from "@/components/shared/codetector-logo";
import ThemeToggle from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="fixed mt-3 font-scandia top-0 left-0 right-0 z-50 w-full rounded-full">
      <div className="max-w-[1563px] w-full mx-auto px-6 ">
        <div className="flex items-center justify-between bg-background/20 backdrop-blur-lg p-4 rounded-full">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <CodetectorLogo />
            Codetector
          </Link>

          {/* Right section (icons + auth buttons) */}
          <div className="flex items-center gap-4">
            <ThemeToggle />

            {/* Clerk Authentication */}
            <SignedOut>
              <SignInButton>
                <Button
                  variant={"ghost"}
                  className="cursor-pointer text-primary hover:text-primary">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton>
                <Button
                  variant={"outline"}
                  className="rounded-full cursor-pointer border-primary text-primary hover:text-primary bg-transparent">
                  Sign Up
                </Button>
              </SignUpButton>
            </SignedOut>
          </div>
        </div>
      </div>
    </header>
  );
}
