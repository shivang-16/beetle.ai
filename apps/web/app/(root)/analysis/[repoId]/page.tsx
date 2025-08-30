import React from "react";

const Page = async ({ params }: { params: Promise<{ repoId: string }> }) => {
  const { repoId } = await params;
  console.log({ repoId });

  return <div>Page</div>;
};

export default Page;
