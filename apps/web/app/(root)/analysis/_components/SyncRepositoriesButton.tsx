"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { syncRepositories } from "../_actions/syncRepositories";

const SyncRepositoriesButton = () => {
  const { refresh } = useRouter();

  const handleSync = async () => {
    await syncRepositories();
    refresh();
  };
  return (
    <Button
      onClick={handleSync}
      variant={"outline"}
      className="cursor-pointer text-xs">
      <RefreshCwIcon />
      <span>Sync Repositories</span>
    </Button>
  );
};

export default SyncRepositoriesButton;
