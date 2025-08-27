import {
  EvaluationResult,
  ContentRecommendation,
  RecommendationPriority,
  ActionableInsight,
  ImprovementStrategy,
  RecommendationContext,
  RecommendationConfig
} from '../../../types/brandSafety';

interface RecommendationRule {
  id: string;
  name: string;
  condition: (result: EvaluationResult) => boolean;
  generate: (result: EvaluationResult) => ActionableInsight;
  priority: RecommendationPriority;
  categories: string[];
}

interface ImpactAssessment {
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  timeframe: 'immediate' | 'short-term' | 'long-term';
  dependencies: string[];
}

export class RecommendationEngine {
  private rules: Map<string, RecommendationRule> = new Map();
  private strategies: Map<string, ImprovementStrategy> = new Map();
  private priorityWeights: Record<RecommendationPriority, number> = {
    critical: 1.0,
    high: 0.75,
    medium: 0.5,
    low: 0.25
  };

  constructor() {
    this.initializeRules();
    this.initializeStrategies();
  }

  private initializeRules(): void {
    // Safety-related rules
    this.addRule({
      id: 'toxic-content',
      name: 'Toxic Content Remediation',
      condition: (result) => result.safety.toxicityScore > 0.7,
      generate: (result) => ({
        title: 'Remove or Revise Toxic Content',
        description: `Content shows high toxicity (${(result.safety.toxicityScore * 100).toFixed(1)}%). Review and revise language to be more constructive.`,
        actionItems: [
          'Identify specific toxic phrases or sections',
          'Replace with neutral or positive alternatives',
          'Consider the tone and emotional impact',
          'Review against community guidelines'
        ],
        expectedImpact: 'Significant improvement in safety score and user engagement',
        priority: 'critical' as RecommendationPriority,
        category: 'safety',
        metrics: {
          currentValue: result.safety.toxicityScore,
          targetValue: 0.2,
          improvement: ((result.safety.toxicityScore - 0.2) / result.safety.toxicityScore * 100).toFixed(1) + '%'
        }
      }),
      priority: 'critical' as RecommendationPriority,
      categories: ['safety', 'content-quality']
    });

    this.addRule({
      id: 'bias-detection',
      name: 'Bias Mitigation',
      condition: (result) => result.safety.biasScore > 0.6,
      generate: (result) => ({
        title: 'Address Potential Bias',
        description: `Content shows potential bias (${(result.safety.biasScore * 100).toFixed(1)}%). Ensure balanced and inclusive representation.`,
        actionItems: [
          'Review language for implicit bias',
          'Include diverse perspectives',
          'Use inclusive terminology',
          'Validate facts and sources'
        ],
        expectedImpact: 'Improved inclusivity and broader audience appeal',
        priority: 'high' as RecommendationPriority,
        category: 'safety',
        metrics: {
          currentValue: result.safety.biasScore,
          targetValue: 0.3,
          improvement: ((result.safety.biasScore - 0.3) / result.safety.biasScore * 100).toFixed(1) + '%'
        }
      }),
      priority: 'high' as RecommendationPriority,
      categories: ['safety', 'inclusivity']
    });

    // Compliance-related rules
    this.addRule({
      id: 'brand-alignment',
      name: 'Brand Alignment Optimization',
      condition: (result) => result.compliance.brandAlignmentScore < 0.7,
      generate: (result) => ({
        title: 'Improve Brand Alignment',
        description: `Brand alignment is below optimal (${(result.compliance.brandAlignmentScore * 100).toFixed(1)}%). Strengthen brand voice and values.`,
        actionItems: [
          'Review brand guidelines and tone of voice',
          'Incorporate key brand messaging',
          'Ensure visual consistency',
          'Align with brand values and mission'
        ],
        expectedImpact: 'Stronger brand recognition and consistency',
        priority: 'medium' as RecommendationPriority,
        category: 'compliance',
        metrics: {
          currentValue: result.compliance.brandAlignmentScore,
          targetValue: 0.85,
          improvement: ((0.85 - result.compliance.brandAlignmentScore) / result.compliance.brandAlignmentScore * 100).toFixed(1) + '%'
        }
      }),
      priority: 'medium' as RecommendationPriority,
      categories: ['compliance', 'brand']
    });

    this.addRule({
      id: 'regulatory-compliance',
      name: 'Regulatory Compliance Check',
      condition: (result) => result.compliance.regulatoryCompliance < 1.0,
      generate: (result) => ({
        title: 'Ensure Full Regulatory Compliance',
        description: `Regulatory compliance needs attention (${(result.compliance.regulatoryCompliance * 100).toFixed(1)}%). Review legal requirements.`,
        actionItems: [
          'Add required disclaimers or disclosures',
          'Verify claims and statements',
          'Include necessary legal language',
          'Document compliance measures'
        ],
        expectedImpact: 'Full regulatory compliance and reduced legal risk',
        priority: 'critical' as RecommendationPriority,
        category: 'compliance',
        metrics: {
          currentValue: result.compliance.regulatoryCompliance,
          targetValue: 1.0,
          improvement: 'Required for compliance'
        }
      }),
      priority: 'critical' as RecommendationPriority,
      categories: ['compliance', 'legal']
    });

    // Quality improvement rules
    this.addRule({
      id: 'readability',
      name: 'Readability Enhancement',
      condition: (result) => {
        const avgScore = (result.safety.overallScore + result.compliance.overallScore) / 2;
        return avgScore < 0.8 && result.metadata?.wordCount > 100;
      },
      generate: (result) => ({
        title: 'Enhance Content Readability',
        description: 'Content could benefit from improved clarity and structure.',
        actionItems: [
          'Break up long paragraphs',
          'Use clear headings and subheadings',
          'Simplify complex sentences',
          'Add bullet points or lists where appropriate'
        ],
        expectedImpact: 'Better user engagement and comprehension',
        priority: 'low' as RecommendationPriority,
        category: 'quality',
        metrics: {
          currentValue: (result.safety.overallScore + result.compliance.overallScore) / 2,
          targetValue: 0.85,
          improvement: 'Improved readability'
        }
      }),
      priority: 'low' as RecommendationPriority,
      categories: ['quality', 'ux']
    });
  }

