"use client";

import React from "react";
import ConnectCodeProviderCard from "../../_components/connect-code-provider-card";
import UpgradePlanCard from "./UpgradePlanCard";
import HowToInteractCard from "./HowToInteractCard";

const NoInstallationOnboarding = () => {
  return (
    <div className="h-full">
      <div className="flex gap-4">
        <ConnectCodeProviderCard />
        <UpgradePlanCard />
      </div>
      <div className="mx-auto mt-4">
        <HowToInteractCard />
      </div>
    </div>
  );
};

export default NoInstallationOnboarding;
