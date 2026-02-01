/**
 * Confidence scoring system for evaluation results
 */
export class ConfidenceScorer {
  private scoringFactors: Map<string, ScoringFactor>;
  private weightProfiles: Map<string, WeightProfile>;
  private calibrationHistory: CalibrationData[];

  constructor() {
    this.scoringFactors = new Map();
    this.weightProfiles = new Map();
    this.calibrationHistory = [];
    this.initializeScoringFactors();
    this.initializeWeightProfiles();
  }

  /**
   * Initialize scoring factors
   */
  private initializeScoringFactors(): void {
    // Data quality factors
    this.scoringFactors.set('content_length', {
      name: 'Content Length',
      category: 'data_quality',
      evaluate: (context: ScoringContext) => {
        const length = context.content.length;
        if (length < 50) return { score: 30, reason: 'Very short content' };
        if (length < 200) return { score: 60, reason: 'Short content' };
        if (length < 1000) return { score: 85, reason: 'Adequate content length' };
        if (length < 5000) return { score: 95, reason: 'Good content length' };
        return { score: 100, reason: 'Comprehensive content' };
      },
      weight: 1.5,
    });

    this.scoringFactors.set('language_clarity', {
      name: 'Language Clarity',
      category: 'data_quality',
      evaluate: (context: ScoringContext) => {
        const { languageDetection } = context;
        if (!languageDetection) return { score: 50, reason: 'No language detection' };

        if (languageDetection.confidence > 90) {
          return { score: 100, reason: 'Clear language identification' };
        } else if (languageDetection.confidence > 70) {
          return { score: 80, reason: 'Good language clarity' };
        } else if (languageDetection.confidence > 50) {
          return { score: 60, reason: 'Mixed language signals' };
        }
        return { score: 40, reason: 'Unclear language' };
      },
      weight: 1.2,
    });

    this.scoringFactors.set('context_completeness', {
      name: 'Context Completeness',
      category: 'data_quality',
      evaluate: (context: ScoringContext) => {
        let score = 100;
        const missing: string[] = [];

        if (!context.metadata?.channel) {
          score -= 15;
          missing.push('channel');
        }
        if (!context.metadata?.audience) {
          score -= 15;
          missing.push('audience');
        }
        if (!context.metadata?.purpose) {
          score -= 10;
          missing.push('purpose');
        }
        if (!context.metadata?.industry) {
          score -= 10;
          missing.push('industry');
        }

        return {
          score: Math.max(50, score),
          reason:
            missing.length > 0 ? `Missing context: ${missing.join(', ')}` : 'Complete context',
        };
      },
      weight: 1.0,
    });

    // Analysis depth factors
    this.scoringFactors.set('pattern_matches', {
      name: 'Pattern Match Quality',
      category: 'analysis_depth',
      evaluate: (context: ScoringContext) => {
        if (!context.patterns) return { score: 50, reason: 'No pattern analysis' };

        const { patterns } = context;
        const highConfidenceMatches = patterns.filter((p) => p.confidence > 80).length;
        const totalMatches = patterns.length;

        if (totalMatches === 0) {
          return { score: 100, reason: 'No concerning patterns found' };
        }

        const ratio = highConfidenceMatches / totalMatches;
        return {
          score: Math.round(ratio * 100),
          reason: `${highConfidenceMatches}/${totalMatches} high confidence patterns`,
        };
      },
      weight: 2.0,
    });

    this.scoringFactors.set('rule_coverage', {
      name: 'Rule Coverage',
      category: 'analysis_depth',
      evaluate: (context: ScoringContext) => {
        if (!context.rulesApplied || !context.totalRules) {
          return { score: 50, reason: 'Rule coverage unknown' };
        }

        const coverage = (context.rulesApplied / context.totalRules) * 100;

        if (coverage >= 90) return { score: 100, reason: 'Comprehensive rule coverage' };
        if (coverage >= 70) return { score: 85, reason: 'Good rule coverage' };
        if (coverage >= 50) return { score: 70, reason: 'Moderate rule coverage' };
        return { score: 50, reason: 'Limited rule coverage' };
      },
      weight: 1.8,
    });

    this.scoringFactors.set('multi_analysis_agreement', {
      name: 'Multi-Analysis Agreement',
      category: 'analysis_depth',
      evaluate: (context: ScoringContext) => {
        if (!context.multipleAnalyses) {
          return { score: 70, reason: 'Single analysis only' };
        }

        const { analyses } = context.multipleAnalyses;
        if (analyses.length < 2) {
          return { score: 70, reason: 'Insufficient analyses for comparison' };
        }

        // Calculate agreement score
        const scores = analyses.map((a) => a.score);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance =
          scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev < 5) return { score: 100, reason: 'Strong agreement between analyses' };
        if (stdDev < 10) return { score: 85, reason: 'Good agreement between analyses' };
        if (stdDev < 20) return { score: 70, reason: 'Moderate agreement between analyses' };
        return { score: 50, reason: 'Low agreement between analyses' };
      },
      weight: 1.5,
    });

