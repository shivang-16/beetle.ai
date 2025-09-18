import {
  ITreeNode,
  LLMResponseSegment,
  LogItem,
  LogType,
  ParsedPatch,
  ParsedWarning,
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

export function safeParseJSON(str: string) {
  try {
    let normalized = str.trim();

    // Replace Python booleans & nulls
    normalized = normalized
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/\bNone\b/g, "null");

    // Regex: match "key": "value"
    normalized = normalized.replace(
      /"(.*?)"\s*:\s*"([\s\S]*?)"/g,
      (match, key, value) => {
        // Heuristic: only escape if value looks like code
        const looksLikeCode =
          /import|export|function|class|const|let|var|\(|\)|{|}|;/.test(value);

        if (looksLikeCode && value.includes('"')) {
          const fixedValue = value.replace(/"/g, '\\"');
          return `"${key}": "${fixedValue}"`;
        }

        return match; // leave normal text untouched
      }
    );

    // If it already looks like JSON (double-quoted keys), try parsing directly
    if (/\"[a-zA-Z0-9_]+\"\s*:/.test(normalized)) {
      return JSON.parse(normalized);
    }

    // Convert Python dict-style keys:  'key': → "key":
    normalized = normalized.replace(/'([^']+)':/g, (_, key) => `"${key}":`);

    // Convert Python single-quoted string values → JSON double-quoted
    normalized = normalized.replace(/'([^']*)'/g, (_, val) => `"${val}"`);
    console.log({ normalized });

    return JSON.parse(normalized);
  } catch (error) {
    console.log(error);

    return null;
  }
}

function cleanInitialisationLine(line: string): string {
  // remove prefix: "2025-09-08 06:58:50 - codetector - INITIALISATION -"
  return line.replace(
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} - codetector - INITIALISATION -\s*/,
    ""
  );
}

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

  let capturingWarning = false;
  let warningBuffer: string[] = [];

  let capturingFileStatus = false;
  let fileStatusBuffer: string[] = [];

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

    if (
      line.includes("[WARNING_START]") ||
      line.includes("[WARNING_START\n]")
    ) {
      flushText();
      capturingWarning = true;
      warningBuffer = [];
      continue;
    }

    if (line.includes("[WARNING_END]") || line.includes("[WARNING_END\n]")) {
      capturingWarning = false;
      segments.push({ kind: "warning", content: warningBuffer.join("\n") });
      warningBuffer = [];
      continue;
    }

    if (line.includes("[FILE_STATUS]") || line.includes("[FILE_STATUS\n]")) {
      flushText();
      capturingFileStatus = true;
      fileStatusBuffer = [];
      continue;
    }

    if (
      line.includes("[FILE_STATUS_END]") ||
      line.includes("[FILE_STATUS_END\n]")
    ) {
      capturingFileStatus = false;
      segments.push({
        kind: "file_status",
        content: fileStatusBuffer.join("\n"),
      });
      fileStatusBuffer = [];
      continue;
    }

    if (capturingIssue) {
      issueBuffer.push(line);
    } else if (capturingPatch) {
      patchBuffer.push(line);
    } else if (capturingWarning) {
      warningBuffer.push(line);
    } else if (capturingFileStatus) {
      fileStatusBuffer.push(line);
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
    else if (/\bINITIALISATION\b/.test(line)) type = "INITIALISATION";

    const last = logs[logs.length - 1];

    // --- Handle INITIALISATION grouping ---
    if (type === "INITIALISATION") {
      const message = cleanInitialisationLine(line);

      if (last && last.type === "INITIALISATION") {
        last.messages.push(message);
      } else {
        logs.push({ type: "INITIALISATION", messages: [message] });
      }
      continue;
    }

    if (last && last.type === type) {
      const lastMsg = last.messages[last.messages.length - 1];
      if (line !== lastMsg) last.messages.push(line);
    } else {
      logs.push({ type, messages: [line] });
    }
  }

  return { logs, state };
}

// Parse a complete logs string (e.g., fetched from DB) using the same logic
// as streaming, by splitting into lines and reusing parseLines incrementally.
export function parseFullLogText(fullText: string): {
  logs: LogItem[];
  state: ParserState;
} {
  const lines = fullText.split("\n");
  let logs: LogItem[] = [];
  let state: ParserState = createParserState();
  // process in chunks to mimic streaming semantics
  const chunkSize = 200;
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    const result = parseLines(chunk, logs, state);
    logs = result.logs;
    state = result.state;
  }
  return { logs, state };
}

