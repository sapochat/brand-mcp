import { SafetyEvaluationService, SafetyConfig } from '../SafetyEvaluationService.js';
import { Content } from '../../entities/Content.js';
import { SafetyEvaluation, CategoryEvaluation, RiskLevel } from '../../entities/SafetyEvaluation.js';

/**
 * Domain service implementation for content safety evaluation
 */
export class SafetyEvaluationServiceImpl implements SafetyEvaluationService {
  private config: SafetyConfig;

  // Default safety categories and their patterns
  private readonly safetyCategories = {
    'Sexual Content': {
      patterns: ['sexual', 'explicit', 'adult', 'nsfw', 'pornographic', 'erotic'],
      phrases: [/sexual content/i, /adult material/i, /explicit material/i]
    },
    'Violence': {
      patterns: ['violence', 'violent', 'kill', 'murder', 'assault', 'attack', 'weapon', 'gun', 'knife'],
      phrases: [/physical harm/i, /violent action/i, /deadly force/i]
    },
    'Hate Speech': {
      patterns: ['hate', 'racist', 'discrimination', 'prejudice', 'bigot'],
      phrases: [/hate speech/i, /discriminatory language/i, /racial slurs/i]
    },
    'Harassment': {
      patterns: ['harass', 'bully', 'intimidate', 'threaten', 'stalk'],
      phrases: [/personal attack/i, /threatening behavior/i, /cyberbullying/i]
    },
    'Self-Harm': {
      patterns: ['suicide', 'self-harm', 'cutting', 'overdose', 'self-injury'],
      phrases: [/suicidal thoughts/i, /self-destructive/i, /harm yourself/i]
    },
    'Illegal Activities': {
      patterns: ['illegal', 'crime', 'criminal', 'drugs', 'trafficking', 'fraud'],
      phrases: [/illegal activity/i, /criminal behavior/i, /drug dealing/i]
    },
    'Profanity': {
      patterns: ['damn', 'hell', 'crap', 'shit', 'fuck', 'bitch', 'asshole'],
      phrases: [/inappropriate language/i, /offensive terms/i]
    },
    'Alcohol/Tobacco': {
      patterns: ['alcohol', 'beer', 'wine', 'tobacco', 'cigarette', 'smoking'],
      phrases: [/alcoholic beverage/i, /tobacco product/i, /drinking alcohol/i]
    },
    'Political Content': {
      patterns: ['political', 'election', 'candidate', 'government', 'policy', 'politician'],
      phrases: [/political opinion/i, /government policy/i, /election campaign/i]
    },
    'Religious Content': {
      patterns: ['religious', 'religion', 'god', 'church', 'faith', 'prayer', 'bible'],
      phrases: [/religious belief/i, /spiritual practice/i, /religious doctrine/i]
    }
  };

  constructor(config: SafetyConfig) {
    this.config = { ...config };
  }

  async evaluateContent(content: Content): Promise<SafetyEvaluation> {
    const categoryEvaluations: CategoryEvaluation[] = [];
    const text = content.normalizedText.toLowerCase();

    // Evaluate each safety category
    for (const [categoryName, categoryData] of Object.entries(this.safetyCategories)) {
      const evaluation = this.evaluateCategory(categoryName, categoryData, text);
      categoryEvaluations.push(evaluation);
    }

    // Determine overall risk level
    const overallRisk = this.determineOverallRisk(categoryEvaluations);
    
    // Generate summary
    const summary = this.generateSummary(overallRisk, categoryEvaluations);

    return new SafetyEvaluation(content, overallRisk, categoryEvaluations, summary);
  }

  updateConfig(config: Partial<SafetyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private evaluateCategory(
    categoryName: string, 
    categoryData: { patterns: string[], phrases: RegExp[] }, 
    text: string
  ): CategoryEvaluation {
    let riskLevel = RiskLevel.NONE;
    let explanation = `No ${categoryName.toLowerCase()} detected.`;

    // Check for sensitive keywords from config
    const sensitivematches = this.config.sensitiveKeywords.some(keyword => 
      text.includes(keyword.toLowerCase())
    );

    // Check patterns
    const patternMatches = categoryData.patterns.some(pattern => 
      text.includes(pattern.toLowerCase())
    );

    // Check phrase patterns
    const phraseMatches = categoryData.phrases.some(phrase => 
      phrase.test(text)
    );

    // Determine risk level based on matches
    if (sensitivematches || patternMatches || phraseMatches) {
      // Check blocked topics
      const isBlockedTopic = this.config.blockedTopics.some(topic => 
        text.includes(topic.toLowerCase())
      );
      
      if (isBlockedTopic) {
        riskLevel = RiskLevel.HIGH;
        explanation = `High risk ${categoryName.toLowerCase()} detected in blocked topic area.`;
      } else {
        // Check allowed topics for mitigation
        const isAllowedTopic = this.config.allowedTopics.some(topic => 
          text.includes(topic.toLowerCase())
        );
        
        if (isAllowedTopic) {
          riskLevel = RiskLevel.LOW;
          explanation = `${categoryName} detected but within allowed topic context.`;
        } else {
          riskLevel = RiskLevel.MEDIUM;
          explanation = `Moderate ${categoryName.toLowerCase()} detected.`;
        }
      }
    }

    return new CategoryEvaluation(categoryName, riskLevel, explanation);
  }

  private determineOverallRisk(evaluations: CategoryEvaluation[]): RiskLevel {
    const riskLevels = evaluations.map(e => e.riskLevel);

    // If any category has VERY_HIGH risk, overall is VERY_HIGH
    if (riskLevels.includes(RiskLevel.VERY_HIGH)) return RiskLevel.VERY_HIGH;
    
    // If any category has HIGH risk, overall is HIGH
    if (riskLevels.includes(RiskLevel.HIGH)) return RiskLevel.HIGH;
    
    // If multiple categories have MEDIUM risk, escalate to HIGH
    const mediumCount = riskLevels.filter(r => r === RiskLevel.MEDIUM).length;
    if (mediumCount >= 2) return RiskLevel.HIGH;
    
    // If any category has MEDIUM risk, overall is MEDIUM
    if (riskLevels.includes(RiskLevel.MEDIUM)) return RiskLevel.MEDIUM;
    
    // If any category has LOW risk, overall is LOW
    if (riskLevels.includes(RiskLevel.LOW)) return RiskLevel.LOW;
    
    // If no risks detected, overall is NONE
    return RiskLevel.NONE;
  }

  private generateSummary(overallRisk: RiskLevel, evaluations: CategoryEvaluation[]): string {
    const riskyCategories = evaluations
      .filter(e => e.riskLevel !== RiskLevel.NONE && e.riskLevel !== RiskLevel.LOW)
      .map(e => e.category);

    switch (overallRisk) {
      case RiskLevel.NONE:
        return 'Content appears safe with no significant risks detected.';
      case RiskLevel.LOW:
        return 'Content has minimal risks and is generally acceptable for most brands.';
      case RiskLevel.MEDIUM:
        return `Content has moderate risks in: ${riskyCategories.join(', ')}. Review recommended.`;
      case RiskLevel.HIGH:
        return `Content has high risks in: ${riskyCategories.join(', ')}. Not recommended for brand association.`;
      case RiskLevel.VERY_HIGH:
        return `Content has extreme risks in: ${riskyCategories.join(', ')}. Incompatible with brand safety.`;
      default:
        return 'Content safety could not be determined.';
    }
  }
}