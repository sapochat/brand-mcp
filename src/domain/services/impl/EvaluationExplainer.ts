/**
 * Evaluation explanation system for providing clear, actionable feedback
 */
export class EvaluationExplainer {
  private contextualizer: ExplanationContextualizer;
  private simplifier: ExplanationSimplifier;

  constructor() {
    this.contextualizer = new ExplanationContextualizer();
    this.simplifier = new ExplanationSimplifier();
  }

  /**
   * Generate comprehensive evaluation explanation
   */
  async explainEvaluation(
    evaluation: EvaluationResult,
    options?: ExplanationOptions
  ): Promise<EvaluationExplanation> {
    const startTime = Date.now();

    // Generate core explanation
    const coreExplanation = this.generateCoreExplanation(evaluation);

    // Add contextual details
    const contextualExplanation = await this.contextualizer.contextualize(
      coreExplanation,
      evaluation.context
    );

    // Generate detailed breakdowns
    const breakdowns = this.generateBreakdowns(evaluation);

    // Create visual elements
    const visuals = this.generateVisuals(evaluation);

    // Generate actionable insights
    const insights = this.generateActionableInsights(evaluation);

    // Create examples
    const examples = this.generateExamples(evaluation);

    // Build narrative
    const narrative = this.buildNarrative(
      contextualExplanation,
      breakdowns,
      insights
    );

    // Simplify if requested
    const finalExplanation = options?.simplify ? 
      await this.simplifier.simplify(narrative, options.targetAudience) : 
      narrative;

    return {
      summary: finalExplanation.summary,
      narrative: finalExplanation.narrative,
      breakdowns,
      visuals,
      insights,
      examples,
      metadata: {
        generationTime: Date.now() - startTime,
        complexity: this.assessComplexity(finalExplanation),
        readingTime: this.estimateReadingTime(finalExplanation),
        confidence: evaluation.confidence || 0
      }
    };
  }

  /**
   * Generate core explanation
   */
  private generateCoreExplanation(evaluation: EvaluationResult): CoreExplanation {
    const scoreInterpretation = this.interpretScore(evaluation.score);
    const complianceStatus = this.interpretCompliance(evaluation.isCompliant);
    const riskAssessment = this.interpretRisk(evaluation.riskLevel);

    return {
      headline: this.generateHeadline(evaluation),
      scoreExplanation: {
        value: evaluation.score,
        interpretation: scoreInterpretation.description,
        category: scoreInterpretation.category,
        comparison: scoreInterpretation.comparison
      },
      complianceExplanation: {
        status: evaluation.isCompliant,
        interpretation: complianceStatus.description,
        impact: complianceStatus.impact
      },
      riskExplanation: {
        level: evaluation.riskLevel,
        interpretation: riskAssessment.description,
        implications: riskAssessment.implications
      },
      keyFactors: this.identifyKeyFactors(evaluation)
    };
  }

  /**
   * Generate headline
   */
  private generateHeadline(evaluation: EvaluationResult): string {
    if (evaluation.isCompliant && evaluation.score >= 90) {
      return "Excellent! Content meets all brand safety requirements";
    } else if (evaluation.isCompliant && evaluation.score >= 70) {
      return "Good - Content is compliant with minor improvements possible";
    } else if (!evaluation.isCompliant && evaluation.score >= 50) {
      return "Attention needed - Content has compliance issues to address";
    } else if (!evaluation.isCompliant && evaluation.score < 50) {
      return "Significant issues - Content requires substantial revision";
    }
    return "Content evaluation complete - Review required";
  }