// Decode base64 gzip string to original text
export async function decodeGzipBase64ToText(base64: string): Promise<string> {
  if (!base64) return "";
  // Browser-safe: use built-in streams to gunzip via CompressionStream is not available.
  // We'll rely on a tiny gunzip if needed later; for now prefer server-side logsText.
  // Fallback: try using Web APIs where supported (not standard across all browsers).
  try {
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    // If DecompressionStream('gzip') is available, use it
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (typeof DecompressionStream !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const ds = new DecompressionStream("gzip");
      const stream = new Response(binary).body!.pipeThrough(ds);
      const buf = await new Response(stream).arrayBuffer();
      return new TextDecoder().decode(buf);
    }
  } catch {
    // ignore
  }
  // If not supported, return empty so caller can fallback to logsText
  return "";
}

// Convert Node Buffer JSON (from Mongoose lean() -> JSON.stringify(Buffer)) to Uint8Array
// Accepts either { type: 'Buffer', data: number[] } or just number[]
export function bufferJSONToUint8Array(
  bufferLike: { type?: string; data?: number[] } | number[] | string | undefined
): Uint8Array | null {
  // console.log("🔄 Buffer JSON to Uint8Array1: ", bufferLike);
  if (!bufferLike) return null;
  if (typeof bufferLike === "string") {
    try {
      const arr = Uint8Array.from(atob(bufferLike), (c) => c.charCodeAt(0));
      // console.log("🔄 Buffer JSON to Uint8Array(base64): ", arr);
      return arr;
    } catch {
      console.log("🔄 Buffer JSON to Uint8Array(base64) failed");
      return null;
    }
  }
  if (Array.isArray(bufferLike)) {
    // console.log("🔄 Buffer JSON to Uint8Array2: ", bufferLike);
    return new Uint8Array(bufferLike);
  }
  if (typeof bufferLike === "object" && Array.isArray(bufferLike.data)) {
    // console.log("🔄 Buffer JSON to Uint8Array3: ", bufferLike.data);
    return new Uint8Array(bufferLike.data);
  }
  console.log("🔄 Buffer JSON to Uint8Array4: ", null);
  return null;
}

// Gunzip Uint8Array to string using Web DecompressionStream when available
export async function gunzipUint8ArrayToText(
  binary: Uint8Array
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // console.log("🔄 Gunzip Uint8Array to text: ", binary);
  if (typeof DecompressionStream !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ds = new DecompressionStream("gzip");
    const stream = new Response(binary as BodyInit).body!.pipeThrough(ds);
    const buf = await new Response(stream).arrayBuffer();
    // console.log("🔄 Gunzip Uint8Array to text: ", buf);
    return new TextDecoder().decode(buf);
  }
  return "";
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

export function parsePatchString(input: string): ParsedPatch {
  const result: ParsedPatch = {};

  // File
  const fileMatch = input.match(/\*\*File:\*\*\s*`([^`]+)`/);
  if (fileMatch) result.file = fileMatch[1];

  // Line Range
  const lineRangeMatch = input.match(/\*\*Line_Range:\*\*\s*([^\n]+)/);
  if (lineRangeMatch && lineRangeMatch[1])
    result.line_range = lineRangeMatch[1].trim();

  // Issue
  const issueMatch = input.match(
    /\*\*Issue:\*\*\s*([\s\S]*?)(?=\*\*Language:|\n###)/
  );
  if (issueMatch && issueMatch[1]) result.issue = issueMatch[1].trim();

  // Language
  const langMatch = input.match(/\*\*Language:\*\*\s*([^\n]+)/);
  if (langMatch && langMatch[1]) result.language = langMatch[1].trim();

  // Before code (preserve full block)
  const beforeMatch = input.match(/### Before[^\n]*\n([\s\S]*?)\n### After/);
  if (beforeMatch && beforeMatch[1]) result.before = beforeMatch[1].trim();

  // After code (preserve full block)
  const afterMatch = input.match(
    /### After[^\n]*\n([\s\S]*?)\n### Explanation/
  );
  if (afterMatch && afterMatch[1]) result.after = afterMatch[1].trim();

  // Explanation
  const explanationMatch = input.match(/### Explanation\s*([\s\S]*)/);
  if (explanationMatch && explanationMatch[1])
    result.explanation = explanationMatch[1].trim();

  return result;
}

export function parseWarningString(input: string): ParsedWarning {
  const result: ParsedWarning = {};

  // File
  const fileMatch = input.match(/\*\*File:\*\*\s*`([^`]+)`/);
  if (fileMatch) result.file = fileMatch[1];

  // Line
  const lineMatch = input.match(/\*\*Line:\*\*\s*([^\n]+)/);
  if (lineMatch && lineMatch[1]) result.line = lineMatch[1].trim();

  // Type
  const typeMatch = input.match(/\*\*Type:\*\*\s*([^\n]+)/);
  if (typeMatch && typeMatch[1]) result.type = typeMatch[1].trim();

  // Language
  const langMatch = input.match(/\*\*Language:\*\*\s*([^\n]+)/);
  if (langMatch && langMatch[1]) result.language = langMatch[1].trim();

  // Warning
  const warningMatch = input.match(
    /### Warning\s*([\s\S]*?)(?=### Current Code)/
  );
  if (warningMatch && warningMatch[1]) result.warning = warningMatch[1].trim();

  // Current Code (keep fenced block)
  const currentCodeMatch = input.match(
    /### Current Code\s*([\s\S]*?)\n### Suggestion/
  );
  if (currentCodeMatch && currentCodeMatch[1])
    result.currentCode = currentCodeMatch[1].trim();

  // Suggestion
  const suggestionMatch = input.match(
    /### Suggestion\s*([\s\S]*?)(?=### Example Fix)/
  );
  if (suggestionMatch && suggestionMatch[1])
    result.suggestion = suggestionMatch[1].trim();

  // Example Fix (keep fenced block)
  const exampleFixMatch = input.match(
    /### Example Fix\s*([\s\S]*?)\n### Why This Matters/
  );
  if (exampleFixMatch && exampleFixMatch[1])
    result.exampleFix = exampleFixMatch[1].trim();

  // Why This Matters
  const whyMatch = input.match(/### Why This Matters\s*([\s\S]*)/);
  if (whyMatch && whyMatch[1]) result.whyThisMatters = whyMatch[1].trim();

  return result;
}

export function parseToolCall(
  log: string
): { type: string; result: any } | null {
  try {
    // Extract type (inside square brackets)
    const typeMatch = log.match(/\[(.*?)\]/);
    if (!typeMatch) return null;
    const type = typeMatch[1] ?? "";

    // Extract payload (after square bracket)
    const payloadMatch = log.match(/\] (.*)$/s);
    if (!payloadMatch) return { type, result: null };
    let payload = payloadMatch[1] ? payloadMatch[1].trim() : "";

    // Handle empty array case directly
    if (!payload || payload === "[]") {
      return { type, result: payload === "[]" ? [] : null };
    }

    // Convert Python-style values
    payload = payload
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/\bNone\b/g, "null");

    // Replace single-quoted strings safely with double quotes
    payload = payload.replace(/'([^']*)'/g, (_, val) => {
      return `"${val.replace(/"/g, '\\"')}"`;
    });

    return {
      type,
      result: !payload.includes("Scanning")
        ? JSON.parse(payload)
        : payloadMatch[1]?.trim(),
    };
  } catch (err) {
    console.error("Failed to parse log:", err);
    return null;
  }
}

