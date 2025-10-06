"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { getUserInstallations } from "@/_actions/user-actions";

const GithubOrgSwitcher = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  type InstallationItem = { id: string; login: string; type: string; avatar_url?: string };
  const [installations, setInstallations] = useState<InstallationItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const installationsData = await getUserInstallations();
      setInstallations(installationsData);
    };
    load();
  }, []);

  const orgSlug = searchParams.get("orgSlug") || "all";

  const selectedInstallation: InstallationItem | undefined = useMemo(
    () => installations.find((inst) => inst.login === orgSlug),
    [installations, orgSlug]
  );
  
  const selectedLabel = orgSlug === "all" 
    ? "All" 
    : selectedInstallation?.login || "Select Organization";

  const sortedInstallations = useMemo(() => {
    if (orgSlug === "all") return installations;
    const arr = [...installations];
    const idx = arr.findIndex((inst) => inst.login === orgSlug);
    if (idx > 0) {
      const sel = arr[idx] as InstallationItem;
      arr.splice(idx, 1);
      arr.unshift(sel);
    }
    return arr;
  }, [installations, orgSlug]);

  const replaceParams = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams as any);
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") params.delete(k);
      else params.set(k, v);
    });
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm truncate max-w-[12rem]">{selectedLabel}</div>
      <div className="relative">
        <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setOpen((v) => !v)}>
          <ChevronsUpDown className="size-4" />
        </Button>
        {open && (
        <div className="absolute right-0 mt-2 w-56 max-h-64 overflow-y-auto bg-popover border rounded-md shadow-md z-50">
          <button
            key="__all__"
            onClick={() => {
              replaceParams({ orgSlug: "all" });
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 hover:bg-accent text-sm">
            All
          </button>
          <div className="border-t my-1" />
          {sortedInstallations?.map((installation) => (
            <button
              key={installation.id}
              onClick={() => {
                replaceParams({ orgSlug: installation.login });
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-accent text-sm">
              {installation.login}
            </button>
          ))}
        </div>
        )}
      </div>
    </div>
  );
};

export default GithubOrgSwitcher;


