"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider
      appearance={{
        cssLayerName: "clerk",
      }}>
      <ThemeProvider
        enableSystem
        attribute={"class"}
        defaultTheme="dark"
        disableTransitionOnChange>
        {children}
        <ToastProvider />
      </ThemeProvider>
    </ClerkProvider>
  );
};

export default Providers;

function ToastProvider() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      richColors
      closeButton
      position="top-center"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    />
  );
}