  /**
   * Interpret score
   */
  private interpretScore(score: number): ScoreInterpretation {
    let category: string;
    let description: string;
    let comparison: string;

    if (score >= 90) {
      category = 'excellent';
      description = 'Content demonstrates exceptional adherence to brand safety standards';
      comparison = 'Top 5% of evaluated content';
    } else if (score >= 80) {
      category = 'very_good';
      description = 'Content shows strong compliance with minor areas for improvement';
      comparison = 'Top 20% of evaluated content';
    } else if (score >= 70) {
      category = 'good';
      description = 'Content meets baseline requirements with some optimization opportunities';
      comparison = 'Above average performance';
    } else if (score >= 60) {
      category = 'fair';
      description = 'Content has moderate compliance with several areas needing attention';
      comparison = 'Average performance';
    } else if (score >= 50) {
      category = 'poor';
      description = 'Content shows significant gaps in compliance';
      comparison = 'Below average performance';
    } else {
      category = 'very_poor';
      description = 'Content has critical compliance failures';
      comparison = 'Bottom 20% of evaluated content';
    }

    return { category, description, comparison };
  }

  /**
   * Interpret compliance
   */
  private interpretCompliance(isCompliant: boolean): ComplianceInterpretation {
    if (isCompliant) {
      return {
        description: 'Content meets all mandatory compliance requirements',
        impact: 'Safe for publication and distribution'
      };
    } else {
      return {
        description: 'Content violates one or more compliance requirements',
        impact: 'Must be revised before publication to avoid potential issues'
      };
    }
  }

  /**
   * Interpret risk
   */
  private interpretRisk(riskLevel: string): RiskInterpretation {
    const interpretations: Record<string, RiskInterpretation> = {
      'NONE': {
        description: 'No significant risks identified',
        implications: ['Content is safe for all audiences', 'No brand safety concerns']
      },
      'LOW': {
        description: 'Minor risks that are easily manageable',
        implications: ['Minimal chance of negative impact', 'Simple adjustments may enhance safety']
      },
      'MEDIUM': {
        description: 'Moderate risks requiring attention',
        implications: ['Could impact brand perception', 'Recommended to address before publication']
      },
      'HIGH': {
        description: 'Significant risks that must be addressed',
        implications: ['High probability of negative impact', 'Essential to revise before publication']
      },
      'VERY_HIGH': {
        description: 'Critical risks with severe potential impact',
        implications: ['Will damage brand reputation', 'Content must not be published without major revision']
      }
    };

    return interpretations[riskLevel] || interpretations['MEDIUM'];
  }

  /**
   * Identify key factors
   */
  private identifyKeyFactors(evaluation: EvaluationResult): KeyFactor[] {
    const factors: KeyFactor[] = [];

    // Positive factors
    if (evaluation.score >= 80) {
      factors.push({
        type: 'positive',
        name: 'Strong Compliance',
        impact: 'high',
        description: 'Content demonstrates strong adherence to guidelines'
      });
    }

    // Negative factors
    if (evaluation.violations && evaluation.violations.length > 0) {
      const criticalViolations = evaluation.violations.filter(v => v.severity === 'critical');
      if (criticalViolations.length > 0) {
        factors.push({
          type: 'negative',
          name: 'Critical Violations',
          impact: 'critical',
          description: `${criticalViolations.length} critical issue(s) must be resolved`
        });
      }
    }

    // Neutral factors
    if (evaluation.warnings && evaluation.warnings.length > 0) {
      factors.push({
        type: 'neutral',
        name: 'Warnings Present',
        impact: 'medium',
        description: `${evaluation.warnings.length} warning(s) to consider`
      });
    }

    return factors;
  }

  /**
   * Generate detailed breakdowns
   */
  private generateBreakdowns(evaluation: EvaluationResult): DetailedBreakdown[] {
    const breakdowns: DetailedBreakdown[] = [];

    // Score breakdown
    if (evaluation.scoreBreakdown) {
      breakdowns.push({
        category: 'Score Components',
        items: Object.entries(evaluation.scoreBreakdown).map(([component, value]) => ({
          name: this.humanizeComponentName(component),
          value: value as number,
          weight: this.getComponentWeight(component),
          status: this.getComponentStatus(value as number)
        }))
      });
    }

    // Violation breakdown
    if (evaluation.violations && evaluation.violations.length > 0) {
      const violationsByType = this.groupViolationsByType(evaluation.violations);
      breakdowns.push({
        category: 'Violations by Type',
        items: violationsByType.map(group => ({
          name: group.type,
          value: group.count,
          weight: group.severity === 'critical' ? 3 : group.severity === 'high' ? 2 : 1,
          status: 'negative'
        }))
      });
    }

    // Category performance
    if (evaluation.categoryScores) {
      breakdowns.push({
        category: 'Category Performance',
        items: Object.entries(evaluation.categoryScores).map(([category, score]) => ({
          name: this.humanizeComponentName(category),
          value: score as number,
          weight: 1,
          status: this.getComponentStatus(score as number)
        }))
      });
    }

    return breakdowns;
  }

