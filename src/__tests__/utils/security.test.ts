import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  validatePath,
  sanitizeInput,
  ValidationSchemas,
  RateLimiter,
  SafeError,
  wrapError,
} from '../../utils/security.js';

describe('Security Utils', () => {
  describe('validatePath', () => {
    it('should accept paths within allowed base path', () => {
      const result = validatePath('/Users/test/project/file.txt', '/Users/test/project');
      expect(result).toBe(true);
    });

    it('should reject paths outside allowed base path', () => {
      const result = validatePath('/Users/test/other/file.txt', '/Users/test/project');
      expect(result).toBe(false);
    });

    it('should reject paths with null bytes', () => {
      const result = validatePath('/Users/test/project/file\0.txt', '/Users/test/project');
      expect(result).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove null bytes', () => {
      const result = sanitizeInput('test\0string');
      expect(result).toBe('teststring');
    });

    it('should remove control characters', () => {
      const result = sanitizeInput('test\x01\x02string');
      expect(result).toBe('teststring');
    });

    it('should preserve newlines and tabs', () => {
      const result = sanitizeInput('test\n\tstring');
      expect(result).toBe('test\n\tstring');
    });

    it('should handle non-string input', () => {
      const result = sanitizeInput(123 as unknown as string);
      expect(result).toBe('');
    });
  });

  describe('ValidationSchemas', () => {
    it('should validate content evaluation input', () => {
      const input = { content: 'test content' };
      const result = ValidationSchemas.contentEvaluation.parse(input);
      expect(result.content).toBe('test content');
    });

    it('should reject empty content', () => {
      const input = { content: '' };
      expect(() => ValidationSchemas.contentEvaluation.parse(input)).toThrow();
    });

    it('should reject content exceeding max length', () => {
      const input = { content: 'a'.repeat(100001) };
      expect(() => ValidationSchemas.contentEvaluation.parse(input)).toThrow();
    });
  });

  describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter(3, 1000); // 3 requests per second
    });

    it('should allow requests within limit', () => {
      expect(rateLimiter.isAllowed('user1')).toBe(true);
      expect(rateLimiter.isAllowed('user1')).toBe(true);
      expect(rateLimiter.isAllowed('user1')).toBe(true);
    });

    it('should block requests exceeding limit', () => {
      expect(rateLimiter.isAllowed('user2')).toBe(true);
      expect(rateLimiter.isAllowed('user2')).toBe(true);
      expect(rateLimiter.isAllowed('user2')).toBe(true);
      expect(rateLimiter.isAllowed('user2')).toBe(false);
    });

    it('should track different identifiers separately', () => {
      expect(rateLimiter.isAllowed('user3')).toBe(true);
      expect(rateLimiter.isAllowed('user4')).toBe(true);
      expect(rateLimiter.isAllowed('user3')).toBe(true);
      expect(rateLimiter.isAllowed('user4')).toBe(true);
    });

    it('should reset limits for an identifier', () => {
      expect(rateLimiter.isAllowed('user5')).toBe(true);
      expect(rateLimiter.isAllowed('user5')).toBe(true);
      expect(rateLimiter.isAllowed('user5')).toBe(true);
      expect(rateLimiter.isAllowed('user5')).toBe(false);

      rateLimiter.reset('user5');
      expect(rateLimiter.isAllowed('user5')).toBe(true);
    });
  });

  describe('SafeError', () => {
    it('should create safe error with user message', () => {
      const error = new SafeError('User friendly message', 'ERROR_CODE');
      expect(error.userMessage).toBe('User friendly message');
      expect(error.code).toBe('ERROR_CODE');
    });

    it('should store internal message', () => {
      const error = new SafeError('User message', 'CODE', 'Internal details');
      expect(error.userMessage).toBe('User message');
      expect(error.internalMessage).toBe('Internal details');
    });
  });

  describe('wrapError', () => {
    it('should wrap regular errors', () => {
      const originalError = new Error('Original error');
      const wrapped = wrapError(originalError, 'Safe message', 'SAFE_CODE');

      expect(wrapped.userMessage).toBe('Safe message');
      expect(wrapped.code).toBe('SAFE_CODE');
      expect(wrapped.internalMessage).toBe('Original error');
    });

    it('should return SafeError unchanged', () => {
      const safeError = new SafeError('Already safe', 'SAFE');
      const wrapped = wrapError(safeError);

      expect(wrapped).toBe(safeError);
    });

    it('should handle non-Error objects', () => {
      const wrapped = wrapError('String error', 'Safe message', 'CODE');

      expect(wrapped.userMessage).toBe('Safe message');
      expect(wrapped.internalMessage).toBe('String error');
    });
  });
});
