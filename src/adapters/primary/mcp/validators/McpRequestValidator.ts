import { CheckSafetyInput } from '../../../../application/use-cases/CheckSafetyUseCase.js';
import { CheckComplianceInput } from '../../../../application/use-cases/CheckComplianceUseCase.js';
import { CombinedEvaluationInput } from '../../../../application/use-cases/CombinedEvaluationUseCase.js';
import { UpdateConfigInput } from '../../../../application/use-cases/UpdateConfigUseCase.js';
import {
  BatchEvaluationInput,
  BatchItemMetadata,
} from '../../../../application/use-cases/BatchEvaluationUseCase.js';

/**
 * Type for raw MCP request arguments
 */
type RawArgs = Record<string, unknown> | undefined;

/**
 * Validates and sanitizes MCP requests
 */
export class McpRequestValidator {
  validateSafetyInput(args: RawArgs): CheckSafetyInput {
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments: expected object');
    }

    if (!args.content || typeof args.content !== 'string') {
      throw new Error('Content is required and must be a string');
    }

    if ((args.content as string).trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    if ((args.content as string).length > 10000) {
      throw new Error('Content too long (max 10000 characters)');
    }

    return {
      content: this.sanitizeContent(args.content as string),
      context: this.sanitizeContext(args.context),
      metadata: this.sanitizeMetadata(args.metadata),
    };
  }

  validateComplianceInput(args: RawArgs): CheckComplianceInput {
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments: expected object');
    }

    if (!args.content || typeof args.content !== 'string') {
      throw new Error('Content is required and must be a string');
    }

    if ((args.content as string).trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    if ((args.content as string).length > 10000) {
      throw new Error('Content too long (max 10000 characters)');
    }

    return {
      content: this.sanitizeContent(args.content as string),
      context: this.sanitizeContext(args.context),
      metadata: this.sanitizeMetadata(args.metadata),
    };
  }

  validateCombinedInput(args: RawArgs): CombinedEvaluationInput {
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments: expected object');
    }

    if (!args.content || typeof args.content !== 'string') {
      throw new Error('Content is required and must be a string');
    }

    if ((args.content as string).trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    if ((args.content as string).length > 10000) {
      throw new Error('Content too long (max 10000 characters)');
    }

    // Validate weights
    const brandWeight = this.validateWeight(args.brandWeight, 'brandWeight', 2.0);
    const safetyWeight = this.validateWeight(args.safetyWeight, 'safetyWeight', 1.0);

    // Validate boolean flags
    const includeSafety =
      args.includeSafety !== undefined
        ? this.validateBoolean(args.includeSafety, 'includeSafety')
        : true;
    const includeBrand =
      args.includeBrand !== undefined
        ? this.validateBoolean(args.includeBrand, 'includeBrand')
        : true;

    return {
      content: this.sanitizeContent(args.content as string),
      context: this.sanitizeContext(args.context),
      includeSafety,
      includeBrand,
      weights:
        brandWeight !== undefined && safetyWeight !== undefined
          ? {
              brand: brandWeight,
              safety: safetyWeight,
            }
          : undefined,
      metadata: this.sanitizeMetadata(args.metadata),
    };
  }

  validateBatchInput(args: RawArgs): BatchEvaluationInput {
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
    const validatedItems = (args.items as unknown[]).map((item: unknown, index: number) => {
      if (!item || typeof item !== 'object') {
        throw new Error(`Invalid item at index ${index}: expected object`);
      }

      const itemObj = item as Record<string, unknown>;

      if (!itemObj.content || typeof itemObj.content !== 'string') {
        throw new Error(
          `Invalid content at index ${index}: content is required and must be a string`
        );
      }

      if ((itemObj.content as string).trim().length === 0) {
        throw new Error(`Invalid content at index ${index}: content cannot be empty`);
      }

      return {
        id: itemObj.id ? String(itemObj.id) : undefined,
        content: this.sanitizeContent(itemObj.content as string),
        context: this.sanitizeContext(itemObj.context),
        metadata: this.sanitizeBatchMetadata(itemObj.metadata),
      };
    });

    // Validate evaluation type
    const validTypes = ['safety', 'compliance', 'combined'] as const;
    const evaluationType = args.evaluationType as string | undefined;
    if (evaluationType && !validTypes.includes(evaluationType as (typeof validTypes)[number])) {
      throw new Error(
        `Invalid evaluation type: ${evaluationType}. Must be one of: ${validTypes.join(', ')}`
      );
    }

    const typedEvalType = (evaluationType as 'safety' | 'compliance' | 'combined') || 'combined';

    return {
      items: validatedItems,
      evaluationType: typedEvalType,
      options: {
        includeSafety: args.includeSafety !== false,
        includeBrand: args.includeBrand !== false,
        weights: args.weights
          ? {
              safety: this.validateWeight(
                (args.weights as Record<string, unknown>).safety,
                'safety weight',
                1.0
              ),
              brand: this.validateWeight(
                (args.weights as Record<string, unknown>).brand,
                'brand weight',
                2.0
              ),
            }
          : undefined,
      },
    };
  }

