import { getInstallationOctokit } from '../../lib/githubApp.js';
import { logger } from '../../utils/logger.js';
import { GoogleGenAI } from '@google/genai';

export interface BeetleSuggestionContext {
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  suggestionCode?: string;
  originalComment?: string;
  severity?: string;
  issueType?: string;
}

// Using Vertex AI with @google/genai package for Gemini 2.5-pro model

/**
 * Heuristically determine if a comment body is a Beetle AI suggestion/comment
 */
export function isLikelyBeetleComment(body: string, authorLogin?: string): boolean {
  // Prefer strict author login matching to identify Beetle comments
  if (isBeetleBotAuthor(authorLogin)) return true;
  if (!body) return false;
  const lowered = body.toLowerCase();
  // Fallback heuristics (kept for legacy comments)
  const hasSuggestionFence = lowered.includes('```suggestion');
  const hasProblemSection = /###\s*problem/i.test(body);
  const hasMetadata = /\*\*File\*\*: `[^`]+`/i.test(body);
  const mentionsBeetle = lowered.includes('beetle ai') || lowered.includes('beetle');
  logger.debug('Beetle comment detection markers (fallback)', {
    hasSuggestionFence,
    hasProblemSection,
    hasMetadata,
    mentionsBeetle,
    authorLogin,
  });
  return hasSuggestionFence || hasProblemSection || hasMetadata || mentionsBeetle;
}

export function isBeetleBotAuthor(authorLogin?: string): boolean {
  if (!authorLogin) return false;
  const login = authorLogin.toLowerCase();
  const configured = (process.env.BEETLE_BOT_LOGIN || '').toLowerCase().trim();
  const candidates = [configured, 'beetle-ai[bot]', 'beetles-ai[bot]'].filter(Boolean);
  const match = candidates.includes(login);
  logger.debug('Beetle bot author check', { authorLogin, match, configured });
  return match;
}

export function isBeetleMentioned(body?: string): boolean {
  if (!body) return false;
  const match = /@(beetles-ai|beetle-ai|beetle)\b/i.test(body);
  logger.debug('Beetle mention check', { mentioned: match, preview: body.slice(0, 120) });
  return match;
}

/**
 * Determine if a new PR conversation comment is likely a reply to a Beetle comment.
 * Heuristics:
 * - Mentions the bot (e.g., @beetle-ai, @beetle-ai) or the word "beetle ai".
 * - Contains a blockquote (>) referencing typical Beetle markers or suggestion fences.
 */
export function isLikelyReplyToBeetleConversation(body: string): boolean {
  if (!body) return false;
  const lowered = body.toLowerCase();
  const hasBotMention = /@beetle[-_]ai|@.*\[bot\]/i.test(body);
  const mentionsBeetle = lowered.includes('@beetle');
  const quotesBeetle = />\s*.*(beetle|```suggestion|###\s*problem)/i.test(body);
  logger.debug('Issue comment reply intent detection', {
    hasBotMention,
    mentionsBeetle,
    quotesBeetle,
  });
  return hasBotMention || mentionsBeetle || quotesBeetle;
}

/**
 * Extracts suggestion metadata from a Beetle comment
 */
