import { SafetyEvaluationService } from '../../domain/services/SafetyEvaluationService.js';
import { Content } from '../../domain/entities/Content.js';
import { SafetyEvaluation } from '../../domain/entities/SafetyEvaluation.js';
import { CacheRepository } from '../../domain/repositories/CacheRepository.js';

/**
 * Use case for checking content safety
 */
export class CheckSafetyUseCase {
  constructor(
    private readonly safetyService: SafetyEvaluationService,
    private readonly cacheRepository?: CacheRepository<SafetyEvaluation>
  ) {}

  async execute(input: CheckSafetyInput): Promise<SafetyEvaluation> {
    // Create domain entity
    const content = new Content(input.content, input.context, input.metadata);
    
    // Check cache first if available
    if (this.cacheRepository) {
      const cacheKey = this.generateCacheKey(content);
      const cached = await this.cacheRepository.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Perform evaluation
    const evaluation = await this.safetyService.evaluateContent(content);

    // Cache result if cache is available
    if (this.cacheRepository) {
      const cacheKey = this.generateCacheKey(content);
      await this.cacheRepository.set(cacheKey, evaluation, 3600); // 1 hour TTL
    }

    return evaluation;
  }

  private generateCacheKey(content: Content): string {
    // Simple hash-like key generation
    const baseString = `safety:${content.text}:${content.context || 'general'}`;
    return Buffer.from(baseString).toString('base64').substring(0, 32);
  }
}

/**
 * Input for the CheckSafety use case
 */
export interface CheckSafetyInput {
  readonly content: string;
  readonly context?: string;
  readonly metadata?: {
    readonly source?: string;
    readonly contentType?: string;
    readonly language?: string;
    readonly createdAt?: Date;
    readonly tags?: readonly string[];
  };
}