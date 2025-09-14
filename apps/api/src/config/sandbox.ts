import { Sandbox, SandboxOpts } from '@e2b/code-interpreter';

const DEFAULT_OPTIONS: SandboxOpts = {
  apiKey: process.env.E2B_API_KEY!,
  timeoutMs: 60 * 60 * 1000,          // 60 minutes default
};


export function createSandbox(
  overrides: Partial<any> = {}
): Promise<Sandbox> {
  const opts = { ...DEFAULT_OPTIONS, ...overrides };
  return Sandbox.create(process.env.E2B_SANDBOX_TEMPLATE!, opts);
}

