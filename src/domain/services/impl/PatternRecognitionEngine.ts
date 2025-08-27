/**
 * Pattern recognition engine for detecting content patterns and anomalies
 */
export class PatternRecognitionEngine {
  private patterns: Map<string, ContentPattern>;
  private customPatterns: Map<string, CustomPattern>;
  private anomalyDetectors: AnomalyDetector[];

  constructor() {
    this.patterns = new Map();
    this.customPatterns = new Map();
    this.anomalyDetectors = [];
    this.initializePatterns();
  }

  /**
   * Initialize built-in patterns
   */
  private initializePatterns(): void {
    // Promotional patterns
    this.registerPattern({
      id: 'excessive_promotion',
      name: 'Excessive Promotional Content',
      category: 'marketing',
      indicators: [
        /\b(buy now|limited time|act fast|don't miss|exclusive offer)\b/gi,
        /\b(50%|75%|90%) off\b/gi,
        /\b(free|bonus|gift|prize)\b.*\b(today|now|immediately)\b/gi,
        /!!+|URGENT|AMAZING|INCREDIBLE/g
      ],
      threshold: 3,
      severity: 'medium',
      description: 'Content contains excessive promotional language'
    });

    // Clickbait patterns
    this.registerPattern({
      id: 'clickbait',
      name: 'Clickbait Language',
      category: 'quality',
      indicators: [
        /you won't believe/gi,
        /this one weird trick/gi,
        /doctors hate (him|her|this)/gi,
        /what happened next/gi,
        /number \d+ will shock you/gi,
        /\bshocking\b.*\btruth\b/gi
      ],
      threshold: 1,
      severity: 'high',
      description: 'Content uses clickbait tactics'
    });

    // Financial risk patterns
    this.registerPattern({
      id: 'financial_risk',
      name: 'Financial Risk Language',
      category: 'compliance',
      indicators: [
        /guaranteed returns?/gi,
        /risk.?free investment/gi,
        /get rich quick/gi,
        /double your money/gi,
        /\b(100%|absolutely) guaranteed\b/gi,
        /no risk/gi
      ],
      threshold: 1,
      severity: 'critical',
      description: 'Content makes risky financial claims'
    });

    // Medical claims patterns
    this.registerPattern({
      id: 'medical_claims',
      name: 'Unsubstantiated Medical Claims',
      category: 'compliance',
      indicators: [
        /cures?\s+(cancer|diabetes|alzheimer)/gi,
        /miracle cure/gi,
        /FDA approved/gi,
        /clinically proven/gi,
        /\b(treats?|prevents?|cures?)\b.*\b(disease|illness|condition)\b/gi
      ],
      threshold: 1,
      severity: 'critical',
      description: 'Content makes unsubstantiated medical claims'
    });

    // Spam patterns
    this.registerPattern({
      id: 'spam_indicators',
      name: 'Spam Indicators',
      category: 'quality',
      indicators: [
        /\b(V.?I.?A.?G.?R.?A|C.?I.?A.?L.?I.?S)\b/gi,
        /\b(casino|lottery|winner)\b/gi,
        /\bmillion(s)? (of )?dollars?\b/gi,
        /\b(dear|beloved) (friend|customer|winner)\b/gi,
        /click here now/gi,
        /unsubscribe/gi
      ],
      threshold: 2,
      severity: 'high',
      description: 'Content contains spam indicators'
    });

    // Urgency manipulation
    this.registerPattern({
      id: 'urgency_manipulation',
      name: 'Urgency Manipulation',
      category: 'ethics',
      indicators: [
        /\b(expires?|ends?) (today|tonight|soon|in \d+ (hours?|minutes?))/gi,
        /\blast chance\b/gi,
        /\bonly \d+ left\b/gi,
        /\btime is running out\b/gi,
        /\bact now before/gi
      ],
      threshold: 2,
      severity: 'medium',
      description: 'Content uses manipulative urgency tactics'
    });

    // Legal disclaimer patterns
    this.registerPattern({
      id: 'missing_disclaimer',
      name: 'Missing Legal Disclaimer',
      category: 'compliance',
      requiredWhen: [
        /investment advice/gi,
        /financial recommendation/gi,
        /medical advice/gi,
        /legal advice/gi
      ],
      mustInclude: [
        /disclaimer|disclosure|not (financial|medical|legal) advice/gi
      ],
      severity: 'high',
      description: 'Content requires disclaimer but none found'
    });
  }

  /**
   * Register a content pattern
   */
  private registerPattern(pattern: ContentPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Detect patterns in content
   */
  async detectPatterns(content: string, context?: PatternContext): Promise<PatternDetectionResult> {
    const detectedPatterns: DetectedPattern[] = [];
    const anomalies: ContentAnomaly[] = [];
    
    // Check built-in patterns
    for (const [id, pattern] of this.patterns) {
      const detection = this.checkPattern(content, pattern, context);
      if (detection) {
        detectedPatterns.push(detection);
      }
    }

    // Check custom patterns
    for (const [id, pattern] of this.customPatterns) {
      const detection = this.checkCustomPattern(content, pattern, context);
      if (detection) {
        detectedPatterns.push(detection);
      }
    }

    // Detect anomalies
    for (const detector of this.anomalyDetectors) {
      const detectedAnomalies = await detector.detect(content, context);
      anomalies.push(...detectedAnomalies);
    }

    // Calculate risk score
    const riskScore = this.calculateRiskScore(detectedPatterns, anomalies);

    // Generate recommendations
    const recommendations = this.generateRecommendations(detectedPatterns, anomalies);

    return {
      patterns: detectedPatterns,
      anomalies,
      riskScore,
      riskLevel: this.determineRiskLevel(riskScore),
      recommendations,
      summary: this.generateSummary(detectedPatterns, anomalies)
    };
  }

  /**
   * Check a specific pattern
   */
  private checkPattern(
    content: string, 
    pattern: ContentPattern, 
    context?: PatternContext
  ): DetectedPattern | null {
    // Check if pattern requires certain conditions
    if (pattern.requiredWhen) {
      const requirementMet = pattern.requiredWhen.some(req => req.test(content));
      if (requirementMet && pattern.mustInclude) {
        const includesMet = pattern.mustInclude.some(inc => inc.test(content));
        if (!includesMet) {
          return {
            pattern,
            matches: [],
            count: 1,
            confidence: 100,
            severity: pattern.severity,
            locations: [],
            context: `Required disclaimer missing for ${pattern.name}`
          };
        }
      }
    }

    // Check pattern indicators
    if (pattern.indicators) {
      const matches: PatternMatch[] = [];
      
      for (const indicator of pattern.indicators) {
        const indicatorMatches = content.matchAll(indicator);
        for (const match of indicatorMatches) {
          matches.push({
            text: match[0],
            position: {
              start: match.index || 0,
              end: (match.index || 0) + match[0].length
            },
            indicator: indicator.source
          });
        }
      }

      if (matches.length >= (pattern.threshold || 1)) {
        return {
          pattern,
          matches,
          count: matches.length,
          confidence: Math.min(100, (matches.length / (pattern.threshold || 1)) * 50),
          severity: pattern.severity,
          locations: matches.map(m => m.position),
          context: pattern.description
        };
      }
    }

    return null;
  }

  /**
   * Check custom pattern
   */
  private checkCustomPattern(
    content: string,
    pattern: CustomPattern,
    context?: PatternContext
  ): DetectedPattern | null {
    if (pattern.detector(content, context)) {
      return {
        pattern: {
          id: pattern.id,
          name: pattern.name,
          category: pattern.category,
          severity: pattern.severity,
          description: pattern.description
        },
        matches: [],
        count: 1,
        confidence: pattern.confidence || 80,
        severity: pattern.severity,
        locations: [],
        context: pattern.description
      };
    }
    return null;
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(
    patterns: DetectedPattern[], 
    anomalies: ContentAnomaly[]
  ): number {
    let score = 0;
    
    // Score from patterns
    for (const pattern of patterns) {
      const severityScore = {
        'low': 10,
        'medium': 25,
        'high': 50,
        'critical': 100
      }[pattern.severity] || 10;
      
      score += severityScore * (pattern.confidence / 100);
    }

    // Score from anomalies
    for (const anomaly of anomalies) {
      const severityScore = {
        'low': 5,
        'medium': 15,
        'high': 30
      }[anomaly.severity] || 5;
      
      score += severityScore * (anomaly.confidence / 100);
    }

    return Math.min(100, score);
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    if (score >= 20) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Generate recommendations based on detected patterns
   */
  private generateRecommendations(
    patterns: DetectedPattern[],
    anomalies: ContentAnomaly[]
  ): PatternRecommendation[] {
    const recommendations: PatternRecommendation[] = [];

    for (const pattern of patterns) {
      if (pattern.pattern.recommendations) {
        recommendations.push(...pattern.pattern.recommendations);
      } else {
        // Generate default recommendations
        recommendations.push({
          type: 'pattern_fix',
          priority: pattern.severity === 'critical' ? 'high' : 
                   pattern.severity === 'high' ? 'medium' : 'low',
          description: `Review and address: ${pattern.pattern.description}`,
          action: `Remove or modify content matching pattern: ${pattern.pattern.name}`
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate summary of detection results
   */
  private generateSummary(
    patterns: DetectedPattern[],
    anomalies: ContentAnomaly[]
  ): PatternSummary {
    const categoryCounts = new Map<string, number>();
    const severityCounts = new Map<string, number>();

    for (const pattern of patterns) {
      categoryCounts.set(
        pattern.pattern.category,
        (categoryCounts.get(pattern.pattern.category) || 0) + 1
      );
      severityCounts.set(
        pattern.severity,
        (severityCounts.get(pattern.severity) || 0) + 1
      );
    }

    return {
      totalPatterns: patterns.length,
      totalAnomalies: anomalies.length,
      categoryCounts: Object.fromEntries(categoryCounts),
      severityCounts: Object.fromEntries(severityCounts),
      criticalIssues: patterns.filter(p => p.severity === 'critical').length,
      highPriorityActions: patterns
        .filter(p => p.severity === 'critical' || p.severity === 'high')
        .map(p => p.pattern.name)
    };
  }

  /**
   * Add custom pattern
   */
  addCustomPattern(pattern: CustomPattern): void {
    this.customPatterns.set(pattern.id, pattern);
  }

  /**
   * Add anomaly detector
   */
  addAnomalyDetector(detector: AnomalyDetector): void {
    this.anomalyDetectors.push(detector);
  }

  /**
   * Train pattern recognition with examples
   */
  async train(examples: TrainingExample[]): Promise<void> {
    // This would implement pattern learning in a real system
    // For now, it's a placeholder for future ML integration
    console.log(`Training with ${examples.length} examples`);
  }
}

/**
 * Interfaces and types
 */
export interface ContentPattern {
  id: string;
  name: string;
  category: string;
  indicators?: RegExp[];
  requiredWhen?: RegExp[];
  mustInclude?: RegExp[];
  threshold?: number;
  severity: PatternSeverity;
  description: string;
  recommendations?: PatternRecommendation[];
}

export interface CustomPattern {
  id: string;
  name: string;
  category: string;
  detector: (content: string, context?: PatternContext) => boolean;
  severity: PatternSeverity;
  confidence?: number;
  description: string;
}

export interface PatternContext {
  domain?: string;
  audience?: string;
  channel?: string;
  metadata?: Record<string, any>;
}

export interface PatternDetectionResult {
  patterns: DetectedPattern[];
  anomalies: ContentAnomaly[];
  riskScore: number;
  riskLevel: RiskLevel;
  recommendations: PatternRecommendation[];
  summary: PatternSummary;
}

export interface DetectedPattern {
  pattern: Partial<ContentPattern>;
  matches: PatternMatch[];
  count: number;
  confidence: number;
  severity: PatternSeverity;
  locations: TextPosition[];
  context: string;
}

export interface PatternMatch {
  text: string;
  position: TextPosition;
  indicator: string;
}

export interface ContentAnomaly {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  evidence: string[];
  location?: TextPosition;
}

export interface AnomalyDetector {
  name: string;
  detect(content: string, context?: PatternContext): Promise<ContentAnomaly[]>;
}

export interface PatternRecommendation {
  type: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  action: string;
}

export interface PatternSummary {
  totalPatterns: number;
  totalAnomalies: number;
  categoryCounts: Record<string, number>;
  severityCounts: Record<string, number>;
  criticalIssues: number;
  highPriorityActions: string[];
}

export interface TextPosition {
  start: number;
  end: number;
}

export interface TrainingExample {
  content: string;
  patterns: string[];
  isPositive: boolean;
  context?: PatternContext;
}

export type PatternSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';