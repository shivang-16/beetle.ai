"use client";

import { useTheme } from "next-themes";
import React, { useEffect, useState } from "react";
import { Moon, SunIcon } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

const ThemeToggle = ({
  darkIconClassName = "",
  lightIconClassName = "",
  className = "",
}: {
  lightIconClassName?: string;
  darkIconClassName?: string;
  className?: string;
}) => {
  const { setTheme, resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Button
      size={"icon"}
      variant={"ghost"}
      className={cn("cursor-pointer rounded-full", className)}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      {resolvedTheme === "dark" ? (
        <SunIcon className={cn("size-4 text-amber-400", lightIconClassName)} />
      ) : (
        <Moon className={cn("size-4 text-white", darkIconClassName)} />
      )}

      <span className="sr-only">Toggle Theme</span>
    </Button>
  );
};

export default ThemeToggle;
