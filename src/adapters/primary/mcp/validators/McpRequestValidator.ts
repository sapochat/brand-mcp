import { CheckSafetyInput } from '../../../../application/use-cases/CheckSafetyUseCase.js';
import { CheckComplianceInput } from '../../../../application/use-cases/CheckComplianceUseCase.js';
import { CombinedEvaluationInput } from '../../../../application/use-cases/CombinedEvaluationUseCase.js';
import { UpdateConfigInput } from '../../../../application/use-cases/UpdateConfigUseCase.js';
import { BatchEvaluationInput } from '../../../../application/use-cases/BatchEvaluationUseCase.js';

/**
 * Validates and sanitizes MCP requests
 */
export class McpRequestValidator {
  
  validateSafetyInput(args: any): CheckSafetyInput {
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments: expected object');
    }

    if (!args.content || typeof args.content !== 'string') {
      throw new Error('Content is required and must be a string');
    }

    if (args.content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    if (args.content.length > 10000) {
      throw new Error('Content too long (max 10000 characters)');
    }

    return {
      content: this.sanitizeContent(args.content),
      context: this.sanitizeContext(args.context),
      metadata: this.sanitizeMetadata(args.metadata)
    };
  }

  validateComplianceInput(args: any): CheckComplianceInput {
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments: expected object');
    }

    if (!args.content || typeof args.content !== 'string') {
      throw new Error('Content is required and must be a string');
    }

    if (args.content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    if (args.content.length > 10000) {
      throw new Error('Content too long (max 10000 characters)');
    }

    return {
      content: this.sanitizeContent(args.content),
      context: this.sanitizeContext(args.context),
      metadata: this.sanitizeMetadata(args.metadata)
    };
  }

  validateCombinedInput(args: any): CombinedEvaluationInput {
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments: expected object');
    }

    if (!args.content || typeof args.content !== 'string') {
      throw new Error('Content is required and must be a string');
    }

    if (args.content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    if (args.content.length > 10000) {
      throw new Error('Content too long (max 10000 characters)');
    }

    // Validate weights
    const brandWeight = this.validateWeight(args.brandWeight, 'brandWeight', 2.0);
    const safetyWeight = this.validateWeight(args.safetyWeight, 'safetyWeight', 1.0);

    // Validate boolean flags
    const includeSafety = args.includeSafety !== undefined ? 
      this.validateBoolean(args.includeSafety, 'includeSafety') : true;
    const includeBrand = args.includeBrand !== undefined ?
      this.validateBoolean(args.includeBrand, 'includeBrand') : true;

    return {
      content: this.sanitizeContent(args.content),
      context: this.sanitizeContext(args.context),
      includeSafety,
      includeBrand,
      weights: brandWeight !== undefined && safetyWeight !== undefined ? {
        brand: brandWeight,
        safety: safetyWeight
      } : undefined,
      metadata: this.sanitizeMetadata(args.metadata)
    };
  }

  validateBatchInput(args: any): BatchEvaluationInput {
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments: expected object');
    }

    if (!args.items || !Array.isArray(args.items)) {
      throw new Error('Items array is required for batch evaluation');
    }

    if (args.items.length === 0) {
      throw new Error('Batch cannot be empty');
    }

    if (args.items.length > 100) {
      throw new Error('Batch size cannot exceed 100 items');
    }

    // Validate each item
    const validatedItems = args.items.map((item: any, index: number) => {
      if (!item || typeof item !== 'object') {
        throw new Error(`Invalid item at index ${index}: expected object`);
      }

      if (!item.content || typeof item.content !== 'string') {
        throw new Error(`Invalid content at index ${index}: content is required and must be a string`);
      }

      if (item.content.trim().length === 0) {
        throw new Error(`Invalid content at index ${index}: content cannot be empty`);
      }

      return {
        id: item.id ? String(item.id) : undefined,
        content: this.sanitizeContent(item.content),
        context: this.sanitizeContext(item.context),
        metadata: this.sanitizeMetadata(item.metadata)
      };
    });

    // Validate evaluation type
    const validTypes = ['safety', 'compliance', 'combined'];
    const evaluationType = args.evaluationType;
    if (evaluationType && !validTypes.includes(evaluationType)) {
      throw new Error(`Invalid evaluation type: ${evaluationType}. Must be one of: ${validTypes.join(', ')}`);
    }

