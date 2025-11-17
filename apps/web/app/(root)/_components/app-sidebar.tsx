"use client";

import { UserButton, OrganizationSwitcher, useAuth } from "@clerk/nextjs";
import {
  ScanTextIcon,
  StarsIcon,
  BotIcon,
  GitPullRequest,
  Settings,
  Bug,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import BeetleLogo from "@/components/shared/beetle-logo";
import { UpgradePlanDialog } from "@/components/shared/UpgradePlanDialog";
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
import { _config } from "@/lib/_config";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { dark } from "@clerk/themes";

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
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

const AppSidebar = () => {
  const { open } = useSidebar();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const { getToken } = useAuth();

  const [loadingPlan, setLoadingPlan] = useState(true);
  const [isFreePlan, setIsFreePlan] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchPlan = async () => {
      try {
        // If API base URL is not configured, default to free plan
        if (!_config.API_BASE_URL) {
          if (!cancelled) {
            setIsFreePlan(true);
            setLoadingPlan(false);
          }
          return;
        }
        const token = await getToken();
        const res = await fetch(
          `${_config.API_BASE_URL}/api/subscription/features`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          },
        );
        const data = await res.json();
        const hasSubscription = Boolean(data?.hasSubscription);
        const planName: string | undefined = data?.subscription?.planName;
        const free = !hasSubscription || planName?.toLowerCase() === "free";
        if (!cancelled) {
          setIsFreePlan(Boolean(free));
          setLoadingPlan(false);
        }
      } catch (e) {
        if (!cancelled) {
          // On error, be conservative and show upgrade option
          setIsFreePlan(true);
          setLoadingPlan(false);
        }
      }
    };
    fetchPlan();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  // Helper function to get current path without team slug
  const getCurrentPathWithoutTeamSlug = (): string => {
    const pathSegments = pathname.split("/").filter(Boolean) as any;
    // If first segment looks like a team slug (not dashboard, analysis, agents, etc.)
    if (
      pathSegments.length > 0 &&
      ![
        "dashboard",
        "analysis",
        "agents",
        "repo",
        "pr-analysis",
        "settings",
      ].includes(pathSegments[0])
    ) {
      const pathWithoutSlug = "/" + pathSegments.slice(1).join("/");
      return pathWithoutSlug || "/dashboard";
    }
    return pathname || "/dashboard";
  };

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
          {/* <div
            className={cn(
              "flex w-full items-center justify-between gap-4",
              open ? "flex-row-reverse" : "flex-col-reverse",
            )}
          >
            <SidebarMenuItem className="flex items-center justify-center">
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
          </div> */}

          <SidebarMenuItem className="flex w-full items-center justify-start">
            {loadingPlan ? (
              <div
                className={cn(
                  "text-muted-foreground w-full text-xs",
                  open ? "px-1 py-2" : "px-0",
                )}
              >
                Checking plan…
              </div>
            ) : (
              <div className="flex flex-col">
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
                <SidebarMenuButton asChild>
                  <OrganizationSwitcher
                    hidePersonal={false}
                    afterSelectOrganizationUrl={(organization) => {
                      const currentPathWithoutSlug =
                        getCurrentPathWithoutTeamSlug();
                      return `/${organization.slug}${currentPathWithoutSlug}`;
                    }}
                    afterSelectPersonalUrl={() => {
                      return getCurrentPathWithoutTeamSlug();
                    }}
                    afterCreateOrganizationUrl={(organization) => {
                      return `/${organization.slug}/dashboard`;
                    }}
                    // For free plan, redirect "Create organization" to upgrade page instead of opening Clerk modal
                    {...(isFreePlan
                      ? {
                          createOrganizationMode: "navigation" as const,
                          createOrganizationUrl: "/upgrade",
                        }
                      : {
                          createOrganizationMode: "modal" as const,
                        })}
                    appearance={{
                      baseTheme: resolvedTheme === "dark" ? dark : undefined,
                      elements: {
                        organizationSwitcherTrigger: cn(
                          "cursor-pointer",
                          open ? "p-1" : "ml-1 w-7 h-7 overflow-hidden",
                        ),
                      },
                    }}
                  />
                </SidebarMenuButton>

                {isFreePlan && (
                  <div className={cn("mt-2 w-full", open ? "px-1" : "px-0")}>
                    <UpgradePlanDialog />
                  </div>
                )}
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