    // Consistency factors
    this.scoringFactors.set('temporal_consistency', {
      name: 'Temporal Consistency',
      category: 'consistency',
      evaluate: (context: ScoringContext) => {
        if (!context.historicalScores || context.historicalScores.length < 2) {
          return { score: 70, reason: 'No historical data for comparison' };
        }

        const recentScores = context.historicalScores.slice(-5);
        const variance = this.calculateVariance(recentScores);

        if (variance < 5) return { score: 100, reason: 'Highly consistent over time' };
        if (variance < 10) return { score: 85, reason: 'Good temporal consistency' };
        if (variance < 20) return { score: 70, reason: 'Moderate temporal consistency' };
        return { score: 50, reason: 'Inconsistent results over time' };
      },
      weight: 1.3,
    });

    this.scoringFactors.set('cross_validator_consistency', {
      name: 'Cross-Validator Consistency',
      category: 'consistency',
      evaluate: (context: ScoringContext) => {
        if (!context.validatorResults || context.validatorResults.length < 2) {
          return { score: 70, reason: 'Single validator result' };
        }

        const scores = context.validatorResults.map((v) => v.score);
        const variance = this.calculateVariance(scores);

        if (variance < 10) return { score: 100, reason: 'Validators strongly agree' };
        if (variance < 20) return { score: 85, reason: 'Good validator agreement' };
        if (variance < 30) return { score: 70, reason: 'Moderate validator agreement' };
        return { score: 50, reason: 'Validators disagree significantly' };
      },
      weight: 1.4,
    });

    // Evidence strength factors
    this.scoringFactors.set('evidence_quality', {
      name: 'Evidence Quality',
      category: 'evidence',
      evaluate: (context: ScoringContext) => {
        if (!context.violations || context.violations.length === 0) {
          return { score: 100, reason: 'No violations to validate' };
        }

        let qualityScore = 0;
        let totalWeight = 0;

        context.violations.forEach((violation) => {
          const weight =
            violation.severity === 'critical' ? 3 : violation.severity === 'high' ? 2 : 1;

          const evidenceScore =
            violation.evidence && violation.evidence.length > 0
              ? 100
              : violation.position
                ? 80
                : violation.description
                  ? 60
                  : 30;

          qualityScore += evidenceScore * weight;
          totalWeight += weight;
        });

        const finalScore = totalWeight > 0 ? qualityScore / totalWeight : 70;

        return {
          score: Math.round(finalScore),
          reason: `Evidence quality: ${Math.round(finalScore)}%`,
        };
      },
      weight: 2.0,
    });