  /**
   * Generate visuals
   */
  private generateVisuals(evaluation: EvaluationResult): ExplanationVisual[] {
    const visuals: ExplanationVisual[] = [];

    // Score gauge
    visuals.push({
      type: 'gauge',
      title: 'Overall Score',
      data: {
        value: evaluation.score,
        min: 0,
        max: 100,
        zones: [
          { min: 0, max: 50, color: 'red', label: 'Poor' },
          { min: 50, max: 70, color: 'orange', label: 'Fair' },
          { min: 70, max: 90, color: 'yellow', label: 'Good' },
          { min: 90, max: 100, color: 'green', label: 'Excellent' }
        ]
      }
    });

    // Risk radar
    if (evaluation.riskBreakdown) {
      visuals.push({
        type: 'radar',
        title: 'Risk Profile',
        data: {
          categories: Object.keys(evaluation.riskBreakdown),
          values: Object.values(evaluation.riskBreakdown),
          maxValue: 100
        }
      });
    }

    // Trend line
    if (evaluation.historicalScores && evaluation.historicalScores.length > 1) {
      visuals.push({
        type: 'line',
        title: 'Score Trend',
        data: {
          points: evaluation.historicalScores.map((score, index) => ({
            x: index,
            y: score,
            label: `Evaluation ${index + 1}`
          }))
        }
      });
    }

    return visuals;
  }

