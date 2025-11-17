"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ThinkingBlockProps {
  content: string;
  className?: string;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({
  content,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn("my-4 w-full", className)}>
      {/* Thinking Header */}
      <div
        onClick={toggleExpanded}
        className="h-auto w-full cursor-pointer justify-start transition-all duration-200"
      >
        <div className="text-muted-foreground flex max-w-full items-center gap-2">
          <Brain className="h-4 w-4" />
          <span className="text-sm font-medium">Reasoned</span>
          {isExpanded ? (
            <ChevronDown className="ml-auto h-4 w-4" />
          ) : (
            <ChevronRight className="ml-auto h-4 w-4" />
          )}
        </div>
      </div>

      {/* Thinking Content */}
      {isExpanded && (
        <div className="mt-2 w-full">
          <div className="text-muted-foreground w-full text-sm leading-relaxed">
            <Markdown
              components={{
                code(props) {
                  const { children, className, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  return match ? (
                    <SyntaxHighlighter
                      PreTag="div"
                      language={match[1]}
                      style={vscDarkPlus}
                      customStyle={{
                        maxWidth: "100%",
                        fontSize: 12,
                      }}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code
                      {...rest}
                      className={cn(
                        "bg-muted rounded px-1.5 py-0.5 font-mono text-xs",
                        className,
                      )}
                    >
                      {children}
                    </code>
                  );
                },
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-2 list-inside list-disc space-y-1">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-2 list-inside list-decimal space-y-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="text-sm">{children}</li>,
                h1: ({ children }) => (
                  <h1 className="mt-4 mb-2 text-base font-semibold first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mt-3 mb-2 text-sm font-semibold first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-2 mb-1 text-sm font-medium first:mt-0">
                    {children}
                  </h3>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-muted-foreground/30 mb-2 border-l-2 pl-3 italic">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {content}
            </Markdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThinkingBlock;
