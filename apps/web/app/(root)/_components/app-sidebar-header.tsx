import CodetectorLogo from "@/components/shared/codetector-logo";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import React from "react";

const AppSidebarHeader = () => {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem className="p-0">
          <SidebarMenuButton
            asChild
            className="p-0 group-data-[collapsible=icon]:!p-0">
            <Link href={"/dashboard"}>
              <span className="rounded-full bg-foreground size-8 flex items-center justify-center">
                <CodetectorLogo className="size-5" />
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
};

export default AppSidebarHeader;
