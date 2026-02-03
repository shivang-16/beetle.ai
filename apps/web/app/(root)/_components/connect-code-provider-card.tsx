"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconBrandBitbucket, IconBrandGithub } from "@tabler/icons-react";
import React from "react";
import { useUser } from "@clerk/nextjs";

const ConnectCodeProviderCard = () => {
  const { user } = useUser();
  
  const handleConnectBitbucket = () => {
    if (!user) {
      alert("Please login first");
      return;
    }
    
    // Redirect to backend OAuth endpoint with userId
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    window.location.href = `${apiUrl}/api/bitbucket/oauth/connect?userId=${user.id}`;
  };

  return (
    <Card className="relative mx-auto mb-8 w-full overflow-hidden p-5">
      {/* Decorative right-side background image */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 h-40 w-[100%] bg-[url('/@beetle.png')] bg-contain bg-right bg-no-repeat opacity-70 dark:opacity-60"
      />
      <div>
        <h2 className="text-xl font-bold">Connect your code provider</h2>
        <span className="text-muted-foreground text-sm">
          Connect your GitHub or Bitbucket account to sync repositories, <br />
          analyze code, and track activity.
        </span>
      </div>

      <CardContent className="p-0 flex gap-4">
        <Button className="cursor-pointer bg-primary hover:bg-primary/90" asChild>
          <a
            href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME || "beetle-ai"}/installations/select_target`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <IconBrandGithub className="h-4 w-4" />
            GitHub
          </a>
        </Button>

        <Button 
          className="cursor-pointer bg-primary hover:bg-primary/90"
          onClick={handleConnectBitbucket}
          disabled={!user}
        >
          <div className="flex items-center gap-2">
            <IconBrandBitbucket className="h-4 w-4" />
            Bitbucket
          </div>
        </Button>
      </CardContent>
    </Card>
  );
};

export default ConnectCodeProviderCard;