    return {
      items: validatedItems,
      evaluationType: evaluationType || 'combined',
      options: {
        includeSafety: args.includeSafety !== false,
        includeBrand: args.includeBrand !== false,
        weights: args.weights ? {
          safety: this.validateWeight(args.weights.safety, 'safety weight', 1.0),
          brand: this.validateWeight(args.weights.brand, 'brand weight', 2.0)
        } : undefined
      }
    };
  }

  validateConfigInput(args: any): UpdateConfigInput {
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments: expected object');
    }

    const result: any = {};

    // Validate sensitive keywords
    if (args.sensitiveKeywords !== undefined) {
      if (!Array.isArray(args.sensitiveKeywords)) {
        throw new Error('sensitiveKeywords must be an array');
      }
      result.sensitiveKeywords = args.sensitiveKeywords
        .map((k: any) => this.validateStringArrayItem(k, 'sensitiveKeywords'))
        .filter((k: string) => k.length > 0);
    }

    // Validate allowed topics
    if (args.allowedTopics !== undefined) {
      if (!Array.isArray(args.allowedTopics)) {
        throw new Error('allowedTopics must be an array');
      }
      result.allowedTopics = args.allowedTopics
        .map((t: any) => this.validateStringArrayItem(t, 'allowedTopics'))
        .filter((t: string) => t.length > 0);
    }

    // Validate blocked topics
    if (args.blockedTopics !== undefined) {
      if (!Array.isArray(args.blockedTopics)) {
        throw new Error('blockedTopics must be an array');
      }
      result.blockedTopics = args.blockedTopics
        .map((t: any) => this.validateStringArrayItem(t, 'blockedTopics'))
        .filter((t: string) => t.length > 0);
    }

    // Validate risk tolerances
    if (args.riskTolerances !== undefined) {
      if (typeof args.riskTolerances !== 'object' || args.riskTolerances === null) {
        throw new Error('riskTolerances must be an object');
      }
      result.riskTolerances = this.validateRiskTolerances(args.riskTolerances);
    }

    return result;
  }

  private sanitizeContent(content: string): string {
    if (typeof content !== 'string') return '';
    
    // Remove potentially harmful content
    return content
      .replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '') // Remove control characters
      .trim();
  }

  private sanitizeContext(context: any): string | undefined {
    if (context === undefined || context === null) return undefined;
    if (typeof context !== 'string') return undefined;
    
    const sanitized = context.trim().toLowerCase();
    
    // Only allow alphanumeric, dashes, and underscores
    if (!/^[a-z0-9_-]+$/.test(sanitized)) {
      return undefined;
    }
    
    return sanitized;
  }

  private sanitizeMetadata(metadata: any): any {
    if (!metadata || typeof metadata !== 'object') return undefined;
    
    const result: any = {};
    
    if (typeof metadata.source === 'string') {
      result.source = metadata.source.trim();
    }
    
    if (typeof metadata.contentType === 'string') {
      result.contentType = metadata.contentType.trim();
    }
    
    if (typeof metadata.language === 'string') {
      result.language = metadata.language.trim();
    }
    
    if (metadata.createdAt instanceof Date || typeof metadata.createdAt === 'string') {
      result.createdAt = new Date(metadata.createdAt);
    }
    
    if (Array.isArray(metadata.tags)) {
      result.tags = metadata.tags
        .filter((tag: any) => typeof tag === 'string')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0);
    }
    
    return Object.keys(result).length > 0 ? result : undefined;
  }

  private validateWeight(weight: any, fieldName: string, defaultValue: number): number {
    if (weight === undefined || weight === null) {
      return defaultValue;
    }

    const numWeight = parseFloat(weight);
    if (isNaN(numWeight)) {
      throw new Error(`${fieldName} must be a number`);
    }

    if (numWeight < 1.0 || numWeight > 5.0) {
      throw new Error(`${fieldName} must be between 1.0 and 5.0`);
    }

    return numWeight;
  }

  private validateBoolean(value: any, fieldName: string): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true') return true;
      if (lowerValue === 'false') return false;
    }

    throw new Error(`${fieldName} must be a boolean`);
  }

  private validateStringArrayItem(item: any, arrayName: string): string {
    if (typeof item !== 'string') {
      throw new Error(`All items in ${arrayName} must be strings`);
    }
    
    const sanitized = item.trim();
    if (sanitized.length === 0) {
      throw new Error(`Empty strings not allowed in ${arrayName}`);
    }
    
    if (sanitized.length > 100) {
      throw new Error(`Items in ${arrayName} must be 100 characters or less`);
    }
    
    return sanitized;
  }

  private validateRiskTolerances(tolerances: Record<string, any>): Record<string, string> {
    const validRiskLevels = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];
    const result: Record<string, string> = {};

    for (const [category, level] of Object.entries(tolerances)) {
      if (typeof category !== 'string' || category.trim().length === 0) {
        throw new Error('Risk tolerance category names must be non-empty strings');
      }

      if (typeof level !== 'string' || !validRiskLevels.includes(level)) {
        throw new Error(`Invalid risk level '${level}' for category '${category}'. Valid levels: ${validRiskLevels.join(', ')}`);
      }

      result[category.trim()] = level;
    }

    return result;
  }
}