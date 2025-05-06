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
    const highRiskTerms = [
      'pornography', 'explicit sex', 'sexual intercourse', 'obscene', 'xxx', 
      'adult content', 'sexually explicit', 'pornographic'
    ];
    const mediumRiskTerms = [
      'nude', 'sexually suggestive', 'erotic', 'sexual', 'sensual', 'intimate', 
      'provocative', 'seductive', 'bedroom'
    ];
    const lowRiskTerms = [
      'kissing', 'romance', 'dating', 'relationship', 'love', 'attraction', 
      'flirting', 'affection'
    ];

    // Check for suggestive phrases
    const highRiskPhrases = [
      'sexual activity', 'adult services', 'adult entertainment',
      'sexual content', 'explicit material', 'mature audiences only'
    ];
    
    const mediumRiskPhrases = [
      'sexual tension', 'sexual references', 'suggestive content',
      'intimate moments', 'romantic encounter'
    ];
    
    // Check for high risk phrases
    for (const phrase of highRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.HIGH;
      }
    }
    
    // Check for medium risk phrases
    for (const phrase of mediumRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.MEDIUM;
      }
    }

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
    const highRiskTerms = ['murder', 'killing', 'terrorist attack', 'death', 'kill', 'harm', 'destroy', 'hurt'];
    const mediumRiskTerms = [
      'fight', 'assault', 'violent', 'attack', 'beat', 'hit', 'punch', 'kick', 'suffer', 
      'pain', 'blood', 'wound', 'injury', 'damage'
    ];
    const lowRiskTerms = [
      'conflict', 'argument', 'tension', 'battle', 'combat', 'force', 'aggressive',
      'make them afraid', 'what happens when', 'consequences', 'pay for'
    ];

    // Check for phrases that imply violence
    const highRiskPhrases = [
      'teach them a lesson', 'make them pay', 'get what they deserve', 
      'hurt them', 'make them hurt', 'make them suffer'
    ];
    
    const mediumRiskPhrases = [
      'show them what happens', 'they will regret', 'make them afraid',
      'put an end to', 'they won\'t know what hit them'
    ];
    
    // Check for high risk phrases
    for (const phrase of highRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.HIGH;
      }
    }
    
    // Check for medium risk phrases
    for (const phrase of mediumRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.MEDIUM;
      }
    }

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
    const highRiskTerms = [
      'hate speech', 'racial slur', 'bigotry', 'racism', 'sexism', 'homophobia',
      'xenophobia', 'antisemitism', 'islamophobia', 'transphobia', 'supremacist'
    ];
    const mediumRiskTerms = [
      'discriminatory', 'prejudice', 'stereotyping', 'offensive', 'derogatory',
      'intolerant', 'biased', 'hate', 'hateful'
    ];
    const lowRiskTerms = [
      'controversial', 'insensitive', 'generalization', 'stereotype'
    ];
    
    // Check for phrases indicating hate speech
    const highRiskPhrases = [
      'hate toward', 'hate against', 'should go back to', 'don\'t belong here',
      'are all the same', 'are ruining', 'are destroying', 'are inferior',
      'should be banned', 'shouldn\'t have rights'
    ];
    
    const mediumRiskPhrases = [
      'those people', 'you people', 'these people', 'that group',
      'aren\'t like us', 'don\'t share our values', 'don\'t fit in'
    ];
    
    // Check for high risk phrases
    for (const phrase of highRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.VERY_HIGH;
      }
    }
    
    // Check for medium risk phrases
    for (const phrase of mediumRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.HIGH;
      }
    }
    
    if (highRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.VERY_HIGH;
    } else if (mediumRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.HIGH;
    } else if (lowRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.NONE;
  }

  private checkForHarassment(content: string): RiskLevel {
    const highRiskTerms = ['harassment', 'bullying', 'stalking', 'threaten', 'threat'];
    const mediumRiskTerms = [
      'intimidation', 'threatening', 'mocking', 'bully', 'mock', 'humiliate', 
      'ridicule', 'shame', 'embarrass', 'target'
    ];
    
    // Check for phrases that imply harassment or intimidation
    const highRiskPhrases = [
      'make them afraid', 'show them what happens', 'teach them a lesson',
      'put fear into', 'they better watch out', 'they\'ll be sorry'
    ];
    
    const mediumRiskPhrases = [
      'they will regret', 'won\'t get away with', 'make them pay',
      'they deserve what\'s coming', 'consequences of ignoring'
    ];
    
    // Check for high risk phrases
    for (const phrase of highRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.HIGH;
      }
    }
    
    // Check for medium risk phrases
    for (const phrase of mediumRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.MEDIUM;
      }
    }
    
    if (highRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.NONE;
  }

  private checkForSelfHarm(content: string): RiskLevel {
    const highRiskTerms = [
      'suicide', 'self-harm', 'self-injury', 'kill myself', 'end my life', 
      'take my life', 'don\'t want to live', 'want to die', 'hurt myself'
    ];
    const mediumRiskTerms = [
      'depression', 'eating disorder', 'cutting', 'self-destructive', 'suicidal',
      'anorexia', 'bulimia', 'destructive behavior', 'self-hatred'
    ];
    const lowRiskTerms = [
      'hopeless', 'despair', 'giving up', 'no point', 'meaningless',
      'worthless', 'burden', 'painful existence'
    ];
    
    // Check for phrases indicating self-harm
    const highRiskPhrases = [
      'ways to kill', 'how to commit suicide', 'methods of suicide',
      'want to end it all', 'no reason to go on', 'better off without me',
      'nobody would miss me', 'can\'t take it anymore'
    ];
    
    const mediumRiskPhrases = [
      'tired of living', 'what\'s the point', 'life is too hard',
      'no one cares about me', 'no one would notice if I disappeared',
      'world would be better without me'
    ];
    
    // Check for high risk phrases
    for (const phrase of highRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.VERY_HIGH;
      }
    }
    
    // Check for medium risk phrases
    for (const phrase of mediumRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.HIGH;
      }
    }
    
    if (highRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.VERY_HIGH;
    } else if (mediumRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.HIGH;
    } else if (lowRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.NONE;
  }

  private checkForIllegalActivities(content: string): RiskLevel {
    const highRiskTerms = [
      'drug trafficking', 'illegal weapon', 'terrorism', 'child abuse',
      'human trafficking', 'smuggling', 'money laundering', 'illegal drugs'
    ];
    const mediumRiskTerms = [
      'hacking', 'fraud', 'counterfeit', 'illegal', 'theft', 'stolen', 
      'black market', 'dark web', 'criminal', 'scam'
    ];
    const lowRiskTerms = [
      'piracy', 'copyright infringement', 'downloading', 'circumvent', 
      'loophole', 'evade', 'avoid detection'
    ];
    
    // Check for phrases indicating illegal activities
    const highRiskPhrases = [
      'how to make drugs', 'where to buy illegal', 'how to hack into',
      'how to steal', 'avoiding law enforcement', 'commit fraud',
      'get away with', 'without getting caught'
    ];
    
    const mediumRiskPhrases = [
      'breaking the law', 'illegal ways to', 'ways around the system',
      'bypass security', 'fake documentation', 'illicit content'
    ];
    
    // Check for high risk phrases
    for (const phrase of highRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.VERY_HIGH;
      }
    }
    
    // Check for medium risk phrases
    for (const phrase of mediumRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.HIGH;
      }
    }
    
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
    const highRiskTerms = [
      'f***', 's***', 'a**hole', 'b**ch', 'c**t', 'd**k', 'p***y', 'f**k', 'sh*t',
      'b*tch', 'a*s', 'b*stard', 'bullsh*t'
    ];
    const mediumRiskTerms = [
      'damn', 'hell', 'crap', 'piss', 'suck', 'screw', 'jerk', 'idiot', 'stupid',
      'dumb', 'moron', 'freak', 'wtf', 'stfu', 'lmfao'
    ];
    const lowRiskTerms = [
      'heck', 'darn', 'gosh', 'fudge', 'shoot', 'dang', 'freaking', 'hella'
    ];
    
    // Look for deliberate obfuscation
    const obfuscatedPatterns = [
      /f+[^a-z]*u+[^a-z]*c+[^a-z]*k+/i,
      /s+[^a-z]*h+[^a-z]*i+[^a-z]*t+/i,
      /b+[^a-z]*i+[^a-z]*t+[^a-z]*c+[^a-z]*h+/i
    ];
    
    for (const pattern of obfuscatedPatterns) {
      if (pattern.test(content)) {
        return RiskLevel.HIGH;
      }
    }
    
    // Check for phrases with negative modifiers
    const contextualPhrases = [
      'what the f', 'f ing', 'freaking idiot', 'effing', 
      'shut the f up', 'shut up', 'go to hell'
    ];
    
    for (const phrase of contextualPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.MEDIUM;
      }
    }
    
    if (highRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.MEDIUM;
    } else if (lowRiskTerms.some(term => content.includes(term))) {
      return RiskLevel.LOW;
    }
    return RiskLevel.NONE;
  }

  private checkForAlcoholTobacco(content: string): RiskLevel {
    const highRiskTerms = [
      'drunk', 'wasted', 'smoking advertisement', 'alcoholic', 'intoxicated',
      'hammered', 'buzzed', 'smashed', 'purchasing alcohol', 'buying cigarettes',
      'nicotine', 'vaping', 'e-cigarette'
    ];
    const mediumRiskTerms = [
      'alcohol', 'beer', 'wine', 'cigarette', 'tobacco', 'liquor', 'whiskey',
      'vodka', 'rum', 'gin', 'smoking', 'cigar', 'alcoholic beverage'
    ];
    const lowRiskTerms = [
      'bar', 'drink', 'party', 'pub', 'nightclub', 'cocktail', 'happy hour',
      'drinking', 'brewery', 'winery', 'smoke'
    ];
    
    // Check for phrases promoting or glamorizing
    const highRiskPhrases = [
      'drinking to get drunk', 'binge drinking', 'getting wasted',
      'smoke to relax', 'need a cigarette', 'need a drink',
      'drinking age', 'drinking game', 'smoking is cool'
    ];
    
    const mediumRiskPhrases = [
      'drinking culture', 'drinking habits', 'smoking habit',
      'having a few drinks', 'social smoking', 'casual drinking'
    ];
    
    // Check for high risk phrases
    for (const phrase of highRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.HIGH;
      }
    }
    
    // Check for medium risk phrases
    for (const phrase of mediumRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.MEDIUM;
      }
    }
    
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
    const highRiskTerms = [
      'controversial political', 'political scandal', 'radical politics',
      'extremist politics', 'political protest', 'political unrest',
      'political violence', 'political divide'
    ];
    const mediumRiskTerms = [
      'election', 'political party', 'politician', 'democrat', 'republican',
      'liberal', 'conservative', 'left-wing', 'right-wing', 'campaign',
      'vote', 'voter', 'political', 'politically', 'politics'
    ];
    const lowRiskTerms = [
      'policy', 'government', 'democracy', 'democratic', 'administration',
      'congress', 'senate', 'legislation', 'representative'
    ];
    
    // Check for politically charged phrases
    const highRiskPhrases = [
      'political agenda', 'politically motivated', 'liberal agenda',
      'conservative agenda', 'socialist agenda', 'fascist agenda',
      'political correctness', 'politically correct', 'corrupt politician',
      'voting scandal', 'election fraud'
    ];
    
    const mediumRiskPhrases = [
      'political views', 'political stance', 'political belief',
      'political opinion', 'political leaning', 'political affiliation',
      'republican voters', 'democratic voters', 'swing voters'
    ];
    
    // Check for high risk phrases
    for (const phrase of highRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.HIGH;
      }
    }
    
    // Check for medium risk phrases
    for (const phrase of mediumRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.MEDIUM;
      }
    }
    
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
    const highRiskTerms = [
      'religious controversy', 'religious conflict', 'religious debate',
      'religious discrimination', 'religious persecution', 'blasphemy',
      'sacrilege', 'religious extremism', 'religious fanaticism'
    ];
    const mediumRiskTerms = [
      'religion', 'religious', 'faith', 'worship', 'church', 'mosque', 'temple',
      'synagogue', 'pray', 'prayer', 'bible', 'quran', 'torah', 'god', 'allah',
      'jesus', 'muhammad', 'buddha', 'christian', 'muslim', 'jew', 'hindu', 'sikh'
    ];
    const lowRiskTerms = [
      'spiritual', 'belief', 'tradition', 'blessing', 'congregation',
      'divine', 'holy', 'sacred', 'ceremony', 'ritual', 'faith-based'
    ];
    
    // Check for religiously controversial phrases
    const highRiskPhrases = [
      'religious war', 'holy war', 'converting to', 'religious violence',
      'against religion', 'anti-religion', 'freedom from religion',
      'religious zealot', 'religious fanatic', 'false religion'
    ];
    
    const mediumRiskPhrases = [
      'religious beliefs', 'religious practice', 'religious teachings',
      'religious community', 'religious leader', 'religious text',
      'religious holiday', 'religious festival'
    ];
    
    // Check for high risk phrases
    for (const phrase of highRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.HIGH;
      }
    }
    
    // Check for medium risk phrases
    for (const phrase of mediumRiskPhrases) {
      if (content.includes(phrase)) {
        return RiskLevel.MEDIUM;
      }
    }
    
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