"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useEffect } from "react";

const RepoSkeleton = () => {
  const { setOpen } = useSidebar();

  useEffect(() => {
    setOpen(false);

    return () => {
      setOpen(true);
    };
  }, []);
  return (
    <div className="flex h-full">
      <div className="max-w-56 w-full">
        <Skeleton className="h-9 w-full" />

        <ul className="space-y-3 mt-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton
              key={i}
              className="max-w-40 ml-5 w-full h-5 rounded-full"
            />
          ))}
        </ul>
      </div>
      <div className="flex-1">
        <div className="w-full flex justify-end-safe gap-3 px-4 py-3">
          <Skeleton className="h-9 rounded-md w-28" />
          <Skeleton className="h-9 rounded-md w-28" />
        </div>
        <Skeleton className="w-full h-full pb-3 px-4 max-h-[calc(100%-60px)] max-w-2xl mx-auto" />
      </div>
    </div>
  );
};

export default RepoSkeleton;
