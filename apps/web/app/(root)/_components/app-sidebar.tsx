"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";


import {
  ScanTextIcon,
  StarsIcon,
  GitPullRequest,
  Settings,
  Bug,
  FileText,
  AtSign,
  Trophy,
  Unplug,
} from "lucide-react";

import BeetleLogo from "@/components/shared/beetle-logo";
import { TeamSwitcher } from "./TeamSwitcher";
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
  useSidebar,
} from "@/components/ui/sidebar";

import { cn } from "@/lib/utils";

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: StarsIcon,
  },
  {
    title: "Repositories",
    url: "/analysis",
    icon: ScanTextIcon,
  },
  {
    title: "Pull Requests",
    url: "/pr-analysis",
    icon: GitPullRequest,
  },
  // {
  //   title: "Agents",
  //   url: "/agents",
  //   icon: BotIcon,
  // },
  {
    title: "Custom Rules",
    url: "/custom-context",
    icon: FileText,
  },
  {
    title: "Leaderboard",
    url: "/leaderboard",
    icon: Trophy,
  },
  {
    title: "Integrations",
    url: "/integrations",
    icon: Unplug,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

const AppSidebar = () => {
  const { open } = useSidebar();
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu
          className={cn(
            "flex-row items-center p-0",
            open ? "justify-between" : "justify-center",
          )}
        >
          <SidebarMenuItem
            className={cn("p-0", open ? "not-sr-only" : "sr-only")}
          >
            <SidebarMenuButton asChild>
              <Link href={"/dashboard"} className="flex items-center gap-1">
                <BeetleLogo />

                <span
                  className={cn(
                    "font-semibold",
                    open ? "not-sr-only" : "sr-only",
                  )}
                >
                  BEETLE
                </span>
              </Link>
            </SidebarMenuButton>
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
                          ? "bg-primary/40 border-primary border-l-2"
                          : "",
                      )}
                    >
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
        <SidebarMenu
          className={cn("flex-col items-center justify-between gap-4")}
        >
          <SidebarMenuItem className="flex w-full items-center justify-start">
            <div className="flex w-full flex-col">
              <SidebarMenuButton asChild>
                <Link
                  href="/interact"
                  className={cn(
                    "mb-3 flex items-center gap-2",
                    open ? "px-2" : "px-0",
                  )}
                >
                  <AtSign className="h-4 w-4" />
                  <span>How to interact</span>
                </Link>
              </SidebarMenuButton>
              <SidebarMenuButton asChild>
                <Link
                  href="/report-issue"
                  className={cn(
                    "mb-3 flex items-center gap-2",
                    open ? "px-2" : "px-0",
                  )}
                >
                  <Bug className="h-4 w-4" />
                  <span>Having an issue?</span>
                </Link>
              </SidebarMenuButton>
            </div>
          </SidebarMenuItem>

          {/* Team Switcher at bottom */}
          <SidebarMenuItem className="w-full">
            <TeamSwitcher collapsed={!open} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