  validateConfigInput(args: RawArgs): UpdateConfigInput {
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments: expected object');
    }

    const sensitiveKeywords =
      args.sensitiveKeywords !== undefined
        ? this.validateStringArray(args.sensitiveKeywords, 'sensitiveKeywords')
        : undefined;

    const allowedTopics =
      args.allowedTopics !== undefined
        ? this.validateStringArray(args.allowedTopics, 'allowedTopics')
        : undefined;

    const blockedTopics =
      args.blockedTopics !== undefined
        ? this.validateStringArray(args.blockedTopics, 'blockedTopics')
        : undefined;

    const riskTolerances =
      args.riskTolerances !== undefined
        ? this.validateRiskTolerances(args.riskTolerances as Record<string, unknown>)
        : undefined;

    return {
      sensitiveKeywords,
      allowedTopics,
      blockedTopics,
      riskTolerances,
    };
  }

  private validateStringArray(value: unknown, arrayName: string): readonly string[] {
    if (!Array.isArray(value)) {
      throw new Error(`${arrayName} must be an array`);
    }
    return (value as unknown[])
      .map((item: unknown) => this.validateStringArrayItem(item, arrayName))
      .filter((item: string) => item.length > 0);
  }

  private sanitizeContent(content: string): string {
    if (typeof content !== 'string') return '';

    // Remove potentially harmful control characters
    // eslint-disable-next-line no-control-regex
    const controlCharRegex = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
    return content.replace(controlCharRegex, '').trim();
  }

  private sanitizeContext(context: unknown): string | undefined {
    if (context === undefined || context === null) return undefined;
    if (typeof context !== 'string') return undefined;

    const sanitized = context.trim().toLowerCase();

    // Only allow alphanumeric, dashes, and underscores
    if (!/^[a-z0-9_-]+$/.test(sanitized)) {
      return undefined;
    }

    return sanitized;
  }

  private sanitizeMetadata(metadata: unknown):
    | {
        source?: string;
        contentType?: string;
        language?: string;
        createdAt?: Date;
        tags?: readonly string[];
      }
    | undefined {
    if (!metadata || typeof metadata !== 'object') return undefined;

    const metadataObj = metadata as Record<string, unknown>;
    const result: {
      source?: string;
      contentType?: string;
      language?: string;
      createdAt?: Date;
      tags?: string[];
    } = {};

    if (typeof metadataObj.source === 'string') {
      result.source = metadataObj.source.trim();
    }

    if (typeof metadataObj.contentType === 'string') {
      result.contentType = metadataObj.contentType.trim();
    }

    if (typeof metadataObj.language === 'string') {
      result.language = metadataObj.language.trim();
    }

    if (metadataObj.createdAt instanceof Date || typeof metadataObj.createdAt === 'string') {
      result.createdAt = new Date(metadataObj.createdAt as string | Date);
    }

    if (Array.isArray(metadataObj.tags)) {
      result.tags = (metadataObj.tags as unknown[])
        .filter((tag: unknown) => typeof tag === 'string')
        .map((tag: unknown) => (tag as string).trim())
        .filter((tag: string) => tag.length > 0);
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private sanitizeBatchMetadata(metadata: unknown): BatchItemMetadata | undefined {
    if (!metadata || typeof metadata !== 'object') return undefined;

    const metadataObj = metadata as Record<string, unknown>;
    const result: BatchItemMetadata = {};

    for (const [key, value] of Object.entries(metadataObj)) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        (result as Record<string, string | number | boolean | null>)[key] = value;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private validateWeight(weight: unknown, fieldName: string, defaultValue: number): number {
    if (weight === undefined || weight === null) {
      return defaultValue;
    }

    const numWeight = parseFloat(String(weight));
    if (isNaN(numWeight)) {
      throw new Error(`${fieldName} must be a number`);
    }

    if (numWeight < 1.0 || numWeight > 5.0) {
      throw new Error(`${fieldName} must be between 1.0 and 5.0`);
    }

    return numWeight;
  }

  private validateBoolean(value: unknown, fieldName: string): boolean {
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

  private validateStringArrayItem(item: unknown, arrayName: string): string {
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

  private validateRiskTolerances(tolerances: Record<string, unknown>): Record<string, string> {
    if (typeof tolerances !== 'object' || tolerances === null) {
      throw new Error('riskTolerances must be an object');
    }

    const validRiskLevels = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];
    const result: Record<string, string> = {};

    for (const [category, level] of Object.entries(tolerances)) {
      if (typeof category !== 'string' || category.trim().length === 0) {
        throw new Error('Risk tolerance category names must be non-empty strings');
      }

      if (typeof level !== 'string' || !validRiskLevels.includes(level)) {
        throw new Error(
          `Invalid risk level '${level}' for category '${category}'. Valid levels: ${validRiskLevels.join(', ')}`
        );
      }

      result[category.trim()] = level;
    }

    return result;
  }
}
