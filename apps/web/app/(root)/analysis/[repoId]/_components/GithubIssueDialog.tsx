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
import React from "react";
import Markdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const GithubIssueDialog = ({
  description,
  title,
}: {
  title: string;
  description: string;
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size={"sm"} variant={"secondary"}>
          Read More
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-full overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>

        <div className="w-full text-muted-foreground">
          <Markdown
            components={{
              code(props) {
                // eslint-disable-next-line react/prop-types
                const { children, className, ...rest } = props;
                const match = /language-(\w+)/.exec(className || "");
                return match ? (
                  <SyntaxHighlighter
                    PreTag="div"
                    language={match[1]}
                    style={vscDarkPlus}>
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                ) : (
                  <code {...rest} className={className}>
                    {children}
                  </code>
                );
              },
            }}>
            {description}
          </Markdown>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GithubIssueDialog;
