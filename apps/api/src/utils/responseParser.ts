// apps/api/src/lib/responseParser.ts
export interface PRComment {
  content: string;
  timestamp: string;
}

export interface ParsedResponse {
  llmResponses: string[];
  prComments: PRComment[];
}

export interface ParserState {
  isCapturingLLM: boolean;
  isCapturingPRComment: boolean;
  currentLLMResponse: string[];
  currentPRComment: string[];
  accumulatedData: string;
}

export function createParserState(): ParserState {
  return {
    isCapturingLLM: false,
    isCapturingPRComment: false,
    currentLLMResponse: [],
    currentPRComment: [],
    accumulatedData: ''
  };
}

export function parseStreamingResponse(
  data: string,
  state: ParserState
): { prComments: PRComment[]; state: ParserState } {
  // Accumulate data to handle partial lines
  state.accumulatedData += data;
  
  // Split by lines and process complete lines
  const lines = state.accumulatedData.split('\n');
  
  // Keep the last incomplete line in accumulated data
  state.accumulatedData = lines.pop() || '';
  
  const prComments: PRComment[] = [];
  
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check for LLM response markers
    if (line.includes("LLM_RESPONSE - [LLM RESPONSE START]")) {
      state.isCapturingLLM = true;
      state.currentLLMResponse = [];
      continue;
    }

    if (line.includes("LLM_RESPONSE - [LLM RESPONSE END]")) {
      state.isCapturingLLM = false;
      // Process the captured LLM response for PR comments
      const llmContent = state.currentLLMResponse.join('\n');
      const extractedComments = extractPRCommentsFromLLMResponse(llmContent);
      prComments.push(...extractedComments);
      state.currentLLMResponse = [];
      continue;
    }

    // Capture LLM response content
    if (state.isCapturingLLM) {
      const lastCaptured = state.currentLLMResponse[state.currentLLMResponse.length - 1];
      if (line !== lastCaptured) {
        state.currentLLMResponse.push(line);
      }
      continue;
    }
  }

  return { prComments, state };
}

function extractPRCommentsFromLLMResponse(llmContent: string): PRComment[] {
  const prComments: PRComment[] = [];
  const lines = llmContent.split('\n');
  
  let isCapturingPRComment = false;
  let currentPRComment: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.includes("[PR_COMMENT_START]")) {
      isCapturingPRComment = true;
      currentPRComment = [];
      continue;
    }
    
    if (trimmedLine.includes("[PR_COMMENT_END]")) {
      if (isCapturingPRComment && currentPRComment.length > 0) {
        const commentContent = currentPRComment.join('\n').trim();
        if (commentContent) {
          prComments.push({
            content: commentContent,
            timestamp: new Date().toISOString()
          });
        }
      }
      isCapturingPRComment = false;
      currentPRComment = [];
      continue;
    }
    
    if (isCapturingPRComment) {
      currentPRComment.push(line);
    }
  }
  
  return prComments;
}

export function finalizeParsing(state: ParserState): PRComment[] {
  // Process any remaining accumulated data
  if (state.accumulatedData.trim()) {
    const finalResult = parseStreamingResponse('\n', state);
    return finalResult.prComments;
  }
  
  // Process any incomplete LLM response
  if (state.isCapturingLLM && state.currentLLMResponse.length > 0) {
    const llmContent = state.currentLLMResponse.join('\n');
    return extractPRCommentsFromLLMResponse(llmContent);
  }
  
  return [];
}