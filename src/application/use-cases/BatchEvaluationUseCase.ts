import { CheckSafetyUseCase } from './CheckSafetyUseCase.js';
import { CheckComplianceUseCase } from './CheckComplianceUseCase.js';
import { CombinedEvaluationUseCase } from './CombinedEvaluationUseCase.js';
import { SafetyEvaluation } from '../../domain/entities/SafetyEvaluation.js';
import { ComplianceEvaluation } from '../../domain/entities/ComplianceEvaluation.js';
import { CombinedEvaluationResult } from '../../domain/value-objects/EvaluationResult.js';

/**
 * Result types from different evaluation use cases
 */
type EvaluationResult = SafetyEvaluation | ComplianceEvaluation | CombinedEvaluationResult;

/**
 * Issue structure for extracting common issues
 */
interface EvaluationIssue {
  readonly type: string;
  readonly description: string;
}

/**
 * Result with issues for type narrowing
 */
interface ResultWithIssues {
  readonly issues: readonly EvaluationIssue[];
}

/**
 * Use case for batch evaluation of multiple content pieces
 */
export class BatchEvaluationUseCase {
  private readonly MAX_BATCH_SIZE = 100;
  private readonly MAX_CONCURRENT = 10;

  constructor(
    private readonly safetyUseCase: CheckSafetyUseCase,
    private readonly complianceUseCase: CheckComplianceUseCase,
    private readonly combinedUseCase: CombinedEvaluationUseCase
  ) {}

  /**
   * Execute batch evaluation
   */
  async execute(input: BatchEvaluationInput): Promise<BatchEvaluationResult> {
    // Validate batch size
    if (input.items.length === 0) {
      throw new Error('Batch cannot be empty');
    }

    if (input.items.length > this.MAX_BATCH_SIZE) {
      throw new Error(`Batch size exceeds maximum of ${this.MAX_BATCH_SIZE} items`);
    }

    const startTime = Date.now();
    const results: BatchItemResult[] = [];
    const errors: BatchItemError[] = [];

    // Process items in chunks for better performance
    const chunks = this.chunkArray(input.items, this.MAX_CONCURRENT);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (item, index) => {
        const itemId = item.id || `item_${index}`;

        try {
          // Determine evaluation type
          let result: EvaluationResult;

          switch (input.evaluationType) {
            case 'safety':
              result = await this.safetyUseCase.execute({
                content: item.content,
                context: item.context,
                metadata: item.metadata,
              });
              break;

            case 'compliance': {
              const complianceResult = await this.complianceUseCase.execute({
                content: item.content,
                context: item.context,
                metadata: item.metadata,
              });
              result = complianceResult.evaluation;
              break;
            }

            case 'combined':
            default:
              result = await this.combinedUseCase.execute({
                content: item.content,
                context: item.context,
                includeSafety: input.options?.includeSafety !== false,
                includeBrand: input.options?.includeBrand !== false,
                weights: input.options?.weights,
                metadata: item.metadata,
              });
              break;
          }

          results.push({
            id: itemId,
            status: 'success',
            result,
          });
        } catch (error) {
          errors.push({
            id: itemId,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            content: item.content.substring(0, 50) + '...',
          });
        }
      });

