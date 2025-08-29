"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LucideProps } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

const AppMenuItem = ({
  item,
}: {
  item: {
    title: string;
    url: string;
    icon: React.ForwardRefExoticComponent<
      Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
    >;
  };
}) => {
  const pathname = usePathname();

  return (
    <Tooltip key={item.title}>
      <TooltipTrigger asChild>
        <Link
          href={item.url}
          className={cn(
            pathname === item.url
              ? "bg-primary/40 border-l-2 border-primary"
              : ""
          )}>
          <Button
            variant={"ghost"}
            className="flex items-center justify-center cursor-pointer h-10">
            <item.icon />
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{item.title}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default AppMenuItem;
