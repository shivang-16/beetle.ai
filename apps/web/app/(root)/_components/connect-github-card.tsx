import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconBrandGithub } from "@tabler/icons-react";
import React from "react";

const ConnectGithubCard = () => {
  return (
    <Card className="relative mx-auto mb-8 w-full overflow-hidden p-5">
      {/* Decorative right-side background image */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 h-40 w-[100%] bg-[url('/@beetle.png')] bg-contain bg-right bg-no-repeat opacity-70 dark:opacity-60"
      />
      <div>
        <h2 className="text-xl font-bold">Connect GitHub to get started</h2>
        <span className="text-muted-foreground text-sm">
          {" "}
          Install the Beetle GitHub App to sync your repositories, <br />{" "}
          analyze code, and track activity.
        </span>
      </div>

      <CardContent className="p-0">
        <Button className="cursor-pointer">
          <a
            href="https://github.com/apps/beetle-ai/installations/select_target"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <IconBrandGithub className="h-4 w-4" />
            Connect GitHub
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};

export default ConnectGithubCard;
