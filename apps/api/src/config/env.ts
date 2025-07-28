import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
// The path is relative to the dist/config directory, so we go up 2 levels to reach apps/api
const envPath = path.resolve(__dirname, '../../.env');

const result = config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
  console.error('Attempted to load from:', envPath);
}

// Export environment variables with defaults
export const env = {
  // GitHub App Configuration
  GITHUB_APP_ID: process.env.GITHUB_APP_ID ? parseInt(process.env.GITHUB_APP_ID) : undefined,
  GITHUB_PRIVATE_KEY_BASE64: process.env.GITHUB_PRIVATE_KEY_BASE64 || '',
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || '',
  
  // MongoDB Configuration
  CODETECTOR_DB: process.env.CODETECTOR_DB || '',

  // Redis Configuration
  REDIS_URL: process.env.REDIS_URL || '',
  
  // E2B Configuration
  E2B_API_KEY: process.env.E2B_API_KEY || '',
  E2B_SANDBOX_TEMPLATE: process.env.E2B_SANDBOX_TEMPLATE || 'gh622yvblp3exdpk9tya',
  
  // Server Configuration
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 3001,
  NODE_ENV: process.env.NODE_ENV || 'development'
};

// Validate required environment variables
const requiredEnvVars = [
  'GITHUB_APP_ID',
  'GITHUB_PRIVATE_KEY_BASE64',
  'GITHUB_WEBHOOK_SECRET',
  'CODETECTOR_DB',
  'REDIS_URL',
  'E2B_API_KEY',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  console.error('Please ensure your .env file contains all required variables');
} 