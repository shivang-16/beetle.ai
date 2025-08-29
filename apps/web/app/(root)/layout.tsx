import { SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";
import AppSidebar from "./_components/app-sidebar";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated) redirect("/");

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 ml-[3rem]">{children}</main>
    </SidebarProvider>
  );
}