export function detectLanguage(
  filePath: string
): { language: string; icon: string } | null {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (!ext) return null;

  // Map extension → language + VS Code icon name
  const map: Record<string, { language: string; icon: string }> = {
    js: { language: "javascript", icon: "vscode-icons:file-type-js" },
    jsx: { language: "javascript", icon: "vscode-icons:file-type-reactjs" },
    ts: { language: "typescript", icon: "vscode-icons:file-type-typescript" },
    tsx: { language: "typescript", icon: "vscode-icons:file-type-reactts" },
    py: { language: "python", icon: "vscode-icons:file-type-python" },
    java: { language: "java", icon: "vscode-icons:file-type-java" },
    cs: { language: "csharp", icon: "vscode-icons:file-type-csharp" },
    cpp: { language: "cpp", icon: "vscode-icons:file-type-cpp" },
    c: { language: "c", icon: "vscode-icons:file-type-c" },
    rb: { language: "ruby", icon: "vscode-icons:file-type-ruby" },
    php: { language: "php", icon: "vscode-icons:file-type-php" },
    go: { language: "go", icon: "vscode-icons:file-type-go" },
    rs: { language: "rust", icon: "vscode-icons:file-type-rust" },
    swift: { language: "swift", icon: "vscode-icons:file-type-swift" },
    kt: { language: "kotlin", icon: "vscode-icons:file-type-kotlin" },
    m: { language: "objective-c", icon: "vscode-icons:file-type-objectivec" },
    scala: { language: "scala", icon: "vscode-icons:file-type-scala" },
    sh: { language: "shell", icon: "vscode-icons:file-type-shell" },
    sql: { language: "sql", icon: "vscode-icons:file-type-sql" },
    json: { language: "json", icon: "vscode-icons:file-type-json" },
    yaml: { language: "yaml", icon: "vscode-icons:file-type-yaml" },
    yml: { language: "yaml", icon: "vscode-icons:file-type-yaml" },
    md: { language: "markdown", icon: "vscode-icons:file-type-markdown" },
    html: { language: "html", icon: "vscode-icons:file-type-html" },
    css: { language: "css", icon: "vscode-icons:file-type-css" },
    scss: { language: "scss", icon: "vscode-icons:file-type-scss" },
    xml: { language: "xml", icon: "vscode-icons:file-type-xml" },
    Dockerfile: {
      language: "Dockerfile",
      icon: "vscode-icons:file-type-docker",
    },
  };

  return map[ext] || null;
}

export function extractPath(filePath: string) {
  const match = filePath.match(/repositories\/[^/]+\/(.+)/);
  return match ? match[1] : null;
}
