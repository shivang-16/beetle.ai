"use client";

import React from "react";
import ConnectGithubCard from "../../_components/connect-github-card";
import ConnectBitbucketCard from "../../_components/connect-bitbucket-card";
import UpgradePlanCard from "./UpgradePlanCard";
import HowToInteractCard from "./HowToInteractCard";

const NoInstallationOnboarding = () => {
  return (
    <div className="h-full">
      <div className="flex gap-4">
        <ConnectGithubCard />
        <UpgradePlanCard />
      </div>
      <div className="mt-4">
        <ConnectBitbucketCard />
      </div>
      <div className="mx-auto mt-4">
        <HowToInteractCard />
      </div>
    </div>
  );
};

export default NoInstallationOnboarding;
