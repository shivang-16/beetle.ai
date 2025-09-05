"use client";

import { Button } from "@/components/ui/button";
import { _config } from "@/lib/_config";
import React, { useState } from "react";
import { toast } from "sonner";

const RenderLogs = ({ repoName }: { repoName: string }) => {
  const [data, setData] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const analyzeRepo = async () => {
    try {
      setData("");
      setIsLoading(true);

      const repoUrl = `https://github.com/${repoName}.git`;

      const res = await fetch(`${_config.API_BASE_URL}/api/analysis/execute`, {
        method: "POST",
        body: JSON.stringify({ repoUrl }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        toast.error(`HTTP error! status: ${res.status}`);
        return;
      }

      // Type guard for res.body
      if (!res.body) {
        toast.error("Response body is null - streaming not supported");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader?.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setData((prev) => prev + chunk);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`${error.message}`);
      } else {
        toast.error(
          `An unexpected error occurred while analyzing the repo ${repoName}.`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="h-full w-full flex flex-col">
      <div className="px-4 py-3 flex justify-end-safe">
        <Button onClick={analyzeRepo} className="cursor-pointer">
          Fetch Logs
        </Button>
      </div>
      <div className="flex-1 px-4 pb-4 max-h-[calc(100%-60px)] max-w-5xl mx-auto">
        <div className="w-full h-full border rounded-xl p-3 overflow-y-auto">
          {isLoading && <div>Loading...</div>}
          <pre>{data}</pre>
        </div>
      </div>
    </div>
  );
};

export default RenderLogs;
