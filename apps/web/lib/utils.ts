import {
  ITreeNode,
  LLMResponseSegment,
  LogItem,
  LogType,
  ParserState,
  TreeProps,
} from "@/types/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Calculate parentPath array for tree styling
export const calculateParentPath = (
  pathParts: string[],
  allPaths: Set<string>
): boolean[] => {
  const parentPath: boolean[] = [];

  for (let i = 0; i < pathParts.length - 1; i++) {
    const currentPath = pathParts.slice(0, i + 1).join("/");
    const siblingPrefix = pathParts.slice(0, i).join("/");

    // Check if this level has more siblings after the current path
    const hasMoreSiblings = Array.from(allPaths).some((path) => {
      if (path === currentPath) return false;
      const parts = path.split("/");
      if (parts.length !== i + 1) return false;
      return siblingPrefix === "" ? true : path.startsWith(siblingPrefix + "/");
    });

    parentPath.push(hasMoreSiblings);
  }

  return parentPath;
};

export const buildTreeStructure = (data: TreeProps[]): ITreeNode[] => {
  const nodeMap = new Map<string, ITreeNode>();
  const roots: ITreeNode[] = [];
  const allPaths = new Set(data.map((item) => item.path));

  // Sort data by path to ensure parent directories come before children
  const sortedData = data.sort((a, b) => a.path.localeCompare(b.path));

  // First pass: create all nodes
  sortedData.forEach((item) => {
    const pathParts = item.path.split("/");
    const name = pathParts[pathParts.length - 1] || "";
    const parentPath = calculateParentPath(pathParts, allPaths);

    const node: ITreeNode = {
      id: item.sha || item.path,
      name,
      path: item.path,
      type: item.type,
      level: pathParts.length - 1,
      parentPath: parentPath.length > 0 ? parentPath : undefined,
      children: item.type === "tree" ? [] : undefined,
      sha: item.sha,
      size: item.size,
    };

    nodeMap.set(item.path, node);
  });

  // Second pass: build parent-child relationships
  sortedData.forEach((item) => {
    const pathParts = item.path.split("/");
    const currentNode = nodeMap.get(item.path);

    if (!currentNode) return;

    if (pathParts.length === 1) {
      // Root level item
      roots.push(currentNode);
    } else {
      // Find parent
      const parentPath = pathParts.slice(0, -1).join("/");
      const parentNode = nodeMap.get(parentPath);

      if (parentNode && parentNode.children) {
        parentNode.children.push(currentNode);
      }
    }
  });

  // Mark last children and sort folders before files
  const markLastChildrenAndSort = (nodes: ITreeNode[]) => {
    // Sort each level: folders first, then files
    nodes.sort((a, b) => {
      // First sort by type: folders ('tree') before files ('blob')
      if (a.type !== b.type) {
        return a.type === "tree" ? -1 : 1;
      }
      // Then sort alphabetically within the same type
      return a.name.localeCompare(b.name);
    });

    // Mark the last child after sorting
    nodes.forEach((node, index) => {
      node.isLast = index === nodes.length - 1;

      if (node.children && node.children.length > 0) {
        markLastChildrenAndSort(node.children);
      }
    });
  };

  markLastChildrenAndSort(roots);
  return roots;
};

export function createParserState(): ParserState {
  return {
    isCapturingLLM: false,
    currentLLMResponse: [],
  };
}

function buildLLMSegments(lines: string[]): LLMResponseSegment[] {
  const segments: LLMResponseSegment[] = [];
  let buffer: string[] = [];

  let capturingIssue = false;
  let issueBuffer: string[] = [];

  let capturingPatch = false;
  let patchBuffer: string[] = [];

  const flushText = () => {
    if (buffer.length > 0) {
      segments.push({ kind: "text", content: buffer.join("\n") });
      buffer = [];
    }
  };

  for (const line of lines) {
    if (
      line.includes("[GITHUB_ISSUE_START]") ||
      line.includes("[GITHUB_ISSUE_START\n]")
    ) {
      flushText();
      capturingIssue = true;
      issueBuffer = [];
      continue;
    }
    if (
      line.includes("[GITHUB_ISSUE_END]") ||
      line.includes("[GITHUB_ISSUE_END\n]")
    ) {
      capturingIssue = false;
      segments.push({ kind: "githubIssue", content: issueBuffer.join("\n") });
      issueBuffer = [];
      continue;
    }

    if (line.includes("[PATCH_START]") || line.includes("[PATCH_START\n]")) {
      flushText();
      capturingPatch = true;
      patchBuffer = [];
      continue;
    }
    if (line.includes("[PATCH_END]") || line.includes("[PATCH_END\n]")) {
      capturingPatch = false;
      segments.push({ kind: "patch", content: patchBuffer.join("\n") });
      patchBuffer = [];
      continue;
    }

    if (capturingIssue) {
      issueBuffer.push(line);
    } else if (capturingPatch) {
      patchBuffer.push(line);
    } else {
      buffer.push(line);
    }
  }

  flushText();
  return segments;
}

export function parseLines(
  lines: string[],
  logs: LogItem[],
  state: ParserState
): { logs: LogItem[]; state: ParserState } {
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.includes("LLM_RESPONSE - [LLM RESPONSE START]")) {
      state.isCapturingLLM = true;
      state.currentLLMResponse = [];
      continue;
    }

    if (line.includes("LLM_RESPONSE - [LLM RESPONSE END]")) {
      if (state.currentLLMResponse.length > 0) {
        const segments = buildLLMSegments(state.currentLLMResponse);
        const last = logs[logs.length - 1];
        if (last && last.type === "LLM_RESPONSE") {
          last.messages = last.messages.concat(state.currentLLMResponse);
          last.segments = (last.segments || []).concat(segments);
        } else {
          logs.push({
            type: "LLM_RESPONSE",
            messages: [...state.currentLLMResponse],
            segments,
          });
        }
      }
      state.isCapturingLLM = false;
      state.currentLLMResponse = [];
      continue;
    }

    if (state.isCapturingLLM) {
      const lastCaptured =
        state.currentLLMResponse[state.currentLLMResponse.length - 1];
      if (line !== lastCaptured) state.currentLLMResponse.push(line);
      continue;
    }

    let type: LogType = "DEFAULT";
    if (/\bINFO\b/.test(line)) type = "INFO";
    else if (/\bTOOL_CALL\b/.test(line)) type = "TOOL_CALL";

    const last = logs[logs.length - 1];
    if (last && last.type === type) {
      const lastMsg = last.messages[last.messages.length - 1];
      if (line !== lastMsg) last.messages.push(line);
    } else {
      logs.push({ type, messages: [line] });
    }
  }

  return { logs, state };
}

export function extractTitleAndDescription(input: string) {
  const lines = input.split("\n");

  // Find first line starting with #
  const titleLine = lines.find((line) => line.startsWith("# "));
  const title = titleLine ? titleLine.replace(/^#\s*/, "").trim() : "";

  // Remove that line and take the rest as description
  const description = lines
    .filter((line) => line !== titleLine) // everything except title line
    .join("\n")
    .trim();

  return { title, description };
}
