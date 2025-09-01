import React from "react";
import { toast } from "sonner";
import { getRepository } from "../_actions/getRepository";
import { GithubRepository } from "@/types/types";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { getUser } from "@/_actions/user-actions";

const RepositoryList = async ({ query }: { query: string }) => {
  let data: GithubRepository[] | undefined;

  try {
    const res = await getRepository(query);
    data = Object.values(res?.data || {})[0];
  } catch (error) {
    console.log(error);

    toast.error(
      error instanceof Error ? `${error.message}` : "Something went wrong!"
    );
  }

  const user = await getUser();

  return (
    <ul className="h-full">
      {data && data.length > 0 ? (
        data.map((repo) => (
          <React.Fragment key={repo._id}>
            <li className="py-5">
              <Link href={`/analysis/${encodeURIComponent(repo.fullName)}`}>
                <div className="flex items-center gap-3">
                  <span>{repo.fullName.split(`${user?.username}/`)[1]}</span>
                  <Badge
                    variant={"outline"}
                    className="border-primary text-primary text-sm rounded-full">
                    {repo.private ? "Private" : "Public"}
                  </Badge>
                </div>
              </Link>
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
