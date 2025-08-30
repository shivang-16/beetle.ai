import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

const RepositoryListSkeleton = () => {
  return (
    <ul>
      {Array.from({ length: 12 }).map((_, i) => (
        <React.Fragment key={i}>
          <li className="py-5">
            <div className="flex items-center gap-3">
              <Skeleton className="max-w-xs w-full h-5 rounded-full" />
              <Skeleton className="max-w-[100px] w-full h-5 rounded-full" />
            </div>
          </li>
          <Separator />
        </React.Fragment>
      ))}
    </ul>
  );
};

export default RepositoryListSkeleton;
