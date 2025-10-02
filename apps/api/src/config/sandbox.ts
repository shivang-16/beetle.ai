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

export async function connectSandbox(
  sandboxId: string,
): Promise<Sandbox> {
  console.log(`🔌 Attempting to connect to sandbox: ${sandboxId}`);
  
  // Validate inputs
  if (!sandboxId) {
    throw new Error('Sandbox ID is required for connection');
  }
  
  if (!process.env.E2B_API_KEY) {
    throw new Error('E2B_API_KEY environment variable is not set');
  }
  
  try {
    console.log(`🔑 Using API key: ${process.env.E2B_API_KEY.substring(0, 10)}...`);
    console.log(`⏱️ Connection timeout: ${DEFAULT_OPTIONS.timeoutMs}ms`);
    
    const sandbox = await Sandbox.connect(sandboxId, DEFAULT_OPTIONS);
    
    console.log(`✅ Successfully connected to sandbox: ${sandboxId}`);
    
    // Test the connection by running a simple command
    try {
      const testCommand = await sandbox.commands.run('echo "Connection test successful"');
      console.log(`🧪 Connection test initiated successfully`);
    } catch (testError) {
      console.warn(`⚠️ Connection test failed, but sandbox connection established: ${testError}`);
    }
    
    return sandbox;
  } catch (error: any) {
    console.error(`❌ Failed to connect to sandbox ${sandboxId}:`, {
      error: error.message,
      stack: error.stack,
      sandboxId,
      apiKeyPresent: !!process.env.E2B_API_KEY,
      timeout: DEFAULT_OPTIONS.timeoutMs
    });
    
    // Provide more specific error messages
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      throw new Error(`Sandbox ${sandboxId} not found. It may have been terminated or expired.`);
    } else if (error.message?.includes('unauthorized') || error.message?.includes('401')) {
      throw new Error('Unauthorized: Invalid E2B API key or insufficient permissions.');
    } else if (error.message?.includes('timeout')) {
      throw new Error(`Connection timeout: Could not connect to sandbox ${sandboxId} within ${DEFAULT_OPTIONS.timeoutMs}ms.`);
    } else {
      throw new Error(`Failed to connect to sandbox ${sandboxId}: ${error.message}`);
    }
  }
}