  /**
   * Generate actionable insights
   */
  private generateActionableInsights(evaluation: EvaluationResult): ActionableInsight[] {
    const insights: ActionableInsight[] = [];

    // High priority insights
    if (evaluation.violations) {
      const criticalViolations = evaluation.violations.filter(v => v.severity === 'critical');
      if (criticalViolations.length > 0) {
        insights.push({
          priority: 'high',
          category: 'compliance',
          title: 'Critical Compliance Issues',
          description: `${criticalViolations.length} critical violation(s) detected`,
          action: 'Address these violations immediately before publication',
          impact: 'Resolving will prevent potential legal or reputational issues',
          effort: 'high',
          timeframe: 'immediate'
        });
      }
    }

    // Medium priority insights
    if (evaluation.score >= 70 && evaluation.score < 90) {
      insights.push({
        priority: 'medium',
        category: 'optimization',
        title: 'Performance Optimization',
        description: 'Content can be improved to achieve excellent rating',
        action: 'Review and implement suggested improvements',
        impact: `Could increase score by ${Math.min(20, 90 - evaluation.score)} points`,
        effort: 'medium',
        timeframe: '1-2 days'
      });
    }

    // Low priority insights
    if (evaluation.recommendations && evaluation.recommendations.length > 0) {
      insights.push({
        priority: 'low',
        category: 'enhancement',
        title: 'Enhancement Opportunities',
        description: `${evaluation.recommendations.length} enhancement(s) available`,
        action: 'Consider implementing for best-in-class content',
        impact: 'Marginal improvements to overall quality',
        effort: 'low',
        timeframe: 'as time permits'
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Generate examples
   */
  private generateExamples(evaluation: EvaluationResult): ExplanationExample[] {
    const examples: ExplanationExample[] = [];

    // Violation examples
    if (evaluation.violations && evaluation.violations.length > 0) {
      const sampleViolation = evaluation.violations[0];
      examples.push({
        type: 'violation',
        title: 'Example Violation',
        before: sampleViolation.evidence?.original || 'Original content',
        after: sampleViolation.evidence?.suggested || 'Suggested improvement',
        explanation: sampleViolation.description,
        impact: `Fixing this would improve score by approximately ${Math.round(100 / evaluation.violations.length)} points`
      });
    }

    // Success examples
    if (evaluation.successes && evaluation.successes.length > 0) {
      examples.push({
        type: 'success',
        title: 'What You Did Right',
        before: '',
        after: evaluation.successes[0],
        explanation: 'This demonstrates good practice',
        impact: 'Continue this approach in future content'
      });
    }

    return examples;
  }

  /**
   * Build narrative explanation
   */
  private buildNarrative(
    core: CoreExplanation,
    _breakdowns: DetailedBreakdown[],
    insights: ActionableInsight[]
  ): NarrativeExplanation {
    const sections: NarrativeSection[] = [];

    // Opening section
    sections.push({
      type: 'opening',
      content: core.headline,
      emphasis: 'high'
    });

    // Score section
    sections.push({
      type: 'score',
      content: `Your content scored ${core.scoreExplanation.value} out of 100. ${core.scoreExplanation.interpretation}`,
      emphasis: 'medium'
    });

    // Compliance section
    sections.push({
      type: 'compliance',
      content: core.complianceExplanation.interpretation,
      emphasis: core.complianceExplanation.status ? 'low' : 'high'
    });

    // Risk section
    sections.push({
      type: 'risk',
      content: `Risk Assessment: ${core.riskExplanation.interpretation}`,
      emphasis: core.riskExplanation.level === 'HIGH' || core.riskExplanation.level === 'VERY_HIGH' ? 'high' : 'low'
    });

    // Key factors section
    if (core.keyFactors.length > 0) {
      const factorText = core.keyFactors
        .map(f => `${f.name}: ${f.description}`)
        .join('. ');
      sections.push({
        type: 'factors',
        content: `Key Factors: ${factorText}`,
        emphasis: 'medium'
      });
    }

    // Actions section
    if (insights.length > 0) {
      const priorityInsight = insights[0];
      sections.push({
        type: 'action',
        content: `Next Step: ${priorityInsight.action}`,
        emphasis: 'high'
      });
    }

    // Build summary
    const summary = sections
      .filter(s => s.emphasis === 'high')
      .map(s => s.content)
      .join(' ');

    return {
      summary,
      sections,
      narrative: sections.map(s => s.content).join('\n\n'),
      readingLevel: 'professional',
      tone: 'informative'
    };
  }

  /**
   * Helper methods
   */
  private humanizeComponentName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private getComponentWeight(component: string): number {
    const weights: Record<string, number> = {
      compliance: 3,
      safety: 2.5,
      brand: 2,
      quality: 1.5,
      other: 1
    };
    return weights[component] || 1;
  }

  private getComponentStatus(score: number): string {
    if (score >= 90) return 'positive';
    if (score >= 70) return 'neutral';
    return 'negative';
  }

  private groupViolationsByType(violations: any[]): any[] {
    const grouped = new Map<string, any>();
    
    violations.forEach(v => {
      const key = v.type || 'other';
      if (!grouped.has(key)) {
        grouped.set(key, {
          type: key,
          count: 0,
          severity: v.severity
        });
      }
      grouped.get(key)!.count++;
    });

    return Array.from(grouped.values());
  }

  private assessComplexity(explanation: NarrativeExplanation): string {
    const wordCount = explanation.narrative.split(/\s+/).length;
    if (wordCount < 100) return 'simple';
    if (wordCount < 300) return 'moderate';
    return 'complex';
  }

  private estimateReadingTime(explanation: NarrativeExplanation): number {
    const wordsPerMinute = 200;
    const wordCount = explanation.narrative.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }
}

/**
 * Explanation Template Engine
 */
// @ts-ignore - Unused class for future implementation
class ExplanationTemplateEngine {
  private templates: Map<string, string> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    this.templates.set('violation_critical', 
      'Critical Issue: {description}. This must be resolved immediately as it {impact}.');
    
    this.templates.set('violation_high',
      'Important Issue: {description}. Addressing this will {impact}.');
    
    this.templates.set('improvement',
      'Suggestion: {description}. This would {impact}.');
  }

  renderTemplate(templateId: string, data: Record<string, any>): string {
    let template = this.templates.get(templateId) || '';
    
    Object.entries(data).forEach(([key, value]) => {
      template = template.replace(`{${key}}`, String(value));
    });
    
    return template;
  }
}

/**
 * Explanation Contextualizer
 */
class ExplanationContextualizer {
  async contextualize(
    explanation: CoreExplanation,
    context?: any
  ): Promise<CoreExplanation> {
    if (!context) return explanation;

    // Add industry-specific context
    if (context.industry) {
      explanation.headline = `${explanation.headline} (${context.industry} standards)`;
    }

    // Add audience context
    if (context.audience) {
      explanation.scoreExplanation.interpretation += ` for ${context.audience} audience`;
    }

    return explanation;
  }
}

/**
 * Explanation Simplifier
 */
class ExplanationSimplifier {
  async simplify(
    narrative: NarrativeExplanation,
    targetAudience?: string
  ): Promise<NarrativeExplanation> {
    // Simplify language based on audience
    if (targetAudience === 'non-technical') {
      narrative.narrative = narrative.narrative
        .replace(/compliance/gi, 'rules')
        .replace(/violation/gi, 'problem')
        .replace(/mitigate/gi, 'reduce');
    }

    narrative.readingLevel = targetAudience || 'professional';
    
    return narrative;
  }
}

/**
 * Types and interfaces
 */
export interface EvaluationResult {
  score: number;
  isCompliant: boolean;
  riskLevel: string;
  violations?: any[];
  warnings?: any[];
  recommendations?: string[];
  scoreBreakdown?: Record<string, number>;
  categoryScores?: Record<string, number>;
  riskBreakdown?: Record<string, number>;
  historicalScores?: number[];
  successes?: string[];
  confidence?: number;
  context?: any;
}

export interface ExplanationOptions {
  simplify?: boolean;
  targetAudience?: string;
  includeVisuals?: boolean;
  includeExamples?: boolean;
  verbosity?: 'minimal' | 'standard' | 'detailed';
}

export interface EvaluationExplanation {
  summary: string;
  narrative: string;
  breakdowns: DetailedBreakdown[];
  visuals: ExplanationVisual[];
  insights: ActionableInsight[];
  examples: ExplanationExample[];
  metadata: {
    generationTime: number;
    complexity: string;
    readingTime: number;
    confidence: number;
  };
}

export interface CoreExplanation {
  headline: string;
  scoreExplanation: {
    value: number;
    interpretation: string;
    category: string;
    comparison: string;
  };
  complianceExplanation: {
    status: boolean;
    interpretation: string;
    impact: string;
  };
  riskExplanation: {
    level: string;
    interpretation: string;
    implications: string[];
  };
  keyFactors: KeyFactor[];
}

export interface KeyFactor {
  type: 'positive' | 'negative' | 'neutral';
  name: string;
  impact: string;
  description: string;
}

export interface DetailedBreakdown {
  category: string;
  items: Array<{
    name: string;
    value: number;
    weight: number;
    status: string;
  }>;
}

export interface ExplanationVisual {
  type: 'gauge' | 'radar' | 'bar' | 'line' | 'pie';
  title: string;
  data: any;
}

export interface ActionableInsight {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  action: string;
  impact: string;
  effort: string;
  timeframe: string;
}

export interface ExplanationExample {
  type: 'violation' | 'success' | 'improvement';
  title: string;
  before: string;
  after: string;
  explanation: string;
  impact: string;
}

export interface NarrativeExplanation {
  summary: string;
  sections: NarrativeSection[];
  narrative: string;
  readingLevel: string;
  tone: string;
}

export interface NarrativeSection {
  type: string;
  content: string;
  emphasis: 'high' | 'medium' | 'low';
}

export interface ScoreInterpretation {
  category: string;
  description: string;
  comparison: string;
}

export interface ComplianceInterpretation {
  description: string;
  impact: string;
}

export interface RiskInterpretation {
  description: string;
  implications: string[];
}