  private initializeStrategies(): void {
    this.strategies.set('quick-wins', {
      id: 'quick-wins',
      name: 'Quick Wins Strategy',
      description: 'Focus on high-impact, low-effort improvements',
      filter: (insights) => insights.filter(i => 
        this.assessImpact(i).effort === 'low' && 
        this.assessImpact(i).impact !== 'low'
      ),
      prioritize: (insights) => this.prioritizeByImpactEffortRatio(insights)
    });

    this.strategies.set('safety-first', {
      id: 'safety-first',
      name: 'Safety First Strategy',
      description: 'Prioritize safety and risk mitigation',
      filter: (insights) => insights.filter(i => 
        i.category === 'safety' || i.priority === 'critical'
      ),
      prioritize: (insights) => this.prioritizeBySafety(insights)
    });

    this.strategies.set('compliance-focused', {
      id: 'compliance-focused',
      name: 'Compliance Focused Strategy',
      description: 'Ensure all regulatory and brand requirements are met',
      filter: (insights) => insights.filter(i => 
        i.category === 'compliance' || i.category === 'legal'
      ),
      prioritize: (insights) => this.prioritizeByCompliance(insights)
    });

    this.strategies.set('balanced', {
      id: 'balanced',
      name: 'Balanced Improvement Strategy',
      description: 'Balance all aspects for overall improvement',
      filter: (insights) => insights,
      prioritize: (insights) => this.prioritizeBalanced(insights)
    });
  }

  private addRule(rule: RecommendationRule): void {
    this.rules.set(rule.id, rule);
  }

  async generateRecommendations(
    result: EvaluationResult,
    context?: RecommendationContext,
    config?: RecommendationConfig
  ): Promise<ContentRecommendation> {
    const insights = this.generateInsights(result, context);
    const strategy = this.selectStrategy(context, config);
    const prioritized = this.applyStrategy(insights, strategy);
    const roadmap = this.createRoadmap(prioritized);

    return {
      summary: this.generateSummary(result, prioritized),
      insights: prioritized,
      priorityMatrix: this.createPriorityMatrix(prioritized),
      roadmap,
      estimatedImpact: this.estimateOverallImpact(prioritized, result),
      nextSteps: this.identifyNextSteps(prioritized),
      resources: this.suggestResources(prioritized)
    };
  }

