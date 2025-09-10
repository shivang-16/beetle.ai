"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { useStreamMerger } from "@/hooks/useStreamMerger";
import { LogItem } from "@/types/types";

export const MergedLogs = ({ log }: { log: LogItem }) => {
  const mergedItems = useStreamMerger(log);
  console.log(mergedItems);

  return (
    <Accordion type="single" collapsible className="w-full">
      {mergedItems.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger>{item.title || item.id}</AccordionTrigger>
          <AccordionContent>
            <pre className="text-xs whitespace-pre-wrap">
              {item.result || "Waiting for result..."}
            </pre>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};
