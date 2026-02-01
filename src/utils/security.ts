import path from 'path';
import { z } from 'zod';

/**
 * Security configuration constants
 */
export const SECURITY_CONFIG = {
  maxContentLength: 100000, // 100KB limit for content
  maxFileSize: 10485760, // 10MB limit for files
  maxPathLength: 1000, // Maximum path length
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },
};

/**
 * Validates that a file path is within allowed boundaries
 * @param filePath - The path to validate
 * @param allowedBasePath - The base path that the file must be within
 * @returns true if valid, false otherwise
 */
export function validatePath(filePath: string, allowedBasePath: string): boolean {
  try {
    const normalizedPath = path.normalize(path.resolve(filePath));
    const normalizedBase = path.normalize(path.resolve(allowedBasePath));

    // Check if the normalized path starts with the allowed base path
    if (!normalizedPath.startsWith(normalizedBase)) {
      return false;
    }

    // Check for null bytes
    if (filePath.includes('\0')) {
      return false;
    }

    // Check path length
    if (normalizedPath.length > SECURITY_CONFIG.maxPathLength) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes user input to prevent injection attacks
 * @param input - The input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Limit length
  if (sanitized.length > SECURITY_CONFIG.maxContentLength) {
    sanitized = sanitized.substring(0, SECURITY_CONFIG.maxContentLength);
  }

  // Remove control characters except newlines and tabs
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Input validation schemas using Zod
 */
export const ValidationSchemas = {
  // Content evaluation input schema
  contentEvaluation: z.object({
    content: z
      .string()
      .min(1, 'Content cannot be empty')
      .max(
        SECURITY_CONFIG.maxContentLength,
        `Content exceeds maximum length of ${SECURITY_CONFIG.maxContentLength} characters`
      )
      .transform(sanitizeInput),
  }),

  // Brand compliance check input schema
  brandCompliance: z.object({
    content: z
      .string()
      .min(1, 'Content cannot be empty')
      .max(
        SECURITY_CONFIG.maxContentLength,
        `Content exceeds maximum length of ${SECURITY_CONFIG.maxContentLength} characters`
      )
      .transform(sanitizeInput),
    context: z
      .string()
      .optional()
      .transform((val) => (val ? sanitizeInput(val) : undefined)),
  }),

  // Configuration update schema
  configUpdate: z.object({
    sensitiveKeywords: z.array(z.string()).optional(),
    allowedTopics: z.array(z.string()).optional(),
    blockedTopics: z.array(z.string()).optional(),
    riskTolerances: z.record(z.string(), z.number()).optional(),
  }),

  // File path schema
  filePath: z
    .string()
    .min(1, 'File path cannot be empty')
    .max(SECURITY_CONFIG.maxPathLength, 'File path too long')
    .refine((path) => !path.includes('\0'), 'Invalid file path: contains null bytes'),
};

/**
 * Rate limiting implementation
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(
    maxRequests = SECURITY_CONFIG.rateLimit.maxRequests,
    windowMs = SECURITY_CONFIG.rateLimit.windowMs
  ) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request is allowed
   * @param identifier - Unique identifier for the requester
   * @returns true if request is allowed, false if rate limited
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(identifier) || [];

    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }

    // Add current timestamp
    validTimestamps.push(now);
    this.requests.set(identifier, validTimestamps);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return true;
  }

  /**
   * Clean up old entries from the rate limiter
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }

  /**
   * Reset rate limits for an identifier
   * @param identifier - Unique identifier for the requester
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.requests.clear();
  }
}

/**
 * Safe error class that doesn't expose sensitive information
 */
export class SafeError extends Error {
  public readonly userMessage: string;
  public readonly internalMessage?: string;
  public readonly code: string;

  constructor(userMessage: string, code: string = 'UNKNOWN_ERROR', internalMessage?: string) {
    super(userMessage);
    this.name = 'SafeError';
    this.userMessage = userMessage;
    this.code = code;
    this.internalMessage = internalMessage;

    // Log internal message securely (in production, this would go to a secure logging service)
    if (internalMessage && process.env.NODE_ENV !== 'production') {
      console.error(`[Internal Error - ${code}]:`, internalMessage);
    }
  }
}

/**
 * Wraps errors to ensure safe error messages
 */
export function wrapError(
  error: unknown,
  userMessage: string = 'An error occurred',
  code: string = 'UNKNOWN_ERROR'
): SafeError {
  if (error instanceof SafeError) {
    return error;
  }

  const internalMessage = error instanceof Error ? error.message : String(error);
  return new SafeError(userMessage, code, internalMessage);
}
