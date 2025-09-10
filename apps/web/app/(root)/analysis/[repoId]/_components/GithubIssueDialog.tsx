"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MarkdownRenderer } from "@/components/ui/markdown";
import React from "react";
import Markdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const GithubIssueDialog = ({
  description,
  title,
  trigger,
}: {
  title: string;
  description: string;
  trigger?: React.ReactNode;
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size={"sm"} variant={"secondary"}>
            Read More
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-full overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>

        <div className="w-full text-muted-foreground">
          <MarkdownRenderer content={description} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GithubIssueDialog;
