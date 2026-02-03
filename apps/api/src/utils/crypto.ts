import crypto from 'crypto';
import { logger } from './logger.js';

/**
 * Encryption Utility
 * Provides centralized encryption and decryption functions using AES-256-GCM.
 * Requires ENCRYPTION_KEY to be set in environment variables (32-byte hex string).
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment
 * Falls back to a development key if not set (NOT RECOMMENDED FOR PRODUCTION)
 */
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY must be set in production environment');
    }
    logger.warn('ENCRYPTION_KEY not set, using development key. DO NOT USE IN PRODUCTION!');
    // A stable development key (32 bytes)
    return Buffer.from('6395e5b38ed61a15f01344917b2f67973752e505291b5c21f84b423c5332c021', 'hex');
  }
  
  try {
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 characters)');
    }
    return keyBuffer;
  } catch (error) {
    throw new Error('Invalid ENCRYPTION_KEY format. Must be a hex string.');
  }
};

/**
 * Encrypt a string
 * @param text - The plain text to encrypt
 * @returns Base64 encoded string containing [IV][AuthTag][EncryptedData]
 */
export const encrypt = (text: string): string => {
  if (!text) return text;
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    logger.error('Encryption failed', { error: error instanceof Error ? error.message : error });
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypt a string
 * @param encryptedData - The encrypted data in [IV]:[AuthTag]:[EncryptedData] format
 * @returns The original plain text
 */
export const decrypt = (encryptedData: string): string => {
  if (!encryptedData || !encryptedData.includes(':')) return encryptedData;
  
  try {
    const key = getEncryptionKey();
    const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
    
    if (!ivHex || !authTagHex || !encryptedHex) {
      // If it doesn't match our format, it might not be encrypted
      return encryptedData;
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // If decryption fails, it might be because the data was never encrypted
    // In a migration phase, we might want to return the original data instead of throwing
    logger.warn('Decryption failed, returning original data', { 
      error: error instanceof Error ? error.message : error 
    });
    return encryptedData;
  }
};
