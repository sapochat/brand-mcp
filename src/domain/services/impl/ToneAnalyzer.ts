/**
 * Tone analysis system for detecting and analyzing communication tone
 */
export class ToneAnalyzer {
  private toneIndicators: Map<ToneType, ToneIndicator[]>;
  private formalityIndicators: FormalityIndicator[];
  private emotionalIndicators: Map<EmotionType, RegExp[]>;

  constructor() {
    this.toneIndicators = new Map();
    this.formalityIndicators = [];
    this.emotionalIndicators = new Map();
    this.initializeIndicators();
  }

  /**
   * Initialize tone indicators
   */
  private initializeIndicators(): void {
    // Professional tone indicators
    this.toneIndicators.set(ToneType.PROFESSIONAL, [
      {
        patterns: [
          /\b(accordingly|furthermore|moreover|consequently)\b/gi,
          /\b(regarding|concerning|pertaining to)\b/gi,
          /\b(implement|utilize|facilitate|optimize)\b/gi,
          /\b(strategic|comprehensive|innovative|efficient)\b/gi
        ],
        weight: 1.5,
        context: 'formal vocabulary'
      },
      {
        patterns: [
          /\b(we are pleased to|we would like to|it is important to)\b/gi,
          /\b(please be advised|for your consideration)\b/gi
        ],
        weight: 1.2,
        context: 'professional phrases'
      }
    ]);

    // Casual tone indicators
    this.toneIndicators.set(ToneType.CASUAL, [
      {
        patterns: [
          /\b(hey|hi|yeah|yep|nope|gonna|wanna)\b/gi,
          /\b(stuff|thing|guy|guys)\b/gi,
          /\b(awesome|cool|great|nice)\b/gi,
          /\b(ok|okay|alright)\b/gi
        ],
        weight: 1.5,
        context: 'informal vocabulary'
      },
      {
        patterns: [
          /['']ll|['']ve|['']re|['']d|won['']t|can['']t/gi,
          /!{2,}/g,
          /\.\.\./g
        ],
        weight: 1.0,
        context: 'contractions and informal punctuation'
      }
    ]);

    // Aggressive tone indicators
    this.toneIndicators.set(ToneType.AGGRESSIVE, [
      {
        patterns: [
          /\b(stupid|idiotic|ridiculous|absurd)\b/gi,
          /\b(terrible|horrible|awful|pathetic)\b/gi,
          /\b(hate|despise|detest)\b/gi,
          /\b(destroy|crush|demolish|annihilate)\b/gi
        ],
        weight: 2.0,
        context: 'hostile vocabulary'
      },
      {
        patterns: [
          /!{3,}/g,
          /\b[A-Z]{4,}\b/g, // SHOUTING
          /\b(never|always|completely|totally) wrong\b/gi
        ],
        weight: 1.5,
        context: 'aggressive emphasis'
      }
    ]);

    // Friendly tone indicators
    this.toneIndicators.set(ToneType.FRIENDLY, [
      {
        patterns: [
          /\b(thanks|thank you|please|appreciate)\b/gi,
          /\b(happy|glad|delighted|pleased)\b/gi,
          /\b(help|assist|support|collaborate)\b/gi,
          /\b(welcome|warmly|kindly)\b/gi
        ],
        weight: 1.5,
        context: 'positive vocabulary'
      },
      {
        patterns: [
          /😊|😄|🙂|👍|❤️/g,
          /\b(hope you|wish you|looking forward)\b/gi
        ],
        weight: 1.2,
        context: 'friendly expressions'
      }
    ]);

    // Authoritative tone indicators
    this.toneIndicators.set(ToneType.AUTHORITATIVE, [
      {
        patterns: [
          /\b(must|shall|will|require|mandate)\b/gi,
          /\b(clearly|obviously|undoubtedly|certainly)\b/gi,
          /\b(proven|established|demonstrated|confirmed)\b/gi,
          /\b(directive|policy|regulation|standard)\b/gi
        ],
        weight: 1.5,
        context: 'authoritative vocabulary'
      },
      {
        patterns: [
          /\b(it is essential|it is critical|it is mandatory)\b/gi,
          /\b(you must|you shall|you are required to)\b/gi
        ],
        weight: 1.8,
        context: 'directive language'
      }
    ]);

    // Formality indicators
    this.formalityIndicators = [
      { indicator: /\b(I|me|my|mine)\b/gi, score: -1, type: 'first_person' },
      { indicator: /\b(you|your|yours)\b/gi, score: -0.5, type: 'second_person' },
      { indicator: /\b(we|us|our|ours)\b/gi, score: 0.5, type: 'first_person_plural' },
      { indicator: /\b(one|one's)\b/gi, score: 2, type: 'impersonal' },
      { indicator: /['']t\b/gi, score: -1.5, type: 'contraction' },
      { indicator: /\b[a-z]+ly\b/gi, score: 0.5, type: 'adverb' },
      { indicator: /\b(however|therefore|thus|hence)\b/gi, score: 1.5, type: 'formal_connector' }
    ];

    // Emotional indicators
    this.initializeEmotionalIndicators();
  }

  /**
   * Initialize emotional indicators
   */
  private initializeEmotionalIndicators(): void {
    this.emotionalIndicators.set(EmotionType.JOY, [
      /\b(happy|joy|joyful|cheerful|delighted|excited|thrilled)\b/gi,
      /\b(wonderful|fantastic|amazing|excellent|great)\b/gi,
      /\b(celebrate|celebrating|celebration)\b/gi,
      /😀|😁|😃|😄|🎉|🎊/g
    ]);

    this.emotionalIndicators.set(EmotionType.ANGER, [
      /\b(angry|furious|rage|mad|irritated|annoyed)\b/gi,
      /\b(hate|despise|loathe|detest)\b/gi,
      /\b(damn|hell|crap)\b/gi,
      /😠|😡|🤬|😤/g
    ]);

    this.emotionalIndicators.set(EmotionType.SADNESS, [
      /\b(sad|unhappy|depressed|miserable|gloomy)\b/gi,
      /\b(cry|crying|tears|weep|weeping)\b/gi,
      /\b(unfortunately|sadly|regret|sorry)\b/gi,
      /😢|😭|😞|😔/g
    ]);

    this.emotionalIndicators.set(EmotionType.FEAR, [
      /\b(afraid|scared|frightened|terrified|anxious|worried)\b/gi,
      /\b(danger|dangerous|threat|threatening|risk)\b/gi,
      /\b(panic|alarmed|nervous)\b/gi,
      /😨|😰|😱|😟/g
    ]);

    this.emotionalIndicators.set(EmotionType.SURPRISE, [
      /\b(surprised|amazed|astonished|shocked|stunned)\b/gi,
      /\b(unexpected|suddenly|wow|omg|oh my)\b/gi,
      /\b(unbelievable|incredible)\b/gi,
      /😮|😲|🤯|😯/g
    ]);
  }

  /**
   * Analyze tone in content
   */
  async analyzeTone(content: string, context?: ToneContext): Promise<ToneAnalysisResult> {
    // Detect primary tones
    const toneScores = this.detectTones(content);
    const primaryTone = this.determinePrimaryTone(toneScores);
    const secondaryTones = this.determineSecondaryTones(toneScores, primaryTone);

    // Analyze formality
    const formality = this.analyzeFormality(content);

    // Detect emotions
    const emotions = this.detectEmotions(content);

    // Analyze consistency
    const consistency = this.analyzeConsistency(toneScores);

    // Analyze appropriateness
    const appropriateness = context ? 
      this.analyzeAppropriateness(primaryTone, formality, context) : null;

    // Generate recommendations
    const recommendations = this.generateToneRecommendations(
      primaryTone,
      formality,
      consistency,
      appropriateness,
      context
    );

    return {
      primaryTone,
      secondaryTones,
      toneScores,
      formality,
      emotions,
      consistency,
      appropriateness,
      recommendations,
      confidence: this.calculateConfidence(toneScores, consistency)
    };
  }

  /**
   * Detect tones in content
   */
  private detectTones(content: string): Map<ToneType, number> {
    const scores = new Map<ToneType, number>();

    for (const [tone, indicators] of this.toneIndicators) {
      let score = 0;
      let matchCount = 0;

      for (const indicator of indicators) {
        for (const pattern of indicator.patterns) {
          const matches = content.match(pattern);
          if (matches) {
            matchCount += matches.length;
            score += matches.length * indicator.weight;
          }
        }
      }

      // Normalize score
      const wordCount = content.split(/\s+/).length;
      const normalizedScore = (score / wordCount) * 100;
      scores.set(tone, normalizedScore);
    }

    return scores;
  }

  /**
   * Determine primary tone
   */
  private determinePrimaryTone(scores: Map<ToneType, number>): ToneType {
    let maxScore = 0;
    let primaryTone = ToneType.NEUTRAL;

    for (const [tone, score] of scores) {
      if (score > maxScore) {
        maxScore = score;
        primaryTone = tone;
      }
    }

    // If no strong tone detected, default to neutral
    if (maxScore < 5) {
      return ToneType.NEUTRAL;
    }

    return primaryTone;
  }

  /**
   * Determine secondary tones
   */
  private determineSecondaryTones(
    scores: Map<ToneType, number>, 
    primaryTone: ToneType
  ): ToneType[] {
    const secondary: ToneType[] = [];
    
    for (const [tone, score] of scores) {
      if (tone !== primaryTone && score > 3) {
        secondary.push(tone);
      }
    }

    return secondary.sort((a, b) => 
      (scores.get(b) || 0) - (scores.get(a) || 0)
    ).slice(0, 2);
  }

  /**
   * Analyze formality level
   */
  private analyzeFormality(content: string): FormalityAnalysis {
    let formalityScore = 50; // Start neutral
    const indicators: string[] = [];

    for (const indicator of this.formalityIndicators) {
      const matches = content.match(indicator.indicator);
      if (matches) {
        formalityScore += indicator.score * matches.length;
        indicators.push(`${indicator.type}: ${matches.length}`);
      }
    }

    // Check sentence structure complexity
    const sentences = content.split(/[.!?]+/);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
    
    if (avgSentenceLength > 20) {
      formalityScore += 10;
      indicators.push('complex sentences');
    } else if (avgSentenceLength < 10) {
      formalityScore -= 10;
      indicators.push('simple sentences');
    }

    // Normalize score
    formalityScore = Math.max(0, Math.min(100, formalityScore));

    return {
      score: formalityScore,
      level: this.determineFormalityLevel(formalityScore),
      indicators
    };
  }

  /**
   * Determine formality level
   */
  private determineFormalityLevel(score: number): FormalityLevel {
    if (score >= 75) return FormalityLevel.FORMAL;
    if (score >= 60) return FormalityLevel.PROFESSIONAL;
    if (score >= 40) return FormalityLevel.CONVERSATIONAL;
    return FormalityLevel.CASUAL;
  }

  /**
   * Detect emotions in content
   */
  private detectEmotions(content: string): EmotionAnalysis {
    const emotionScores = new Map<EmotionType, number>();
    const detected: DetectedEmotion[] = [];

    for (const [emotion, indicators] of this.emotionalIndicators) {
      let score = 0;
      const matches: string[] = [];

      for (const pattern of indicators) {
        const patternMatches = content.match(pattern);
        if (patternMatches) {
          score += patternMatches.length;
          matches.push(...patternMatches);
        }
      }

      if (score > 0) {
        emotionScores.set(emotion, score);
        detected.push({
          emotion,
          intensity: Math.min(100, score * 20),
          indicators: matches
        });
      }
    }

    return {
      primaryEmotion: this.determinePrimaryEmotion(emotionScores),
      emotionScores: Object.fromEntries(emotionScores),
      detected,
      valence: this.calculateValence(emotionScores)
    };
  }

  /**
   * Determine primary emotion
   */
  private determinePrimaryEmotion(scores: Map<EmotionType, number>): EmotionType | null {
    let maxScore = 0;
    let primaryEmotion: EmotionType | null = null;

    for (const [emotion, score] of scores) {
      if (score > maxScore) {
        maxScore = score;
        primaryEmotion = emotion;
      }
    }

    return primaryEmotion;
  }

  /**
   * Calculate emotional valence
   */
  private calculateValence(scores: Map<EmotionType, number>): number {
    const positiveEmotions = [EmotionType.JOY, EmotionType.SURPRISE];
    const negativeEmotions = [EmotionType.ANGER, EmotionType.SADNESS, EmotionType.FEAR];

    let positiveScore = 0;
    let negativeScore = 0;

    for (const [emotion, score] of scores) {
      if (positiveEmotions.includes(emotion)) {
        positiveScore += score;
      } else if (negativeEmotions.includes(emotion)) {
        negativeScore += score;
      }
    }

    if (positiveScore + negativeScore === 0) return 0;
    return ((positiveScore - negativeScore) / (positiveScore + negativeScore)) * 100;
  }

  /**
   * Analyze tone consistency
   */
  private analyzeConsistency(toneScores: Map<ToneType, number>): ConsistencyAnalysis {
    const significantTones = Array.from(toneScores.entries())
      .filter(([_, score]) => score > 5);

    const isConsistent = significantTones.length <= 2;
    const conflictingTones = this.findConflictingTones(significantTones.map(([tone, _]) => tone));

    return {
      isConsistent,
      score: isConsistent ? 100 - (significantTones.length - 1) * 20 : 50,
      conflictingTones,
      dominantToneStrength: Math.max(...toneScores.values())
    };
  }

  /**
   * Find conflicting tones
   */
  private findConflictingTones(tones: ToneType[]): ToneConflict[] {
    const conflicts: ToneConflict[] = [];
    const conflictPairs = [
      [ToneType.CASUAL, ToneType.PROFESSIONAL],
      [ToneType.FRIENDLY, ToneType.AGGRESSIVE],
      [ToneType.CONFIDENT, ToneType.UNCERTAIN]
    ];

    for (const [tone1, tone2] of conflictPairs) {
      if (tones.includes(tone1) && tones.includes(tone2)) {
        conflicts.push({
          tone1,
          tone2,
          severity: 'high'
        });
      }
    }

    return conflicts;
  }

  /**
   * Analyze appropriateness for context
   */
  private analyzeAppropriateness(
    tone: ToneType,
    formality: FormalityAnalysis,
    context: ToneContext
  ): AppropriatenessAnalysis {
    const expectedTone = context.expectedTone;
    const expectedFormality = context.expectedFormality;

    const toneMatch = tone === expectedTone || 
                     (expectedTone === ToneType.NEUTRAL && tone !== ToneType.AGGRESSIVE);
    
    const formalityMatch = this.isFormalityAppropriate(
      formality.level, 
      expectedFormality
    );

    const issues: string[] = [];
    if (!toneMatch) {
      issues.push(`Tone is ${tone} but ${expectedTone} is expected`);
    }
    if (!formalityMatch) {
      issues.push(`Formality is ${formality.level} but ${expectedFormality} is expected`);
    }

    return {
      isAppropriate: toneMatch && formalityMatch,
      toneMatch,
      formalityMatch,
      score: (toneMatch ? 50 : 0) + (formalityMatch ? 50 : 0),
      issues
    };
  }

  /**
   * Check if formality is appropriate
   */
  private isFormalityAppropriate(
    actual: FormalityLevel,
    expected: FormalityLevel
  ): boolean {
    const levels = [
      FormalityLevel.CASUAL,
      FormalityLevel.CONVERSATIONAL,
      FormalityLevel.PROFESSIONAL,
      FormalityLevel.FORMAL
    ];

    const actualIndex = levels.indexOf(actual);
    const expectedIndex = levels.indexOf(expected);

    // Allow one level of variance
    return Math.abs(actualIndex - expectedIndex) <= 1;
  }

  /**
   * Generate tone recommendations
   */
  private generateToneRecommendations(
    tone: ToneType,
    formality: FormalityAnalysis,
    consistency: ConsistencyAnalysis,
    appropriateness: AppropriatenessAnalysis | null,
    context?: ToneContext
  ): ToneRecommendation[] {
    const recommendations: ToneRecommendation[] = [];

    // Consistency recommendations
    if (!consistency.isConsistent) {
      recommendations.push({
        type: 'consistency',
        priority: 'high',
        description: 'Tone is inconsistent throughout the content',
        suggestion: 'Maintain a consistent tone by removing conflicting language',
        impact: 'Improves message clarity and professionalism'
      });
    }

    // Appropriateness recommendations
    if (appropriateness && !appropriateness.isAppropriate) {
      appropriateness.issues.forEach(issue => {
        recommendations.push({
          type: 'appropriateness',
          priority: 'high',
          description: issue,
          suggestion: `Adjust tone to match ${context?.expectedTone} expectations`,
          impact: 'Ensures message is well-received by target audience'
        });
      });
    }

    // Formality recommendations
    if (context && formality.level !== context.expectedFormality) {
      const suggestion = formality.score > 50 ? 
        'Use simpler language and shorter sentences' :
        'Use more professional language and complete sentences';
      
      recommendations.push({
        type: 'formality',
        priority: 'medium',
        description: `Formality level (${formality.level}) doesn't match expectations`,
        suggestion,
        impact: 'Better aligns with audience expectations'
      });
    }

    return recommendations;
  }

  /**
   * Calculate confidence in analysis
   */
  private calculateConfidence(
    toneScores: Map<ToneType, number>,
    consistency: ConsistencyAnalysis
  ): number {
    const maxScore = Math.max(...toneScores.values());
    const consistencyFactor = consistency.score / 100;
    
    // Higher confidence when tone is clear and consistent
    return Math.min(100, maxScore * 2 * consistencyFactor);
  }
}

/**
 * Types and interfaces
 */
export enum ToneType {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  FRIENDLY = 'friendly',
  AGGRESSIVE = 'aggressive',
  AUTHORITATIVE = 'authoritative',
  CONFIDENT = 'confident',
  UNCERTAIN = 'uncertain',
  ENTHUSIASTIC = 'enthusiastic',
  NEUTRAL = 'neutral'
}

export enum FormalityLevel {
  CASUAL = 'casual',
  CONVERSATIONAL = 'conversational',
  PROFESSIONAL = 'professional',
  FORMAL = 'formal'
}

export enum EmotionType {
  JOY = 'joy',
  ANGER = 'anger',
  SADNESS = 'sadness',
  FEAR = 'fear',
  SURPRISE = 'surprise',
  DISGUST = 'disgust',
  TRUST = 'trust',
  ANTICIPATION = 'anticipation'
}

export interface ToneContext {
  expectedTone: ToneType;
  expectedFormality: FormalityLevel;
  audience?: string;
  purpose?: string;
  channel?: string;
}

export interface ToneAnalysisResult {
  primaryTone: ToneType;
  secondaryTones: ToneType[];
  toneScores: Map<ToneType, number>;
  formality: FormalityAnalysis;
  emotions: EmotionAnalysis;
  consistency: ConsistencyAnalysis;
  appropriateness: AppropriatenessAnalysis | null;
  recommendations: ToneRecommendation[];
  confidence: number;
}

export interface ToneIndicator {
  patterns: RegExp[];
  weight: number;
  context: string;
}

export interface FormalityIndicator {
  indicator: RegExp;
  score: number;
  type: string;
}

export interface FormalityAnalysis {
  score: number;
  level: FormalityLevel;
  indicators: string[];
}

export interface EmotionAnalysis {
  primaryEmotion: EmotionType | null;
  emotionScores: Record<string, number>;
  detected: DetectedEmotion[];
  valence: number; // -100 (negative) to 100 (positive)
}

export interface DetectedEmotion {
  emotion: EmotionType;
  intensity: number;
  indicators: string[];
}

export interface ConsistencyAnalysis {
  isConsistent: boolean;
  score: number;
  conflictingTones: ToneConflict[];
  dominantToneStrength: number;
}

export interface ToneConflict {
  tone1: ToneType;
  tone2: ToneType;
  severity: 'low' | 'medium' | 'high';
}

export interface AppropriatenessAnalysis {
  isAppropriate: boolean;
  toneMatch: boolean;
  formalityMatch: boolean;
  score: number;
  issues: string[];
}

export interface ToneRecommendation {
  type: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  impact: string;
}