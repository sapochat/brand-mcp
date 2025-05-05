import { 
  BrandSafetyCategory, 
  RiskLevel, 
  ContentSafetyResult, 
  BrandSafetyEvaluation,
  BrandSafetyConfig,
  DEFAULT_BRAND_SAFETY_CONFIG
} from '../types/brandSafety.js';

export class BrandSafetyService {
  private config: BrandSafetyConfig;

  constructor(config: Partial<BrandSafetyConfig> = {}) {
    // Merge provided config with defaults
    this.config = {
      ...DEFAULT_BRAND_SAFETY_CONFIG,
      ...config,
      riskTolerances: {
        ...DEFAULT_BRAND_SAFETY_CONFIG.riskTolerances,
        ...(config.riskTolerances || {})
      }
    };
  }

  /**
   * Update the brand safety configuration
   */
  updateConfig(config: Partial<BrandSafetyConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      riskTolerances: {
        ...this.config.riskTolerances,
        ...(config.riskTolerances || {})
      }
    };
  }

  /**
   * Evaluate content for brand safety concerns
   */
  evaluateContent(content: string): BrandSafetyEvaluation {
    const evaluations: ContentSafetyResult[] = [];
    
    // Evaluate each category
    for (const category of this.config.categories) {
      const result = this.evaluateCategory(content, category);
      evaluations.push(result);
    }
    
    // Determine overall risk level (highest risk from any category)
    const overallRisk = this.calculateOverallRisk(evaluations);
    
    // Generate summary
    const summary = this.generateSummary(evaluations, overallRisk);
    
    return {
      content,
      evaluations,
      overallRisk,
      summary,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Evaluate content against a specific safety category
   */
  private evaluateCategory(content: string, category: BrandSafetyCategory): ContentSafetyResult {
    // Simple keyword-based evaluation for demonstration purposes
    // In a real implementation, this would use more sophisticated content analysis
    
    const lowerContent = content.toLowerCase();
    let riskLevel = RiskLevel.NONE;
    let explanation = '';

    // Check for brand-specific blocked topics
    const blockedTopicMatch = this.config.blockedTopics.find(topic => 
      lowerContent.includes(topic.toLowerCase())
    );
    
    if (blockedTopicMatch) {
      riskLevel = RiskLevel.VERY_HIGH;
      explanation = `Content contains blocked topic: "${blockedTopicMatch}"`;
      return { category, riskLevel, explanation };
    }

    // Check for sensitive keywords
    const sensitiveKeywordMatch = this.config.sensitiveKeywords.find(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    );
    
    if (sensitiveKeywordMatch) {
      riskLevel = RiskLevel.HIGH;
      explanation = `Content contains sensitive keyword: "${sensitiveKeywordMatch}"`;
      return { category, riskLevel, explanation };
    }

    // Category-specific evaluations
    switch (category) {
      case BrandSafetyCategory.SEXUAL_CONTENT:
        riskLevel = this.checkForSexualContent(lowerContent);
        break;
      case BrandSafetyCategory.VIOLENCE:
        riskLevel = this.checkForViolence(lowerContent);
        break;
      case BrandSafetyCategory.HATE_SPEECH:
        riskLevel = this.checkForHateSpeech(lowerContent);
        break;
      case BrandSafetyCategory.HARASSMENT:
        riskLevel = this.checkForHarassment(lowerContent);
        break;
      case BrandSafetyCategory.SELF_HARM:
        riskLevel = this.checkForSelfHarm(lowerContent);
        break;
      case BrandSafetyCategory.ILLEGAL_ACTIVITIES:
        riskLevel = this.checkForIllegalActivities(lowerContent);
        break;
      case BrandSafetyCategory.PROFANITY:
        riskLevel = this.checkForProfanity(lowerContent);
        break;
      case BrandSafetyCategory.ALCOHOL_TOBACCO:
        riskLevel = this.checkForAlcoholTobacco(lowerContent);
        break;
      case BrandSafetyCategory.POLITICAL:
        riskLevel = this.checkForPolitical(lowerContent);
        break;
      case BrandSafetyCategory.RELIGION:
        riskLevel = this.checkForReligion(lowerContent);
        break;
    }

    explanation = this.generateExplanation(category, riskLevel, lowerContent);
    return { category, riskLevel, explanation };
  }

  /**
   * Calculate the overall risk level from individual evaluations
   */
  private calculateOverallRisk(evaluations: ContentSafetyResult[]): RiskLevel {
    const riskLevels = evaluations.map(evaluation => evaluation.riskLevel);
    const riskValues = {
      [RiskLevel.NONE]: 0,
      [RiskLevel.LOW]: 1,
      [RiskLevel.MEDIUM]: 2,
      [RiskLevel.HIGH]: 3,
      [RiskLevel.VERY_HIGH]: 4
    };

    // Find the highest risk level
    let highestRiskValue = riskValues[RiskLevel.NONE];
    for (const risk of riskLevels) {
      if (riskValues[risk] > highestRiskValue) {
        highestRiskValue = riskValues[risk];
      }
    }

    // Convert back to RiskLevel
    const riskLevelEntries = Object.entries(riskValues);
    for (const [level, value] of riskLevelEntries) {
      if (value === highestRiskValue) {
        return level as RiskLevel;
      }
    }

    return RiskLevel.NONE;
  }

  /**
   * Generate a summary of the brand safety evaluation
   */
  private generateSummary(evaluations: ContentSafetyResult[], overallRisk: RiskLevel): string {
    const highRiskCategories = evaluations
      .filter(evaluation => evaluation.riskLevel === RiskLevel.HIGH || evaluation.riskLevel === RiskLevel.VERY_HIGH)
      .map(evaluation => evaluation.category);
    
    const mediumRiskCategories = evaluations
      .filter(evaluation => evaluation.riskLevel === RiskLevel.MEDIUM)
      .map(evaluation => evaluation.category);

    if (overallRisk === RiskLevel.VERY_HIGH) {
      return `UNSAFE: Content poses very high risk in categories: ${highRiskCategories.join(', ')}. Not suitable for brand association.`;
    } else if (overallRisk === RiskLevel.HIGH) {
      return `HIGH RISK: Content has high risk factors in categories: ${highRiskCategories.join(', ')}. Recommend against brand association.`;
    } else if (overallRisk === RiskLevel.MEDIUM) {
      return `CAUTION: Content has moderate risk in categories: ${mediumRiskCategories.join(', ')}. Review carefully before brand association.`;
    } else if (overallRisk === RiskLevel.LOW) {
      return 'LOW RISK: Content has minimal brand safety concerns but review recommended.';
    } else {
      return 'SAFE: Content appears safe for brand association.';
    }
  }

  /**
   * Generate explanation for a safety category evaluation
   */
  private generateExplanation(category: BrandSafetyCategory, risk: RiskLevel, content: string): string {
    if (risk === RiskLevel.NONE) {
      return `No ${category.toLowerCase().replace('_', ' ')} concerns detected.`;
    }

    // In a real implementation, this would provide specific examples from the content
    const riskDescriptions = {
      [RiskLevel.LOW]: 'minor',
      [RiskLevel.MEDIUM]: 'moderate',
      [RiskLevel.HIGH]: 'significant',
      [RiskLevel.VERY_HIGH]: 'extreme'
    };

    return `${riskDescriptions[risk]} ${category.toLowerCase().replace('_', ' ')} concerns detected.`;
  }

  // Category-specific evaluation methods
  // These are simplified examples - real implementations would be more sophisticated

  private checkForSexualContent(content: string): RiskLevel {
    const highRiskTerms = ['pornography', 'explicit sex', 'sexual intercourse'];
    const mediumRiskTerms = ['nude', 'sexually suggestive', 'erotic'];
    const lowRiskTerms = ['kissing', 'romance', 'dating'];

    if (highRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.MEDIUM;
    } else if (lowRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.LOW;
    }
    return RiskLevel.NONE;
  }

  private checkForViolence(content: string): RiskLevel {
    const highRiskTerms = ['murder', 'killing', 'terrorist attack'];
    const mediumRiskTerms = ['fight', 'assault', 'violent'];
    const lowRiskTerms = ['conflict', 'argument', 'tension'];

    if (highRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.MEDIUM;
    } else if (lowRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.LOW;
    }
    return RiskLevel.NONE;
  }

  private checkForHateSpeech(content: string): RiskLevel {
    const highRiskTerms = ['hate speech', 'racial slur', 'bigotry'];
    const mediumRiskTerms = ['discriminatory', 'prejudice', 'stereotyping'];
    
    if (highRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.VERY_HIGH;
    } else if (mediumRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.HIGH;
    }
    return RiskLevel.NONE;
  }

  private checkForHarassment(content: string): RiskLevel {
    const highRiskTerms = ['harassment', 'bullying', 'stalking'];
    const mediumRiskTerms = ['intimidation', 'threatening', 'mocking'];
    
    if (highRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.NONE;
  }

  private checkForSelfHarm(content: string): RiskLevel {
    const highRiskTerms = ['suicide', 'self-harm', 'self-injury'];
    const mediumRiskTerms = ['depression', 'eating disorder', 'cutting'];
    
    if (highRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.VERY_HIGH;
    } else if (mediumRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.HIGH;
    }
    return RiskLevel.NONE;
  }

  private checkForIllegalActivities(content: string): RiskLevel {
    const highRiskTerms = ['drug trafficking', 'illegal weapon', 'terrorism'];
    const mediumRiskTerms = ['hacking', 'fraud', 'counterfeit'];
    const lowRiskTerms = ['piracy', 'copyright infringement', 'downloading'];
    
    if (highRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.VERY_HIGH;
    } else if (mediumRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.HIGH;
    } else if (lowRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.NONE;
  }

  private checkForProfanity(content: string): RiskLevel {
    const highRiskTerms = ['f***', 's***'];
    const mediumRiskTerms = ['damn', 'hell'];
    
    if (highRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.NONE;
  }

  private checkForAlcoholTobacco(content: string): RiskLevel {
    const highRiskTerms = ['drunk', 'wasted', 'smoking advertisement'];
    const mediumRiskTerms = ['alcohol', 'beer', 'wine', 'cigarette', 'tobacco'];
    const lowRiskTerms = ['bar', 'drink', 'party'];
    
    if (highRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.MEDIUM;
    } else if (lowRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.LOW;
    }
    return RiskLevel.NONE;
  }

  private checkForPolitical(content: string): RiskLevel {
    const highRiskTerms = ['controversial political', 'political scandal'];
    const mediumRiskTerms = ['election', 'political party', 'politician'];
    const lowRiskTerms = ['policy', 'government', 'democracy'];
    
    if (highRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.MEDIUM;
    } else if (lowRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.LOW;
    }
    return RiskLevel.NONE;
  }

  private checkForReligion(content: string): RiskLevel {
    const highRiskTerms = ['religious controversy', 'religious conflict'];
    const mediumRiskTerms = ['religion', 'religious', 'faith', 'worship'];
    const lowRiskTerms = ['spiritual', 'belief', 'tradition'];
    
    if (highRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.MEDIUM;
    } else if (lowRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.LOW;
    }
    return RiskLevel.NONE;
  }
} 