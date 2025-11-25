"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconBrandGithub } from "@tabler/icons-react";
import { StarsIcon, GitPullRequest, ScanTextIcon, AtSign } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import ConnectGithubCard from "../../_components/connect-github-card";
import UpgradePlanCard from "./UpgradePlanCard";

const HowToCard = ({
  title,
  description,
  icon: Icon,
  imageSrc,
  imageAlt,
  href,
  cta,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  imageSrc?: string;
  imageAlt?: string;
  href?: string;
  cta?: string;
}) => {
  return (
    <Card className="bg-background">
      <CardHeader className="flex flex-row items-center gap-3">
        {Icon ? <Icon className="text-muted-foreground h-5 w-5" /> : null}
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </CardHeader>
      {(imageSrc || (href && cta)) && (
        <CardContent className="pt-0">
          {imageSrc && (
            <div className="mt-2 flex justify-center">
              <Image
                src={imageSrc}
                alt={imageAlt ?? title}
                width={200}
                height={200}
                className=""
              />
            </div>
          )}
          {href && cta && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-2 cursor-pointer"
            >
              <a href={href} target="_blank" rel="noopener noreferrer">
                {cta}
              </a>
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
};

const NoInstallationOnboarding = () => {
  return (
    <div className="h-full">
      <div className="flex gap-4">
        <ConnectGithubCard />
        <UpgradePlanCard />
      </div>
      <div className="mx-auto">
        <Card className="rounded-md p-5">
          <div className="mb-2">
            <h2 className="text-xl font-bold">How to Interact with Beetle</h2>
            <span className="text-muted-foreground text-sm">
              Learn how to use beetle and how beetle works
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
            <HowToCard
              title="Install the GitHub App"
              description="Authorize Beetle for your personal or organization account to access repositories."
              icon={IconBrandGithub}
              href="https://github.com/apps/beetle-ai/installations/select_target"
              cta="Install on GitHub"
            />
            <HowToCard
              title="Add and Sync Repositories"
              description="Add repos from GitHub and sync to fetch branches, issues, and PRs."
              icon={ScanTextIcon}
              href="https://github.com/apps/beetle-ai/installations/select_target"
              cta="Add from GitHub"
            />
            <HowToCard
              title="Run Analyses"
              description="Trigger full repo reviews or PR checks to surface issues and suggestions."
              icon={AtSign}
              imageSrc="/@beetle.png"
            />
            <HowToCard
              title="Review Insights"
              description="Track metrics and recent activity on your dashboard as analyses complete."
              icon={StarsIcon}
              imageSrc="/metrics.png"
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default NoInstallationOnboarding;
