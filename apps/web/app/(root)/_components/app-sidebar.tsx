"use client";

import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { ScanTextIcon, StarsIcon, BotIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import CodetectorLogo from "@/components/shared/codetector-logo";
import ThemeToggle from "@/components/shared/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: StarsIcon,
  },
  {
    title: "Analysis",
    url: "/analysis",
    icon: ScanTextIcon,
  },
  {
    title: "Agents",
    url: "/agents",
    icon: BotIcon,
  },
];

const AppSidebar = () => {
  const { open } = useSidebar();

  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  return (
    // <aside className="fixed inset-y-0 z-10 flex flex-col h-svh border-r bg-sidebar w-[3rem]">
    //   <Link href={"/dashboard"} className="p-2">
    //     <Button className="rounded-full bg-foreground size-8 flex items-center justify-center cursor-pointer hover:bg-foreground">
    //       <CodetectorLogo className="size-5" />
    //     </Button>
    //   </Link>

    //   <div className="flex flex-col gap-2 min-h-0 flex-1 mt-2">
    //     {items.map((item) => (
    //       <AppMenuItem key={item.title} item={item} />
    //     ))}
    //   </div>

    //   <div className="p-2 flex flex-col items-center gap-2">
    //     <ThemeToggle />
    //     <UserButton />
    //   </div>
    // </aside>

    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu
          className={cn(
            "p-0 flex-row items-center",
            open ? "justify-between" : "justify-center"
          )}>
          <SidebarMenuItem
            className={cn("p-0", open ? "not-sr-only" : "sr-only")}>
            <SidebarMenuButton asChild>
              <Link href={"/dashboard"} className="flex items-center gap-1">
                <CodetectorLogo />

                <span
                  className={cn(
                    "font-semibold",
                    open ? "not-sr-only" : "sr-only"
                  )}>
                  Codetector
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarTrigger className="cursor-pointer" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-3">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link
                      href={item.url}
                      className={cn(
                        pathname === item.url
                          ? "bg-primary/40 border-l-2 border-primary"
                          : ""
                      )}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu className={cn("items-center justify-between flex-col")}>
          <SidebarMenuItem className="items-center justify-start flex w-full">
            <SidebarMenuButton asChild>
              <OrganizationSwitcher
                hidePersonal
                appearance={{
                  baseTheme: resolvedTheme === "dark" ? dark : undefined,
                  elements: {
                    organizationSwitcherTrigger: cn(
                      "cursor-pointer",
                      open ? "p-1" : "p-0 w-7 h-7 overflow-hidden"
                    ),
                  },
                }}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>

          <div
            className={cn(
              "flex items-center justify-between w-full",
              open ? "flex-row-reverse" : "flex-col-reverse"
            )}>
            <SidebarMenuItem className="items-center justify-center flex">
              <SidebarMenuButton asChild>
                <UserButton
                  appearance={{
                    baseTheme: resolvedTheme === "dark" ? dark : undefined,
                    elements: {
                      userButtonAvatarBox: "w-5 h-5",
                      userButtonTrigger: "p-0",
                    },
                  }}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <ThemeToggle darkIconClassName="text-foreground fill-foreground" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </div>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