    this.scoringFactors.set('citation_strength', {
      name: 'Citation Strength',
      category: 'evidence',
      evaluate: (context: ScoringContext) => {
        if (!context.citations) {
          return { score: 60, reason: 'No citations provided' };
        }

        const { regulations, guidelines, policies } = context.citations;
        let score = 50;

        if (regulations && regulations.length > 0) score += 20;
        if (guidelines && guidelines.length > 0) score += 15;
        if (policies && policies.length > 0) score += 15;

        return {
          score: Math.min(100, score),
          reason: `${(regulations?.length || 0) + (guidelines?.length || 0) + (policies?.length || 0)} citations`,
        };
      },
      weight: 1.2,
    });
  }

  /**
   * Initialize weight profiles
   */
  private initializeWeightProfiles(): void {
    this.weightProfiles.set('balanced', {
      name: 'Balanced',
      weights: {
        data_quality: 1.0,
        analysis_depth: 1.0,
        consistency: 1.0,
        evidence: 1.0,
      },
    });

    this.weightProfiles.set('high_accuracy', {
      name: 'High Accuracy',
      weights: {
        data_quality: 1.5,
        analysis_depth: 2.0,
        consistency: 1.2,
        evidence: 1.8,
      },
    });

    this.weightProfiles.set('quick_assessment', {
      name: 'Quick Assessment',
      weights: {
        data_quality: 0.8,
        analysis_depth: 0.6,
        consistency: 0.5,
        evidence: 1.0,
      },
    });

    this.weightProfiles.set('regulatory_focus', {
      name: 'Regulatory Focus',
      weights: {
        data_quality: 1.0,
        analysis_depth: 1.5,
        consistency: 1.0,
        evidence: 2.5,
      },
    });
  }

  /**
   * Calculate confidence score
   */
  async calculateConfidence(
    context: ScoringContext,
    profile: string = 'balanced'
  ): Promise<ConfidenceResult> {
    const startTime = Date.now();
    const factorResults: FactorResult[] = [];
    const categoryScores: Map<string, number> = new Map();
    const categoryWeights: Map<string, number> = new Map();

    // Get weight profile
    const defaultProfile: WeightProfile = {
      name: 'Balanced',
      weights: { data_quality: 1.0, analysis_depth: 1.0, consistency: 1.0, evidence: 1.0 },
    };
    const weightProfile =
      this.weightProfiles.get(profile) ?? this.weightProfiles.get('balanced') ?? defaultProfile;

    // Evaluate each factor
    for (const [factorId, factor] of this.scoringFactors) {
      const result = factor.evaluate(context);
      const categoryWeight = weightProfile.weights[factor.category] || 1.0;

      factorResults.push({
        factorId,
        factorName: factor.name,
        category: factor.category,
        score: result.score,
        weight: factor.weight * categoryWeight,
        reason: result.reason,
      });

      // Aggregate by category
      const currentScore = categoryScores.get(factor.category) || 0;
      const currentWeight = categoryWeights.get(factor.category) || 0;

      categoryScores.set(factor.category, currentScore + result.score * factor.weight);
      categoryWeights.set(factor.category, currentWeight + factor.weight);
    }

    // Calculate category averages
    const categoryResults: CategoryScore[] = [];
    for (const [category, totalScore] of categoryScores) {
      const totalWeight = categoryWeights.get(category) || 1;
      categoryResults.push({
        category,
        score: Math.round(totalScore / totalWeight),
        weight: weightProfile.weights[category] || 1.0,
      });
    }

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallScore(factorResults);
    const adjustedConfidence = this.applyCalibration(overallConfidence, context);

    // Determine confidence level
    const level = this.getConfidenceLevel(adjustedConfidence);

    // Generate explanation
    const explanation = this.generateExplanation(
      factorResults,
      categoryResults,
      adjustedConfidence,
      level
    );

    // Record for calibration
    this.recordCalibration(context, adjustedConfidence);

    return {
      score: adjustedConfidence,
      level,
      factorResults,
      categoryScores: categoryResults,
      explanation,
      profile: weightProfile.name,
      calculationTime: Date.now() - startTime,
      calibrationApplied: adjustedConfidence !== overallConfidence,
      metadata: {
        factorsEvaluated: factorResults.length,
        profileUsed: profile,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Calculate overall score from factors
   */
  private calculateOverallScore(factors: FactorResult[]): number {
    const totalWeightedScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);

    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 50;
  }

  /**
   * Apply calibration based on historical data
   */
  private applyCalibration(score: number, context: ScoringContext): number {
    if (this.calibrationHistory.length < 10) {
      return score; // Not enough data for calibration
    }

    // Find similar contexts in history
    const similarContexts = this.findSimilarContexts(context);

    if (similarContexts.length === 0) {
      return score;
    }

    // Calculate adjustment based on historical accuracy
    const avgHistoricalScore =
      similarContexts.reduce((sum, c) => sum + c.predictedScore, 0) / similarContexts.length;
    const avgActualScore =
      similarContexts.reduce((sum, c) => sum + (c.actualScore || c.predictedScore), 0) /
      similarContexts.length;

    const adjustment = avgActualScore - avgHistoricalScore;
    const calibratedScore = score + adjustment * 0.3; // Apply 30% of the adjustment

    return Math.max(0, Math.min(100, Math.round(calibratedScore)));
  }

  /**
   * Find similar contexts in calibration history
   */
  private findSimilarContexts(context: ScoringContext): CalibrationData[] {
    return this.calibrationHistory
      .filter((data) => {
        // Simple similarity check - could be more sophisticated
        const contentLengthSimilar =
          Math.abs((data.context.content?.length || 0) - context.content.length) < 500;
        const sameIndustry = data.context.metadata?.industry === context.metadata?.industry;
        const sameChannel = data.context.metadata?.channel === context.metadata?.channel;

        return contentLengthSimilar && (sameIndustry || sameChannel);
      })
      .slice(-20); // Use last 20 similar contexts
  }

  /**
   * Get confidence level from score
   */
  private getConfidenceLevel(score: number): ConfidenceLevel {
    if (score >= 90) return 'very_high';
    if (score >= 75) return 'high';
    if (score >= 60) return 'moderate';
    if (score >= 40) return 'low';
    return 'very_low';
  }

  /**
   * Generate explanation for confidence score
   */
  private generateExplanation(
    factors: FactorResult[],
    categories: CategoryScore[],
    score: number,
    level: ConfidenceLevel
  ): ConfidenceExplanation {
    // Find strongest and weakest factors
    const sortedFactors = [...factors].sort((a, b) => b.score - a.score);
    const strengths = sortedFactors.slice(0, 3).map((f) => ({
      factor: f.factorName,
      reason: f.reason,
    }));

    const weaknesses = sortedFactors
      .slice(-3)
      .filter((f) => f.score < 70)
      .map((f) => ({
        factor: f.factorName,
        reason: f.reason,
      }));

    // Find best and worst categories
    const sortedCategories = [...categories].sort((a, b) => b.score - a.score);
    const bestCategory = sortedCategories[0];
    const worstCategory = sortedCategories[sortedCategories.length - 1];

    // Generate summary
    let summary = `Confidence level: ${level} (${score}%). `;

    if (level === 'very_high') {
      summary += 'The analysis shows strong reliability across all factors.';
    } else if (level === 'high') {
      summary += 'The analysis is reliable with minor areas of uncertainty.';
    } else if (level === 'moderate') {
      summary += 'The analysis has moderate reliability with some uncertainty.';
    } else if (level === 'low') {
      summary += 'The analysis has significant uncertainty in multiple areas.';
    } else {
      summary += 'The analysis has very high uncertainty and should be reviewed carefully.';
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (score < 70) {
      if (weaknesses.some((w) => w.factor.includes('Context'))) {
        recommendations.push('Provide more complete context information');
      }
      if (weaknesses.some((w) => w.factor.includes('Language'))) {
        recommendations.push('Ensure content is in a clearly identifiable language');
      }
      if (weaknesses.some((w) => w.factor.includes('Evidence'))) {
        recommendations.push('Include more specific evidence and citations');
      }
    }

    return {
      summary,
      strengths,
      weaknesses,
      bestCategory: {
        name: bestCategory.category,
        score: bestCategory.score,
      },
      worstCategory: {
        name: worstCategory.category,
        score: worstCategory.score,
      },
      recommendations,
    };
  }

  /**
   * Record calibration data
   */
  private recordCalibration(context: ScoringContext, predictedScore: number): void {
    this.calibrationHistory.push({
      timestamp: new Date(),
      context,
      predictedScore,
      actualScore: undefined, // Will be updated if actual outcome is known
    });

    // Keep only last 1000 records
    if (this.calibrationHistory.length > 1000) {
      this.calibrationHistory = this.calibrationHistory.slice(-1000);
    }
  }

  /**
   * Update calibration with actual outcome
   */
  updateCalibration(contextId: string, actualScore: number): void {
    const record = this.calibrationHistory.find(
      (c) => c.context.id === contextId && !c.actualScore
    );

    if (record) {
      record.actualScore = actualScore;
    }
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Get confidence statistics
   */
  getStatistics(): ConfidenceStatistics {
    const recentScores = this.calibrationHistory.slice(-100).map((c) => c.predictedScore);
    const withActual = this.calibrationHistory.filter((c) => c.actualScore !== undefined);

    let accuracy = 0;
    if (withActual.length > 0) {
      const errors = withActual.map((c) =>
        Math.abs(c.predictedScore - (c.actualScore ?? c.predictedScore))
      );
      const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
      accuracy = Math.max(0, 100 - avgError);
    }

    return {
      totalEvaluations: this.calibrationHistory.length,
      averageConfidence:
        recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0,
      confidenceVariance: this.calculateVariance(recentScores),
      calibrationAccuracy: accuracy,
      evaluationsWithOutcome: withActual.length,
    };
  }
}

/**
 * Types and interfaces
 */
export interface ScoringContext {
  id?: string;
  content: string;
  metadata?: {
    channel?: string;
    audience?: string;
    purpose?: string;
    industry?: string;
  };
  languageDetection?: {
    language: string;
    confidence: number;
  };
  patterns?: Array<{
    type: string;
    confidence: number;
  }>;
  rulesApplied?: number;
  totalRules?: number;
  violations?: Array<{
    severity: string;
    evidence?: string[];
    position?: { start: number; end: number };
    description?: string;
  }>;
  multipleAnalyses?: {
    analyses: Array<{ score: number }>;
  };
  historicalScores?: number[];
  validatorResults?: Array<{ score: number }>;
  citations?: {
    regulations?: string[];
    guidelines?: string[];
    policies?: string[];
  };
}

export interface ConfidenceResult {
  score: number;
  level: ConfidenceLevel;
  factorResults: FactorResult[];
  categoryScores: CategoryScore[];
  explanation: ConfidenceExplanation;
  profile: string;
  calculationTime: number;
  calibrationApplied: boolean;
  metadata: {
    factorsEvaluated: number;
    profileUsed: string;
    timestamp: Date;
  };
}

export interface FactorResult {
  factorId: string;
  factorName: string;
  category: string;
  score: number;
  weight: number;
  reason: string;
}

export interface CategoryScore {
  category: string;
  score: number;
  weight: number;
}

export interface ConfidenceExplanation {
  summary: string;
  strengths: Array<{
    factor: string;
    reason: string;
  }>;
  weaknesses: Array<{
    factor: string;
    reason: string;
  }>;
  bestCategory: {
    name: string;
    score: number;
  };
  worstCategory: {
    name: string;
    score: number;
  };
  recommendations: string[];
}

export interface ScoringFactor {
  name: string;
  category: string;
  evaluate: (context: ScoringContext) => {
    score: number;
    reason: string;
  };
  weight: number;
}

export interface WeightProfile {
  name: string;
  weights: Record<string, number>;
}

export interface CalibrationData {
  timestamp: Date;
  context: ScoringContext;
  predictedScore: number;
  actualScore?: number;
}

export interface ConfidenceStatistics {
  totalEvaluations: number;
  averageConfidence: number;
  confidenceVariance: number;
  calibrationAccuracy: number;
  evaluationsWithOutcome: number;
}

export type ConfidenceLevel = 'very_high' | 'high' | 'moderate' | 'low' | 'very_low';
