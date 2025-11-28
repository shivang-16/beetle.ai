import React from "react";
import { getRepoTree } from "./_actions/getRepoTree";
import AnalysisPageContent from "./_components/AnalysisPageContent";

const Page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ repoId: string }>;
  searchParams?: Promise<{ teamId?: string; branch?: string }>;
}) => {
  const { repoId } = await params;
  const searchParamsData = await searchParams;
  const teamId = searchParamsData?.teamId;
  const branch = searchParamsData?.branch;

  // Fetch repo tree at page level
  const repoTree = await getRepoTree(
    decodeURIComponent(repoId),
    teamId,
    branch,
  );

  return (
    <AnalysisPageContent
      repoId={decodeURIComponent(repoId)}
      repoTree={repoTree.data}
      branch={branch}
      teamId={teamId}
    />
  );
};

export default Page;
