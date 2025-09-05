import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";

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
      </ThemeProvider>
    </ClerkProvider>
  );
};

export default Providers;