      // Wait for current chunk to complete
      await Promise.all(chunkPromises);
    }

    const endTime = Date.now();
    const processingTimeMs = endTime - startTime;

    // Generate summary statistics
    const summary = this.generateSummary(results, errors, processingTimeMs);

    return {
      batchId: this.generateBatchId(),
      timestamp: new Date(),
      evaluationType: input.evaluationType || 'combined',
      totalItems: input.items.length,
      successCount: results.length,
      errorCount: errors.length,
      processingTimeMs,
      results,
      errors,
      summary,
    };
  }

  /**
   * Generate batch summary statistics
   */
  private generateSummary(
    results: BatchItemResult[],
    errors: BatchItemError[],
    processingTimeMs: number
  ): BatchSummary {
    const totalProcessed = results.length + errors.length;
    const successRate = totalProcessed > 0 ? (results.length / totalProcessed) * 100 : 0;

    // Calculate aggregate statistics based on results
    let avgComplianceScore = 0;
    let highRiskCount = 0;
    let compliantCount = 0;

    if (results.length > 0) {
      const complianceScores: number[] = [];

      results.forEach((item) => {
        if (item.result) {
          // Handle different result types
          if ('complianceScore' in item.result) {
            complianceScores.push(item.result.complianceScore);
            if (item.result.isCompliant) compliantCount++;
          }

          if ('overallRisk' in item.result) {
            if (['HIGH', 'VERY_HIGH'].includes(item.result.overallRisk)) {
              highRiskCount++;
            }
          }

          if ('combinedScore' in item.result && item.result.combinedScore !== undefined) {
            complianceScores.push(item.result.combinedScore);
            if (item.result.isCompliant) compliantCount++;
          }
        }
      });

      if (complianceScores.length > 0) {
        avgComplianceScore = complianceScores.reduce((a, b) => a + b, 0) / complianceScores.length;
      }
    }

    return {
      successRate,
      averageProcessingTimeMs: processingTimeMs / totalProcessed,
      averageComplianceScore: avgComplianceScore,
      highRiskCount,
      compliantCount,
      commonIssues: this.extractCommonIssues(results),
    };
  }

  /**
   * Type guard to check if result has issues
   */
  private hasIssues(result: EvaluationResult): result is EvaluationResult & ResultWithIssues {
    return 'issues' in result && Array.isArray(result.issues);
  }

  /**
   * Extract common issues from results
   */
  private extractCommonIssues(results: BatchItemResult[]): CommonIssue[] {
    const issueFrequency = new Map<string, number>();

    results.forEach((item) => {
      if (item.result && this.hasIssues(item.result)) {
        item.result.issues.forEach((issue: EvaluationIssue) => {
          const key = `${issue.type}:${issue.description}`;
          issueFrequency.set(key, (issueFrequency.get(key) || 0) + 1);
        });
      }
    });

    // Convert to array and sort by frequency
    const commonIssues: CommonIssue[] = [];
    issueFrequency.forEach((count, key) => {
      const [type, description] = key.split(':');
      commonIssues.push({ type, description, frequency: count });
    });

    return commonIssues.sort((a, b) => b.frequency - a.frequency).slice(0, 5); // Top 5 issues
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * Input for batch evaluation
 */
export interface BatchEvaluationInput {
  readonly items: BatchItem[];
  readonly evaluationType?: 'safety' | 'compliance' | 'combined';
  readonly options?: {
    readonly includeSafety?: boolean;
    readonly includeBrand?: boolean;
    readonly weights?: {
      readonly safety: number;
      readonly brand: number;
    };
  };
}

/**
 * Metadata type for batch items
 */
export interface BatchItemMetadata {
  readonly [key: string]: string | number | boolean | null | undefined;
}

/**
 * Single item in batch
 */
export interface BatchItem {
  readonly id?: string;
  readonly content: string;
  readonly context?: string;
  readonly metadata?: BatchItemMetadata;
}

/**
 * Result of batch evaluation
 */
export interface BatchEvaluationResult {
  readonly batchId: string;
  readonly timestamp: Date;
  readonly evaluationType: string;
  readonly totalItems: number;
  readonly successCount: number;
  readonly errorCount: number;
  readonly processingTimeMs: number;
  readonly results: BatchItemResult[];
  readonly errors: BatchItemError[];
  readonly summary: BatchSummary;
}

/**
 * Result for single batch item
 */
export interface BatchItemResult {
  readonly id: string;
  readonly status: 'success';
  readonly result: EvaluationResult;
}

/**
 * Error for single batch item
 */
export interface BatchItemError {
  readonly id: string;
  readonly status: 'error';
  readonly error: string;
  readonly content: string; // Truncated content for reference
}

/**
 * Summary statistics for batch
 */
export interface BatchSummary {
  readonly successRate: number;
  readonly averageProcessingTimeMs: number;
  readonly averageComplianceScore: number;
  readonly highRiskCount: number;
  readonly compliantCount: number;
  readonly commonIssues: CommonIssue[];
}

/**
 * Common issue found in batch
 */
export interface CommonIssue {
  readonly type: string;
  readonly description: string;
  readonly frequency: number;
}
