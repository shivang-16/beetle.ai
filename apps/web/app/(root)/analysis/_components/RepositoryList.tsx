import React from "react";
import { getRepository } from "../_actions/getRepository";
import { GithubRepository } from "@/types/types";
import { Separator } from "@/components/ui/separator";
import RepositoryItem from "./RepositoryItem";
import { logger } from "@/lib/logger";

type RepoScope = "user" | "team";

const RepositoryList = async ({
  query,
  scope,
  teamId,
  orgSlug
}: {
  query: string;
  scope: RepoScope;
  teamId?: string;
  orgSlug?: string;
}) => {
  let data: GithubRepository[] | undefined;

  try {
    const res = await getRepository(query, scope, teamId, orgSlug);
    data = (res?.data || []).reverse();
  } catch (error) {
    logger.error("Failed to fetch repositories in RepositoryList", { 
      query, 
      scope, 
      teamId,
      error: error instanceof Error ? error.message : error 
    });
  }

  return (
    <ul className="h-full">
      {data && data.length > 0 ? (
        data.map((repo) => (
          <React.Fragment key={repo._id}>
            <li className="py-5">
              <RepositoryItem repo={repo} teamId={teamId} />
            </li>
            <Separator />
          </React.Fragment>
        ))
      ) : (
        <li className="h-full grid place-items-center text-base font-medium text-foreground">
          No repository added
        </li>
      )}
    </ul>
  );
};

export default RepositoryList;
