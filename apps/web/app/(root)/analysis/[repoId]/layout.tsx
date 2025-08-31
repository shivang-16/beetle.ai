import React from "react";
import RepoFileTree from "./_components/RepoFileTree";

const RepositoryLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <div className="flex h-svh">
      <RepoFileTree />
      <div className="flex-1">{children}</div>
    </div>
  );
};

export default RepositoryLayout;
