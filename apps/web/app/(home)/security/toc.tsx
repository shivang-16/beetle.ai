"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SecurityTOC() {
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: "#hosting", label: "Infrastructure and Deployment" },
    { href: "#ml-data", label: "AI Models and Data Privacy" },
    {
      href: "#confidentiality",
      label: "Data Protection and Security Measures",
    },
    { href: "#monitoring", label: "Continuous Monitoring and Compliance" },
  ];

  return (
    <>
      {/* Mobile View */}
      <div className="p-6 pb-0 md:p-14 md:pb-0 lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-primary flex w-full items-center gap-2 border border-[#333333] bg-[#0a0a0a] p-4 font-mono text-sm tracking-wider uppercase transition-colors hover:bg-[#333333]/50"
        >
          {isOpen ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
          Table of Contents
        </button>
        {isOpen && (
          <nav className="border-x border-b border-[#333333] bg-[#0a0a0a] p-4">
            <ul className="space-y-4">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="block text-sm text-zinc-400 transition-colors hover:text-white"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-[#333333] pt-4">
              <p className="text-xs text-zinc-500">
                Last updated: November 2025
              </p>
            </div>
          </nav>
        )}
      </div>

      {/* Desktop View */}
      <aside className="sticky top-20 hidden h-fit self-start border-b border-[#333333] p-6 md:p-14 lg:block lg:w-1/4 lg:border-r lg:border-b-0">
        <h3 className="text-primary mb-6 font-mono text-sm tracking-wider uppercase">
          Table of Contents
        </h3>
        <nav className="space-y-4">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block text-sm text-zinc-400 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="mt-12 border-t border-[#333333] pt-8">
          <p className="mb-4 text-xs text-zinc-500">
            Last updated: November 2025
          </p>
        </div>
      </aside>
    </>
  );
}
