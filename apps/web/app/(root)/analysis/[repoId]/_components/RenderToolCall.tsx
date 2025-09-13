"use client";

// Accordion components removed as they are not used
import { LogItem } from "@/types/types";
import { useEffect, useState } from "react";

type Entry = {
  param: string;
  title: string;
  result: any;
};

export const MergedLogs = ({ log }: { log: LogItem }) => {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    if (!log || !log.messages) return;

    log.messages.forEach((message) => {
      // Extract param inside square brackets
      const paramMatch = message.match(/\[(.*?)\]/);
      if (!paramMatch || !paramMatch[1]) return;
      const param = paramMatch[1];

      // Extract possible JSON object/array at the end
      const jsonMatch = message.match(/(\{.*\}|\[.*\])$/);
      let jsonData: any = null;
      if (jsonMatch && jsonMatch[1]) {
        try {
          jsonData = JSON.parse(jsonMatch[1].replace(/'/g, '"'));
        } catch {
          jsonData = jsonMatch[1];
        }
      }

      setEntries((prev) => {
        const updated = [...prev];

        if (param.endsWith("_RESULT")) {
          const base = param.replace("_RESULT", "");
          const existing = updated.find((e) => e.param === base);

          if (existing) {
            existing.result = jsonData ?? message;
          } else {
            updated.push({
              param: base,
              title: base,
              result: jsonData ?? message,
            });
          }
        } else {
          const title = jsonData?.file_path ?? param;
          updated.push({ param, title, result: null });
        }

        return updated;
      });
    });
  }, [log]);

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <details key={i} className="border rounded">
          <summary className="cursor-pointer px-2 py-1 font-medium">
            {entry.title}
          </summary>
          <pre className="bg-muted p-2 text-sm overflow-x-auto">
            {entry.result
              ? JSON.stringify(entry.result, null, 2)
              : "Waiting for result..."}
          </pre>
        </details>
      ))}
    </div>
  );
};