export function extractSuggestionFromComment(content: string): BeetleSuggestionContext | null {
  try {
    if (!content || typeof content !== 'string') return null;
    // Extract file path
    const fileMatch = content.match(/\*\*File\*\*:\s*`([^`]+)`/);
    const filePath = fileMatch ? fileMatch[1].trim() : undefined;

    // Extract line numbers
    const lineStartMatch = content.match(/\*\*Line_Start\*\*:\s*(\d+)/);
    const lineEndMatch = content.match(/\*\*Line_End\*\*:\s*(\d+)/);
    const lineStart = lineStartMatch ? parseInt(lineStartMatch[1]) : undefined;
    const lineEnd = lineEndMatch ? parseInt(lineEndMatch[1]) : undefined;

    // Extract severity/issue type
    const severityMatch = content.match(/\*\*Severity\*\*:\s*([^\n]+)/);
    const issueTypeMatch = content.match(/\*\*Issue\s*Type\*\*:\s*([^\n]+)/);
    const severity = severityMatch ? severityMatch[1].trim() : undefined;
    const issueType = issueTypeMatch ? issueTypeMatch[1].trim() : undefined;

    // Extract suggestion code block (raw)
    const suggestionMatch = content.match(/```suggestion\s*\n([\s\S]*?)\n```/);
    const suggestionCode = suggestionMatch ? suggestionMatch[1].trim() : undefined;

    const result: BeetleSuggestionContext = {
      filePath,
      lineStart,
      lineEnd,
      suggestionCode,
      originalComment: content,
      severity,
      issueType,
    };
    logger.debug('Extracted Beetle suggestion context', {
      filePath: result.filePath,
      lineStart: result.lineStart,
      lineEnd: result.lineEnd,
      severity: result.severity,
      issueType: result.issueType,
      suggestionCodeLength: result.suggestionCode?.length || 0,
    });
    return result;
  } catch (error) {
    logger.warn('Error extracting suggestion from Beetle comment', { error: error instanceof Error ? error.message : error });
    return null;
  }
}

function buildGeminiPrompt(params: {
  repoFullName: string;
  prNumber?: number;
  beetleCommentBody: string;
  beetleMeta?: BeetleSuggestionContext | null;
  userReplyBody: string;
  replyAuthorLogin?: string;
  parentPath?: string;
  parentLine?: number;
  diffHunk?: string;
}): string {
  const { repoFullName, prNumber, beetleCommentBody, beetleMeta, userReplyBody, replyAuthorLogin, parentPath, parentLine, diffHunk } = params;

  const extractedContext = beetleMeta
    ? `${beetleMeta.filePath ? `File: ${beetleMeta.filePath}\n` : ''}` +
      `${typeof beetleMeta.lineStart === 'number' ? `Line_Start: ${beetleMeta.lineStart}\n` : ''}` +
      `${typeof beetleMeta.lineEnd === 'number' ? `Line_End: ${beetleMeta.lineEnd}\n` : ''}` +
      `${beetleMeta.severity ? `Severity: ${beetleMeta.severity}\n` : ''}` +
      `${beetleMeta.issueType ? `Issue_Type: ${beetleMeta.issueType}\n` : ''}` +
      `${beetleMeta.suggestionCode ? `Suggestion:\n\`\`\`\n${beetleMeta.suggestionCode}\n\`\`\`\n` : ''}`
    : '';

  const reviewLocation = (parentPath || typeof parentLine === 'number')
    ? `${parentPath ? `Path: ${parentPath}\n` : ''}${typeof parentLine === 'number' ? `Line: ${parentLine}\n` : ''}`
    : '';

  const diffSection = diffHunk
    ? `--- Diff Hunk (context) ---\n\`\`\`diff\n${diffHunk}\n\`\`\`\n`
    : '';

  const prompt = `You are Beetle AI, an AI code reviewer.
You previously commented on this Pull Request, and the user replied with doubts/questions about your comment.
Please read the context carefully and respond with a simple, clear text that resolves the user's query.
You may include concise code suggestions if helpful. Keep the response focused and practical.

Repository: ${repoFullName}${prNumber ? ` | PR #${prNumber}` : ''}

--- Beetle Original Comment ---
${beetleCommentBody}

${extractedContext ? `--- Extracted Context ---\n${extractedContext}\n` : ''}${reviewLocation ? `--- Review Location ---\n${reviewLocation}\n` : ''}${diffSection}
--- User Reply ---
${userReplyBody}

--- Instruction ---
Understand Beetle's original comment and the user's intent in the reply.
Check the referenced code (diff hunks) if it's a review comment.
Start directly with the answer — no greetings, apologies, or filler.
Give the main crux first; keep it crisp and clear.
Respond directly to the user's reply above.
Explain misunderstandings briefly and provide corrective guidance.
Begin your response with '@${replyAuthorLogin ?? 'author'}' followed by the answer.
If a code fix helps, present it inside a collapsible dropdown:
<details><summary>Suggested fix</summary>
\`\`\`suggestion
<replacement snippet for the relevant lines>
\`\`\`
</details>`;

  logger.debug('Built Gemini prompt summary', {
    repoFullName,
    prNumber,
    hasMeta: !!beetleMeta,
    promptLength: prompt.length,
    hasSuggestionCode: !!beetleMeta?.suggestionCode,
    hasDiffHunk: !!diffHunk,
  });
  return prompt;
}

