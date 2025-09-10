"use client";

import { useState, useEffect } from "react";

type StreamChunk = {
  type: string;
  messages: string[];
};

type MergedItem = {
  id: string; // param like "EXTRACT_IMPORTS"
  title?: string;
  result?: string;
};

function parseMessage(message: string): { param: string; data: string } | null {
  const match = message.match(/\[(.*?)\]\s+(.*)/);
  if (!match) return null;

  return { param: match[1] ?? "", data: match[2] ?? "" };
}

export function useStreamMerger(chunk?: StreamChunk) {
  const [merged, setMerged] = useState<Record<string, MergedItem>>({});

  useEffect(() => {
    if (!chunk) return;

    setMerged((prev) => {
      const acc = { ...prev };

      chunk.messages.forEach((msg) => {
        const parsed = parseMessage(msg);
        if (!parsed) return; // safe guard

        const { param, data } = parsed;

        if (!param.endsWith("_RESULT")) {
          const fileMatch = data.match(/'file_path':\s*'([^']+)'/);
          const filePath = fileMatch ? fileMatch[1] : param;

          acc[param] = {
            ...(acc[param] || { id: param }),
            title: filePath,
          };
        } else {
          const baseParam = param.replace("_RESULT", "");
          acc[baseParam] = {
            ...(acc[baseParam] || { id: baseParam }),
            result: data,
          };
        }
      });

      return acc;
    });
  }, [chunk]);

  return Object.values(merged);
}