  private generateInsights(
    result: EvaluationResult,
    context?: RecommendationContext
  ): ActionableInsight[] {
    const insights: ActionableInsight[] = [];

    for (const rule of this.rules.values()) {
      if (rule.condition(result)) {
        const insight = rule.generate(result);
        
        // Add context-specific adjustments
        if (context) {
          insight.context = {
            industry: context.industry,
            audience: context.audience,
            platform: context.platform,
            constraints: context.constraints
          };
        }

        insights.push(insight);
      }
    }

    // Add custom insights based on patterns
    insights.push(...this.detectPatterns(result));

    return insights;
  }

  private detectPatterns(result: EvaluationResult): ActionableInsight[] {
    const patterns: ActionableInsight[] = [];

    // Detect improvement trends
    if (result.safety.overallScore < 0.5 && result.compliance.overallScore > 0.8) {
      patterns.push({
        title: 'Safety-Compliance Imbalance',
        description: 'Strong compliance but weak safety scores indicate content may be too aggressive or controversial.',
        actionItems: [
          'Review content tone and messaging',
          'Consider audience sensitivities',
          'Balance brand expression with safety'
        ],
        expectedImpact: 'More balanced and acceptable content',
        priority: 'high',
        category: 'pattern'
      });
    }

    // Detect consistency issues
    const scoreVariance = Math.abs(result.safety.overallScore - result.compliance.overallScore);
    if (scoreVariance > 0.3) {
      patterns.push({
        title: 'Scoring Inconsistency',
        description: `Large variance (${(scoreVariance * 100).toFixed(1)}%) between safety and compliance scores.`,
        actionItems: [
          'Review evaluation criteria',
          'Ensure consistent standards',
          'Align safety and compliance goals'
        ],
        expectedImpact: 'More consistent evaluation results',
        priority: 'medium',
        category: 'consistency'
      });
    }

    return patterns;
  }

  private selectStrategy(
    context?: RecommendationContext,
    config?: RecommendationConfig
  ): ImprovementStrategy {
    if (config?.strategy) {
      return this.strategies.get(config.strategy) || this.strategies.get('balanced')!;
    }

    // Auto-select based on context
    if (context?.urgency === 'high') {
      return this.strategies.get('quick-wins')!;
    }

    if (context?.industry && ['healthcare', 'finance', 'legal'].includes(context.industry)) {
      return this.strategies.get('compliance-focused')!;
    }

    return this.strategies.get('balanced')!;
  }

  private applyStrategy(
    insights: ActionableInsight[],
    strategy: ImprovementStrategy
  ): ActionableInsight[] {
    const filtered = strategy.filter(insights);
    return strategy.prioritize(filtered);
  }

  private prioritizeByImpactEffortRatio(insights: ActionableInsight[]): ActionableInsight[] {
    return insights.sort((a, b) => {
      const aScore = this.calculateImpactEffortScore(a);
      const bScore = this.calculateImpactEffortScore(b);
      return bScore - aScore;
    });
  }

  private prioritizeBySafety(insights: ActionableInsight[]): ActionableInsight[] {
    return insights.sort((a, b) => {
      const aSafety = a.category === 'safety' ? 2 : 1;
      const bSafety = b.category === 'safety' ? 2 : 1;
      const aPriority = this.priorityWeights[a.priority];
      const bPriority = this.priorityWeights[b.priority];
      return (bSafety * bPriority) - (aSafety * aPriority);
    });
  }

  private prioritizeByCompliance(insights: ActionableInsight[]): ActionableInsight[] {
    return insights.sort((a, b) => {
      const aCompliance = ['compliance', 'legal'].includes(a.category) ? 2 : 1;
      const bCompliance = ['compliance', 'legal'].includes(b.category) ? 2 : 1;
      const aPriority = this.priorityWeights[a.priority];
      const bPriority = this.priorityWeights[b.priority];
      return (bCompliance * bPriority) - (aCompliance * aPriority);
    });
  }

