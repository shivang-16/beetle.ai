import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ObjectMerger } from "@/lib/utils";
import { LogItem } from "@/types/types";

export const MergedLogs = ({ log }: { log: LogItem }) => {
  const merger = new ObjectMerger();
  const mergedLogs = merger.processObject(log);
  console.log(mergedLogs);

  //   function extractTrigger(msg: string): string {
  //     const filePathMatch = msg.match(/'file_path':\s*'([^']+)'/);
  //     return filePathMatch && filePathMatch[1]
  //       ? filePathMatch[1]
  //       : msg.slice(0, 60) + "...";
  //   }

  //   function extractContent(msg: string): string[] {
  //     const arrMatch = msg.match(/\[(.*?)\]$/);
  //     if (arrMatch && arrMatch[1]) {
  //       return arrMatch[1]
  //         .split(",")
  //         .map((s) => s.replace(/['\s]/g, ""))
  //         .filter(Boolean);
  //     }

  //     const previewMatch = msg.match(/'content_preview':\s*'([\s\S]*?)',/);
  //     if (previewMatch && previewMatch[1]) {
  //       return previewMatch[1].split("\\n");
  //     }

  //     return [msg];
  //   }

  //   const blocks: Block[] = [];
  //   const msgs = log.messages;

  //   for (let i = 0; i < msgs.length; i++) {
  //     const msg = msgs[i];

  //     // Match tool inside square brackets: [EXTRACT_IMPORTS]
  //     const toolMatch = msg.match(/\[(.*?)\]/);
  //     if (!toolMatch) continue;

  //     const toolName = toolMatch[1];
  //     if (toolName.endsWith("_RESULT")) continue; // skip result, wait for pair

  //     const resultMsg = msgs[i + 1];
  //     if (!resultMsg) continue;

  //     const resultMatch = resultMsg.match(/\[(.*?)\]/);
  //     if (!resultMatch) continue;

  //     if (resultMatch[1] === `${toolName}_RESULT`) {
  //       blocks.push({
  //         tool: toolName,
  //         trigger: extractTrigger(msg),
  //         content: extractContent(resultMsg),
  //       });
  //       i++; // skip the result since it's merged
  //     }
  //   }

  //   console.log("✅ Built blocks:", blocks);

  return (
    <Accordion type="single" collapsible>
      {/* {blocks.map((block, idx) => (
        <AccordionItem key={idx} value={`item-${idx}`}>
          <AccordionTrigger>
            {block.trigger} <span className="ml-2 text-xs">({block.tool})</span>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="pl-4 text-sm">
              {block.content.map((line, i) => (
                <li key={i} className="break-words">
                  {line}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))} */}
    </Accordion>
  );
};
