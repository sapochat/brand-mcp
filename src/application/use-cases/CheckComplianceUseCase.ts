import { BrandComplianceService } from '../../domain/services/BrandComplianceService.js';
import { BrandSchemaRepository } from '../../domain/repositories/BrandSchemaRepository.js';
import { Content } from '../../domain/entities/Content.js';
import { Brand } from '../../domain/entities/Brand.js';
import { ComplianceEvaluation } from '../../domain/entities/ComplianceEvaluation.js';
import { CacheRepository } from '../../domain/repositories/CacheRepository.js';

/**
 * Use case for checking brand compliance
 */
export class CheckComplianceUseCase {
  constructor(
    private readonly complianceService: BrandComplianceService,
    private readonly brandRepository: BrandSchemaRepository,
    private readonly cacheRepository?: CacheRepository<ComplianceEvaluation>
  ) {}

  async execute(input: CheckComplianceInput): Promise<CheckComplianceResult> {
    // Load brand schema
    const brandSchema = await this.brandRepository.loadBrandSchema();
    const brand = new Brand(
      brandSchema.name,
      brandSchema.description,
      brandSchema.toneGuidelines,
      brandSchema.voiceGuidelines,
      brandSchema.terminologyGuidelines,
      brandSchema.visualIdentity,
      brandSchema.contextualAdjustments
    );

    // Create domain entities
    const content = new Content(input.content, input.context, input.metadata);

    // Check cache first if available
    if (this.cacheRepository) {
      const cacheKey = this.generateCacheKey(content, brand, input.context);
      const cached = await this.cacheRepository.get(cacheKey);
      if (cached) {
        return { evaluation: cached, brandName: brand.name };
      }
    }

    // Perform compliance evaluation
    const evaluation = this.complianceService.checkCompliance(content, brand, input.context);

    // Cache result if cache is available
    if (this.cacheRepository) {
      const cacheKey = this.generateCacheKey(content, brand, input.context);
      await this.cacheRepository.set(cacheKey, evaluation, 1800); // 30 minutes TTL
    }

    return { evaluation, brandName: brand.name };
  }

  private generateCacheKey(content: Content, brand: Brand, context?: string): string {
    // Generate cache key based on content, brand, and context
    const baseString = `compliance:${content.text}:${brand.name}:${context || 'general'}`;
    return Buffer.from(baseString).toString('base64').substring(0, 32);
  }
}

/**
 * Input for the CheckCompliance use case
 */
export interface CheckComplianceInput {
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

/**
 * Result from the CheckCompliance use case
 */
export interface CheckComplianceResult {
  readonly evaluation: ComplianceEvaluation;
  readonly brandName: string;
}
