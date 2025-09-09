"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { getMyTeams, getUser } from "@/_actions/user-actions";

const TeamSwitcher = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  type TeamItem = { _id: string; name: string; role: string };
  type DbUser = { username?: string; firstName?: string } | undefined;
  const [dbUser, setDbUser] = useState<DbUser>();
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = await getUser();
      setDbUser(user);

      const teams = await getMyTeams();
      setTeams(teams);
    };
    load();
  }, []);

  const scope = (searchParams.get("scope") as "user" | "team") || "team";
  const teamId = searchParams.get("teamId") || undefined;

  const selectedTeam: TeamItem | undefined = useMemo(
    () => teams.find((t) => t._id === teamId),
    [teams, teamId]
  );
  const selectedLabel = scope === "team" && selectedTeam
    ? selectedTeam.name
    : (dbUser?.username || dbUser?.firstName || "Select");

  const sortedTeams = useMemo(() => {
    if (!teamId) return teams;
    const arr = [...teams];
    const idx = arr.findIndex((t) => t._id === teamId);
    if (idx > 0) {
      const sel = arr[idx] as TeamItem;
      arr.splice(idx, 1);
      arr.unshift(sel);
    }
    return arr;
  }, [teams, teamId]);

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
            key="__user__"
            onClick={() => {
              replaceParams({ scope: "user", teamId: undefined });
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 hover:bg-accent text-sm">
            {dbUser?.username || dbUser?.firstName || "My repositories"}
          </button>
          <div className="border-t my-1" />
          {sortedTeams?.map((t) => (
            <button
              key={t._id}
              onClick={() => {
                replaceParams({ scope: "team", teamId: t._id });
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-accent text-sm">
              {t.name}
            </button>
          ))}
        </div>
        )}
      </div>
    </div>
  );
};

export default TeamSwitcher;