export async function generateReplyWithGemini(prompt: string, model?: string): Promise<string> {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'global';
  const chosenModel = model || 'gemini-2.5-pro';
  
  if (!credentialsPath) {
    logger.warn('GOOGLE_APPLICATION_CREDENTIALS is not set; cannot call Vertex AI.');
    return 'I\'m unable to process your reply right now due to missing configuration. Please try again later.';
  }
  
  if (!projectId) {
    logger.warn('GOOGLE_CLOUD_PROJECT_ID or GCP_PROJECT_ID is not set; cannot call Vertex AI.');
    return 'I\'m unable to process your reply right now due to missing project configuration. Please try again later.';
  }
  
  try {
    logger.info('Calling Vertex AI Gemini SDK generateContent', { 
      model: chosenModel, 
      promptLength: prompt.length,
      projectId,
      location 
    });
    
    // Initialize GoogleGenAI for Vertex AI
    const ai = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: location,
    });
    
    const response = await ai.models.generateContent({
      model: chosenModel,
      contents: prompt,
    });
    
    const text = String((response as any)?.text || '').trim();
    const firstCandidate = (response as any)?.candidates?.[0];
    const finishReason = firstCandidate?.finishReason;
    const safety = firstCandidate?.safetyRatings;
    
    logger.info('Vertex AI Gemini SDK response received', {
      finishReason,
      responseLength: text.length,
      safetyBlocked: Array.isArray(safety) ? safety.some((s: any) => s?.blocked) : false,
    });
    
    return text || 'Missing context; share relevant code or details.';
  } catch (error) {
    logger.error('Vertex AI Gemini SDK call failed', { error: error instanceof Error ? error.message : error });
    return 'I encountered an error while generating a response. Please try again.';
  }
}

export async function respondToBeetleCommentReply(opts: {
  installationId: number;
  owner: string;
  repo: string;
  prNumber?: number;
  userReplyCommentId: number;
  userReplyBody: string;
  replyAuthorLogin?: string;
  parentCommentId: number;
  parentCommentBody: string;
  parentPath?: string;
  parentLine?: number;
  diffHunk?: string;
  /**
   * Deprecated: commentType is ignored; we now only handle review comment replies.
   */
  commentType?: 'review' | 'issue';
}): Promise<void> {
  try {
    logger.info('Responding to Beetle comment reply', {
      installationId: opts.installationId,
      owner: opts.owner,
      repo: opts.repo,
      prNumber: opts.prNumber,
      userReplyCommentId: opts.userReplyCommentId,
      parentCommentId: opts.parentCommentId,
      commentType: 'review',
    });
    const beetleMeta = extractSuggestionFromComment(opts.parentCommentBody);
    const prompt = buildGeminiPrompt({
      repoFullName: `${opts.owner}/${opts.repo}`,
      prNumber: opts.prNumber,
      beetleCommentBody: opts.parentCommentBody,
      beetleMeta,
      userReplyBody: opts.userReplyBody,
      replyAuthorLogin: opts.replyAuthorLogin,
      parentPath: opts.parentPath,
      parentLine: opts.parentLine,
      diffHunk: opts.diffHunk,
    });

    const replyText = await generateReplyWithGemini(prompt);
    logger.debug('AI reply text preview', { preview: replyText.slice(0, 200), length: replyText.length });
    logger.info('AI reply text generated', { length: replyText.length });

    // Skip posting if the AI produced an empty or generic fallback response
    const isGenericOrEmpty = (
      replyText.trim().length < 20 ||
      /^Acknowledged\b/i.test(replyText) ||
      /^Missing context\b/i.test(replyText)
    );
    if (isGenericOrEmpty) {
      logger.warn('AI reply was empty or generic; not posting a comment', {
        preview: replyText.slice(0, 120),
        length: replyText.length,
      });
      return;
    }

    const octokit = getInstallationOctokit(opts.installationId);
    // Ensure the reply starts with an @mention of the replying user
    const mention = opts.replyAuthorLogin ? `@${opts.replyAuthorLogin}` : '';
    const finalReplyBody = (mention && !replyText.trim().startsWith(mention))
      ? `${mention} ${replyText}`
      : replyText;

    // Always post a threaded reply to the review comment.
    logger.debug('Posting threaded reply to review comment', {
      owner: opts.owner,
      repo: opts.repo,
      comment_id: opts.parentCommentId,
      replyLength: finalReplyBody.length,
    });
    try {
      await octokit.pulls.createReplyForReviewComment({
        owner: opts.owner,
        repo: opts.repo,
        pull_number: opts.prNumber!,
        comment_id: opts.parentCommentId,
        body: finalReplyBody,
      });
      logger.info('Posted Beetle AI reply under review comment', {
        owner: opts.owner,
        repo: opts.repo,
        parentCommentId: opts.parentCommentId,
      });
    } catch (err) {
      const status = (err as any)?.status;
      const message = (err as any)?.message || (err as Error)?.message;
      logger.warn('Threaded reply endpoint failed; attempting in_reply_to route', {
        status,
        message,
        owner: opts.owner,
        repo: opts.repo,
        prNumber: opts.prNumber,
        parentCommentId: opts.parentCommentId,
      });
    }
  } catch (error) {
    logger.error('Failed to respond to Beetle comment reply', { error: error instanceof Error ? error.message : error });
  }
}