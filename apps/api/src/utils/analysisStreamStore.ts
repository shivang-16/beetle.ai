import { promisify } from "util";
import { gzip } from "zlib";
import redis from "../config/redis.js";
import Analysis from "../models/analysis.model.js";

const gzipAsync = promisify(gzip);

export function getAnalysisRedisKey(analysisId: string): string {
  return `analysis:${analysisId}:buffer`;
}

export async function initRedisBuffer(analysisId: string, ttlSeconds = 60 * 60 * 4): Promise<void> {
  const key = getAnalysisRedisKey(analysisId);
  // Initialize with empty string and TTL so abandoned runs are cleaned up
  await redis.set(key, "", "EX", ttlSeconds);
  console.log(`[Redis][init] key=${key} ttl=${ttlSeconds}s`);
}

export async function appendToRedisBuffer(analysisId: string, data: string): Promise<void> {
  const key = getAnalysisRedisKey(analysisId);
  // Always append a trailing newline to preserve line boundaries
  const payload = data.endsWith("\n") ? data : data + "\n";
  const appendedLen = Buffer.byteLength(payload);
  await redis.append(key, payload);
  console.log(`[Redis][append] key=${key} bytes+=${appendedLen}`);
}

type FinalizeStatus = "completed" | "interrupted" | "error";

export interface FinalizeParams {
  analysisId: string;
  userId: string;
  repoUrl: string;
  github_repositoryId: string;
  model: string;
  prompt: string;
  status: FinalizeStatus;
  exitCode?: number | null;
}

export async function finalizeAnalysisAndPersist(params: FinalizeParams): Promise<void> {
  const { analysisId, userId, repoUrl, model, prompt, status, exitCode, github_repositoryId } = params;
  const key = getAnalysisRedisKey(analysisId);

  try {
    const rawBuffer = await redis.getBuffer(key);
    const originalBytes = rawBuffer ? rawBuffer.length : 0;
    const compressed = rawBuffer && originalBytes > 0 ? await gzipAsync(rawBuffer) : Buffer.alloc(0);
    console.log(`[Redis][finalize:start] key=${key} originalBytes=${originalBytes} compressedBytes=${compressed.length} status=${status} exitCode=${exitCode ?? null}`);

    await Analysis.create({
      analysisId,
      userId,
      repoUrl,
      github_repositoryId,
      model,
      prompt,
      status,
      exitCode: typeof exitCode === "number" ? exitCode : null,
      logsCompressed: compressed,
      compression: {
        algorithm: "gzip",
        originalBytes,
        compressedBytes: compressed.length,
      },
    });
    console.log(`[Mongo][persisted] analysisId=${analysisId}`);
  } finally {
    try {
      const delCount = await redis.del(key);
      console.log(`[Redis][cleanup] key=${key} deleted=${delCount}`);
    } catch (_) {}
  }
}


