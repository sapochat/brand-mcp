import { SafetyEvaluationService, SafetyConfig } from '../../domain/services/SafetyEvaluationService.js';

/**
 * Use case for updating safety configuration
 */
export class UpdateConfigUseCase {
  constructor(
    private readonly safetyService: SafetyEvaluationService
  ) {}

  async execute(input: UpdateConfigInput): Promise<UpdateConfigResult> {
    try {
      // Validate input
      this.validateConfigInput(input);

      // Create partial config from input
      const configUpdate: any = {};

      if (input.sensitiveKeywords !== undefined) {
        configUpdate.sensitiveKeywords = [...input.sensitiveKeywords];
      }

      if (input.allowedTopics !== undefined) {
        configUpdate.allowedTopics = [...input.allowedTopics];
      }

      if (input.blockedTopics !== undefined) {
        configUpdate.blockedTopics = [...input.blockedTopics];
      }

      if (input.riskTolerances !== undefined) {
        configUpdate.riskTolerances = { ...input.riskTolerances };
      }

      // Update the service configuration
      this.safetyService.updateConfig(configUpdate);

      return {
        success: true,
        message: 'Brand safety configuration updated successfully',
        updatedFields: Object.keys(configUpdate)
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        updatedFields: []
      };
    }
  }

  private validateConfigInput(input: UpdateConfigInput): void {
    // Validate sensitive keywords
    if (input.sensitiveKeywords && input.sensitiveKeywords.some(k => !k || k.trim().length === 0)) {
      throw new Error('Sensitive keywords cannot be empty');
    }

    // Validate topics
    if (input.allowedTopics && input.allowedTopics.some(t => !t || t.trim().length === 0)) {
      throw new Error('Allowed topics cannot be empty');
    }

    if (input.blockedTopics && input.blockedTopics.some(t => !t || t.trim().length === 0)) {
      throw new Error('Blocked topics cannot be empty');
    }

    // Validate risk tolerances
    if (input.riskTolerances) {
      const validRiskLevels = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];
      for (const [category, level] of Object.entries(input.riskTolerances)) {
        if (!validRiskLevels.includes(level)) {
          throw new Error(`Invalid risk level '${level}' for category '${category}'`);
        }
      }
    }
  }
}

/**
 * Input for the UpdateConfig use case
 */
export interface UpdateConfigInput {
  readonly sensitiveKeywords?: readonly string[];
  readonly allowedTopics?: readonly string[];
  readonly blockedTopics?: readonly string[];
  readonly riskTolerances?: Record<string, string>;
}

/**
 * Result from the UpdateConfig use case
 */
export interface UpdateConfigResult {
  readonly success: boolean;
  readonly message: string;
  readonly updatedFields: readonly string[];
}