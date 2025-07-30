import { Sandbox, SandboxOpts } from '@e2b/code-interpreter';
import { env } from '../config/env.js';

const DEFAULT_OPTIONS: SandboxOpts = {
  apiKey: env.E2B_API_KEY!,
  timeoutMs: 60 * 60 * 1000,          // 5 minutes default
};


export function createSandbox(
  overrides: Partial<any> = {}
): Promise<Sandbox> {
  const opts = { ...DEFAULT_OPTIONS, ...overrides };
  return Sandbox.create(env.E2B_SANDBOX_TEMPLATE!, opts);
}

