import { CheckSafetyUseCase, CheckSafetyInput } from './CheckSafetyUseCase.js';
import { CheckComplianceUseCase, CheckComplianceInput } from './CheckComplianceUseCase.js';
import {
  CombinedEvaluationResult,
  EvaluationWeights,
} from '../../domain/value-objects/EvaluationResult.js';
import { SafetyEvaluation } from '../../domain/entities/SafetyEvaluation.js';
import { ComplianceEvaluation } from '../../domain/entities/ComplianceEvaluation.js';

/**
 * Use case for performing combined safety and compliance evaluation
 */
export class CombinedEvaluationUseCase {
  constructor(
    private readonly safetyUseCase: CheckSafetyUseCase,
    private readonly complianceUseCase: CheckComplianceUseCase
  ) {}

  async execute(input: CombinedEvaluationInput): Promise<CombinedEvaluationResult> {
    const { content, context, includeSafety = true, includeBrand = true, weights } = input;

    // Prepare evaluation inputs
    const safetyInput: CheckSafetyInput = { content, context, metadata: input.metadata };
    const complianceInput: CheckComplianceInput = { content, context, metadata: input.metadata };

    // Perform evaluations concurrently based on flags
    const [safetyResult, complianceResult] = await Promise.all([
      includeSafety ? this.safetyUseCase.execute(safetyInput) : Promise.resolve(undefined),
      includeBrand ? this.complianceUseCase.execute(complianceInput) : Promise.resolve(undefined),
    ]);

    // Calculate combined score if both evaluations were performed
    let combinedScore: number | undefined;
    if (safetyResult && complianceResult && weights) {
      combinedScore = this.calculateCombinedScore(
        safetyResult,
        complianceResult.evaluation,
        weights
      );
    }

    return new CombinedEvaluationResult(
      safetyResult,
      complianceResult?.evaluation,
      combinedScore,
      weights
    );
  }

  private calculateCombinedScore(
    safetyEvaluation: SafetyEvaluation,
    complianceEvaluation: ComplianceEvaluation,
    weights: EvaluationWeights
  ): number {
    // Convert safety risk level to numeric score (inverse - higher is better)
    const safetyLevels: Record<string, number> = {
      NONE: 100,
      LOW: 80,
      MEDIUM: 60,
      HIGH: 30,
      VERY_HIGH: 0,
    };

    const safetyScore = safetyLevels[safetyEvaluation.overallRisk] || 50;
    const brandScore = complianceEvaluation.complianceScore;

    // Apply weights and calculate weighted average
    const weightedSafetyScore = safetyScore * weights.safety;
    const weightedBrandScore = brandScore * weights.brand;
    const totalWeight = weights.safety + weights.brand;

    return Math.round((weightedSafetyScore + weightedBrandScore) / totalWeight);
  }
}

/**
 * Input for the CombinedEvaluation use case
 */
export interface CombinedEvaluationInput {
  readonly content: string;
  readonly context?: string;
  readonly includeSafety?: boolean;
  readonly includeBrand?: boolean;
  readonly weights?: EvaluationWeights;
  readonly metadata?: {
    readonly source?: string;
    readonly contentType?: string;
    readonly language?: string;
    readonly createdAt?: Date;
    readonly tags?: readonly string[];
  };
}
