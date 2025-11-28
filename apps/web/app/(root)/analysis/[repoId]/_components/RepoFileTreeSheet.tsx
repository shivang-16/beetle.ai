"use client";

import { RepoTree } from "@/types/types";
import React, { Dispatch, SetStateAction, useState } from "react";
import RepoFileTree from "./RepoFileTree";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { IconFiles } from "@tabler/icons-react";

const RepoFileTreeSheet = ({
  repoTree,
  onFileSelect,
  selectedFile,
}: {
  repoTree: RepoTree;
  onFileSelect: Dispatch<SetStateAction<string | null>>;
  selectedFile: string | null;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant={"ghost"} size={"icon"}>
          <IconFiles />
          <span className="sr-only">Repo File Tree</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="max-w-max">
        <SheetHeader className="sr-only">
          <SheetTitle>Repo File Tree</SheetTitle>
          <SheetDescription>
            View and select repo file for this repository.
          </SheetDescription>
        </SheetHeader>

        <div className="max-h-[calc(100vh-1rem)] overflow-y-auto">
          <RepoFileTree
            repoTree={repoTree}
            onFileSelect={onFileSelect}
            selectedFile={selectedFile}
            setIsOpen={setIsOpen}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RepoFileTreeSheet;
