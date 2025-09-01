"use client";

import { useSidebar } from "@/components/ui/sidebar";
import React, { useEffect } from "react";

const RepoSkeleton = () => {
  const { setOpen } = useSidebar();

  useEffect(() => {
    setOpen(false);

    return () => {
      setOpen(true);
    };
  }, []);
  return <div>RepoSkeleton</div>;
};

export default RepoSkeleton;