  private prioritizeBalanced(insights: ActionableInsight[]): ActionableInsight[] {
    return insights.sort((a, b) => {
      const aPriority = this.priorityWeights[a.priority];
      const bPriority = this.priorityWeights[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Secondary sort by impact/effort ratio
      const aScore = this.calculateImpactEffortScore(a);
      const bScore = this.calculateImpactEffortScore(b);
      return bScore - aScore;
    });
  }

  private calculateImpactEffortScore(insight: ActionableInsight): number {
    const impact = this.assessImpact(insight);
    const impactScore = { low: 1, medium: 2, high: 3 }[impact.impact];
    const effortScore = { low: 3, medium: 2, high: 1 }[impact.effort];
    return (impactScore * effortScore) * this.priorityWeights[insight.priority];
  }

  private assessImpact(insight: ActionableInsight): ImpactAssessment {
    // Simplified impact assessment based on priority and category
    const effortMap: Record<string, ImpactAssessment['effort']> = {
      safety: 'medium',
      compliance: 'high',
      brand: 'medium',
      quality: 'low',
      pattern: 'low',
      consistency: 'low'
    };

    const impactMap: Record<RecommendationPriority, ImpactAssessment['impact']> = {
      critical: 'high',
      high: 'high',
      medium: 'medium',
      low: 'low'
    };

    const timeframeMap: Record<RecommendationPriority, ImpactAssessment['timeframe']> = {
      critical: 'immediate',
      high: 'short-term',
      medium: 'short-term',
      low: 'long-term'
    };

    return {
      effort: effortMap[insight.category] || 'medium',
      impact: impactMap[insight.priority],
      timeframe: timeframeMap[insight.priority],
      dependencies: []
    };
  }

  private createPriorityMatrix(insights: ActionableInsight[]): any {
    const matrix = {
      urgent: {
        important: [] as ActionableInsight[],
        notImportant: [] as ActionableInsight[]
      },
      notUrgent: {
        important: [] as ActionableInsight[],
        notImportant: [] as ActionableInsight[]
      }
    };

    for (const insight of insights) {
      const impact = this.assessImpact(insight);
      const urgent = impact.timeframe === 'immediate' || insight.priority === 'critical';
      const important = impact.impact === 'high' || insight.priority === 'high';

      if (urgent && important) {
        matrix.urgent.important.push(insight);
      } else if (urgent && !important) {
        matrix.urgent.notImportant.push(insight);
      } else if (!urgent && important) {
        matrix.notUrgent.important.push(insight);
      } else {
        matrix.notUrgent.notImportant.push(insight);
      }
    }

    return matrix;
  }

  private createRoadmap(insights: ActionableInsight[]): any {
    const phases = {
      immediate: [] as ActionableInsight[],
      shortTerm: [] as ActionableInsight[],
      longTerm: [] as ActionableInsight[]
    };

    for (const insight of insights) {
      const impact = this.assessImpact(insight);
      
      switch (impact.timeframe) {
        case 'immediate':
          phases.immediate.push(insight);
          break;
        case 'short-term':
          phases.shortTerm.push(insight);
          break;
        case 'long-term':
          phases.longTerm.push(insight);
          break;
      }
    }

    return {
      phases,
      milestones: this.identifyMilestones(phases),
      timeline: this.estimateTimeline(phases),
      dependencies: this.mapDependencies(insights)
    };
  }

  private identifyMilestones(phases: any): any[] {
    const milestones = [];

    if (phases.immediate.length > 0) {
      milestones.push({
        name: 'Critical Issues Resolution',
        target: '1-2 days',
        items: phases.immediate.length,
        priority: 'critical'
      });
    }

    if (phases.shortTerm.length > 0) {
      milestones.push({
        name: 'Core Improvements',
        target: '1-2 weeks',
        items: phases.shortTerm.length,
        priority: 'high'
      });
    }

    if (phases.longTerm.length > 0) {
      milestones.push({
        name: 'Optimization & Enhancement',
        target: '1-3 months',
        items: phases.longTerm.length,
        priority: 'medium'
      });
    }

    return milestones;
  }

  private estimateTimeline(phases: any): any {
    let totalDays = 0;

    // Estimate based on number and complexity of items
    totalDays += phases.immediate.length * 0.5; // Half day per immediate item
    totalDays += phases.shortTerm.length * 2; // 2 days per short-term item
    totalDays += phases.longTerm.length * 5; // 5 days per long-term item

    return {
      totalEstimatedDays: Math.ceil(totalDays),
      breakdown: {
        immediate: Math.ceil(phases.immediate.length * 0.5),
        shortTerm: phases.shortTerm.length * 2,
        longTerm: phases.longTerm.length * 5
      }
    };
  }

  private mapDependencies(insights: ActionableInsight[]): any[] {
    const dependencies = [];

    // Safety must come before compliance
    const safetyInsights = insights.filter(i => i.category === 'safety');
    const complianceInsights = insights.filter(i => i.category === 'compliance');

    if (safetyInsights.length > 0 && complianceInsights.length > 0) {
      dependencies.push({
        prerequisite: 'Safety improvements',
        dependent: 'Compliance updates',
        reason: 'Safety issues must be resolved before compliance can be properly assessed'
      });
    }

    return dependencies;
  }

  private generateSummary(result: EvaluationResult, insights: ActionableInsight[]): string {
    const criticalCount = insights.filter(i => i.priority === 'critical').length;
    const highCount = insights.filter(i => i.priority === 'high').length;
    const overallScore = (result.safety.overallScore + result.compliance.overallScore) / 2;

    let summary = `Content evaluation score: ${(overallScore * 100).toFixed(1)}%. `;
    
    if (criticalCount > 0) {
      summary += `Found ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} requiring immediate attention. `;
    }
    
    if (highCount > 0) {
      summary += `${highCount} high-priority improvement${highCount > 1 ? 's' : ''} recommended. `;
    }

    const totalRecommendations = insights.length;
    summary += `Total of ${totalRecommendations} recommendation${totalRecommendations > 1 ? 's' : ''} generated.`;

    return summary;
  }

  private estimateOverallImpact(
    insights: ActionableInsight[],
    currentResult: EvaluationResult
  ): any {
    let potentialSafetyImprovement = 0;
    let potentialComplianceImprovement = 0;

    for (const insight of insights) {
      if (insight.metrics) {
        const improvement = parseFloat(insight.metrics.improvement?.replace('%', '') || '0') / 100;
        
        if (insight.category === 'safety') {
          potentialSafetyImprovement += improvement * this.priorityWeights[insight.priority];
        } else if (insight.category === 'compliance') {
          potentialComplianceImprovement += improvement * this.priorityWeights[insight.priority];
        }
      }
    }

    const currentOverall = (currentResult.safety.overallScore + currentResult.compliance.overallScore) / 2;
    const estimatedImprovement = (potentialSafetyImprovement + potentialComplianceImprovement) / 2;
    const projectedScore = Math.min(1, currentOverall + estimatedImprovement);

    return {
      current: currentOverall,
      projected: projectedScore,
      improvement: projectedScore - currentOverall,
      percentageGain: ((projectedScore - currentOverall) / currentOverall * 100).toFixed(1) + '%',
      confidence: this.calculateConfidenceInEstimate(insights)
    };
  }

  private calculateConfidenceInEstimate(insights: ActionableInsight[]): string {
    const hasMetrics = insights.filter(i => i.metrics).length;
    const ratio = hasMetrics / insights.length;

    if (ratio > 0.8) return 'high';
    if (ratio > 0.5) return 'medium';
    return 'low';
  }

  private identifyNextSteps(insights: ActionableInsight[]): string[] {
    const steps: string[] = [];
    const immediate = insights.filter(i => 
      this.assessImpact(i).timeframe === 'immediate'
    );

    if (immediate.length > 0) {
      steps.push(`Address ${immediate.length} critical issue${immediate.length > 1 ? 's' : ''} immediately`);
      
      // Add first 3 specific actions
      for (let i = 0; i < Math.min(3, immediate.length); i++) {
        if (immediate[i].actionItems && immediate[i].actionItems.length > 0) {
          steps.push(`→ ${immediate[i].actionItems[0]}`);
        }
      }
    }

    // Add general next steps
    const hasCompliance = insights.some(i => i.category === 'compliance');
    if (hasCompliance) {
      steps.push('Review and update compliance documentation');
    }

    const hasSafety = insights.some(i => i.category === 'safety');
    if (hasSafety) {
      steps.push('Conduct safety review with stakeholders');
    }

    return steps;
  }

  private suggestResources(insights: ActionableInsight[]): any[] {
    const resources = [];
    const categories = new Set(insights.map(i => i.category));

    if (categories.has('safety')) {
      resources.push({
        type: 'guide',
        title: 'Content Safety Best Practices',
        url: '#safety-guide',
        relevance: 'high'
      });
    }

    if (categories.has('compliance')) {
      resources.push({
        type: 'checklist',
        title: 'Compliance Requirements Checklist',
        url: '#compliance-checklist',
        relevance: 'high'
      });
    }

    if (categories.has('brand')) {
      resources.push({
        type: 'guidelines',
        title: 'Brand Voice and Tone Guidelines',
        url: '#brand-guidelines',
        relevance: 'medium'
      });
    }

    resources.push({
      type: 'tool',
      title: 'Content Evaluation Dashboard',
      url: '#dashboard',
      relevance: 'medium'
    });

    return resources;
  }

  // Advanced recommendation methods

  async generateComparativeRecommendations(
    results: EvaluationResult[],
    context?: RecommendationContext
  ): Promise<any> {
    const comparisons = this.compareResults(results);
    const trends = this.identifyTrends(results);
    const commonIssues = this.findCommonIssues(results);

    return {
      comparisons,
      trends,
      commonIssues,
      recommendations: await this.generateBulkRecommendations(results, commonIssues, context)
    };
  }

  private compareResults(results: EvaluationResult[]): any {
    if (results.length < 2) return null;

    const scores = results.map(r => ({
      safety: r.safety.overallScore,
      compliance: r.compliance.overallScore,
      overall: (r.safety.overallScore + r.compliance.overallScore) / 2
    }));

    return {
      best: Math.max(...scores.map(s => s.overall)),
      worst: Math.min(...scores.map(s => s.overall)),
      average: scores.reduce((sum, s) => sum + s.overall, 0) / scores.length,
      variance: this.calculateVariance(scores.map(s => s.overall)),
      distribution: this.getDistribution(scores)
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private getDistribution(scores: any[]): any {
    const ranges = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0
    };

    for (const score of scores) {
      if (score.overall >= 0.9) ranges.excellent++;
      else if (score.overall >= 0.7) ranges.good++;
      else if (score.overall >= 0.5) ranges.fair++;
      else ranges.poor++;
    }

    return ranges;
  }

  private identifyTrends(results: EvaluationResult[]): any {
    if (results.length < 3) return null;

    const trends = {
      safety: this.calculateTrend(results.map(r => r.safety.overallScore)),
      compliance: this.calculateTrend(results.map(r => r.compliance.overallScore)),
      overall: this.calculateTrend(results.map(r => 
        (r.safety.overallScore + r.compliance.overallScore) / 2
      ))
    };

    return {
      ...trends,
      interpretation: this.interpretTrends(trends)
    };
  }

  private calculateTrend(values: number[]): string {
    if (values.length < 2) return 'insufficient-data';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;

    if (Math.abs(difference) < 0.05) return 'stable';
    if (difference > 0) return 'improving';
    return 'declining';
  }

  private interpretTrends(trends: any): string {
    if (trends.overall === 'improving') {
      return 'Content quality is showing positive improvement over time';
    } else if (trends.overall === 'declining') {
      return 'Content quality appears to be declining - review recent changes';
    } else {
      return 'Content quality remains stable';
    }
  }

  private findCommonIssues(results: EvaluationResult[]): any[] {
    const issueFrequency = new Map<string, number>();

    for (const result of results) {
      for (const rule of this.rules.values()) {
        if (rule.condition(result)) {
          const count = issueFrequency.get(rule.id) || 0;
          issueFrequency.set(rule.id, count + 1);
        }
      }
    }

    const commonIssues = [];
    const threshold = results.length * 0.5; // Issue appears in >50% of results

    for (const [ruleId, frequency] of issueFrequency.entries()) {
      if (frequency >= threshold) {
        const rule = this.rules.get(ruleId);
        if (rule) {
          commonIssues.push({
            rule: rule.name,
            frequency,
            percentage: (frequency / results.length * 100).toFixed(1) + '%',
            priority: rule.priority
          });
        }
      }
    }

    return commonIssues.sort((a, b) => b.frequency - a.frequency);
  }

  private async generateBulkRecommendations(
    results: EvaluationResult[],
    commonIssues: any[],
    context?: RecommendationContext
  ): Promise<any> {
    const systemicRecommendations = [];

    for (const issue of commonIssues) {
      systemicRecommendations.push({
        title: `Address Systemic Issue: ${issue.rule}`,
        description: `This issue appears in ${issue.percentage} of evaluated content`,
        scope: 'system-wide',
        priority: issue.priority,
        estimatedImpact: 'high',
        implementation: {
          approach: 'Update guidelines and training',
          timeline: '2-4 weeks',
          resources: ['Content team', 'Quality assurance', 'Training materials']
        }
      });
    }

    return {
      systemic: systemicRecommendations,
      individual: await Promise.all(
        results.slice(0, 3).map(r => this.generateRecommendations(r, context))
      )
    };
  }
}