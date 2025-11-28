"use client";

import React from "react";
import ThemeToggle from "@/components/shared/theme-toggle";
import { UserButton } from "@clerk/nextjs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

const RootHeader = () => {
  return (
    <div className="flex items-center justify-between border-b px-4 py-1">
      {/* Left side placeholder (can hold page title later) */}

      <SidebarTrigger className="cursor-pointer" />

      {/* Right side: bulb (theme toggle) and user avatar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/security">
            <ShieldCheck />
          </Link>
        </Button>
        <ThemeToggle />
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: "w-6 h-6",
              userButtonTrigger: "p-0",
            },
          }}
        />
      </div>
    </div>
  );
};

export default RootHeader;
