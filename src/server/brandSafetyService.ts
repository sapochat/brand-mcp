import {
  BrandSafetyCategory,
  RiskLevel,
  ContentSafetyResult,
  BrandSafetyEvaluation,
  BrandSafetyConfig,
  DEFAULT_BRAND_SAFETY_CONFIG
} from '../types/brandSafety.js';
import { loadBrandSchema } from '../server/brandSchemaLoader.js'; // Added import

// Placeholder for actual MCP LLM client.
// In a real scenario, this would be imported or injected.
// For now, we'll mock its behavior.
class McpLanguageModel {
  sampling = {
    async createMessage(_payload: { prompt: string }): Promise<{ completion: string }> {
      // Mocked LLM response logic will be in the specific methods
      return { completion: "" };
    }
  }
}

export class BrandSafetyService {
  private config: BrandSafetyConfig;

  private constructor(config: BrandSafetyConfig) { // Private constructor, initializes with a complete BrandSafetyConfig.
    this.config = config;
  }

  public static async createInstance(initialConfig: Partial<BrandSafetyConfig> = {}): Promise<BrandSafetyService> {
    // Merge provided config with defaults, ensuring deep merge for riskTolerances
    const baseConfig: BrandSafetyConfig = {
      ...DEFAULT_BRAND_SAFETY_CONFIG,
      ...initialConfig,
      riskTolerances: {
        ...DEFAULT_BRAND_SAFETY_CONFIG.riskTolerances,
        ...(initialConfig.riskTolerances || {})
      },
      // Ensure other nested objects from DEFAULT_BRAND_SAFETY_CONFIG are also included if not in initialConfig
      // For example, if blockedTopics or sensitiveKeywords were complex objects in DEFAULT_BRAND_SAFETY_CONFIG
      blockedTopics: initialConfig.blockedTopics ? [...initialConfig.blockedTopics] : [...DEFAULT_BRAND_SAFETY_CONFIG.blockedTopics],
      sensitiveKeywords: initialConfig.sensitiveKeywords ? [...initialConfig.sensitiveKeywords] : [...DEFAULT_BRAND_SAFETY_CONFIG.sensitiveKeywords],
      categories: initialConfig.categories ? [...initialConfig.categories] : [...DEFAULT_BRAND_SAFETY_CONFIG.categories],
    };

    try {
      const brandSchemaData = await loadBrandSchema().catch(err => {
        return null;
      });

      if (brandSchemaData && brandSchemaData.terminologyGuidelines?.avoidedGlobalTerms && Array.isArray(brandSchemaData.terminologyGuidelines.avoidedGlobalTerms)) {
        const currentBlockedTopics = baseConfig.blockedTopics || [];
        const termsFromSchema = brandSchemaData.terminologyGuidelines.avoidedGlobalTerms.filter(term => typeof term === 'string');
        
        const mergedBlockedTopics = Array.from(new Set([...currentBlockedTopics, ...termsFromSchema]));
        baseConfig.blockedTopics = mergedBlockedTopics;
      }
    } catch (err) {
      // This catch is for errors within the try block itself, not from loadBrandSchema (which is handled by .catch above)
    }

    return new BrandSafetyService(baseConfig);
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
  async evaluateContent(content: string): Promise<BrandSafetyEvaluation> {
    const evaluationPromises: Promise<ContentSafetyResult>[] = [];

    // Evaluate each category
    for (const category of this.config.categories) {
      // Skip CONTEXTUAL_ANALYSIS here, it will be handled separately for more detailed output
      if (category !== BrandSafetyCategory.CONTEXTUAL_ANALYSIS) {
        evaluationPromises.push(this.evaluateCategory(content, category));
      }
    }

    let evaluations = await Promise.all(evaluationPromises);
    
    let contextualAssessmentData: { assessment: string; explanation: string; riskLevel?: RiskLevel } | undefined = undefined;
    let contextualAnalysisResult: ContentSafetyResult | undefined = undefined;

    if (this.config.categories.includes(BrandSafetyCategory.CONTEXTUAL_ANALYSIS)) {
      contextualAnalysisResult = await this.performContextualLlmAnalysis(content);
      evaluations.push(contextualAnalysisResult); // Add to the list of evaluations
      contextualAssessmentData = {
        assessment: (contextualAnalysisResult as any).llmAssessment || "N/A", // Store raw LLM assessment string
        explanation: contextualAnalysisResult.explanation,
        riskLevel: contextualAnalysisResult.riskLevel
      };
    }
    
    // Determine overall risk level, now considering contextual assessment
    const overallRisk = this.calculateOverallRisk(evaluations, contextualAssessmentData);
    
    // Generate summary, now considering contextual assessment
    const summary = this.generateSummary(evaluations, overallRisk, contextualAssessmentData);
    
    return {
      content,
      evaluations,
      overallRisk,
      summary,
      timestamp: new Date().toISOString(),
      contextualAssessment: contextualAssessmentData
    };
  }

  /**
   * Evaluate content against a specific safety category
   */
  private async evaluateCategory(content: string, category: BrandSafetyCategory): Promise<ContentSafetyResult> {
    // Simple keyword-based evaluation for demonstration purposes
    // In a real implementation, this would use more sophisticated content analysis
    
    const lowerContent = content.toLowerCase();
    let riskLevel = RiskLevel.NONE;
    let explanation = '';

    if (category === BrandSafetyCategory.SENTIMENT_ANALYSIS) {
      return this.evaluateSentiment(content);
    }
    // CONTEXTUAL_ANALYSIS is handled directly in evaluateContent to populate the specific field
    // but if evaluateCategory were to be called for it, it would delegate:
    // if (category === BrandSafetyCategory.CONTEXTUAL_ANALYSIS) {
    //   return this.performContextualLlmAnalysis(content);
    // }

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
      // SENTIMENT_ANALYSIS is handled above
      // CONTEXTUAL_ANALYSIS is handled by performContextualLlmAnalysis and integrated in evaluateContent
    }

    explanation = this.generateExplanation(category, riskLevel, lowerContent);
    return { category, riskLevel, explanation };
  }

  /**
   * Evaluate content sentiment using an LLM
   */
  private async evaluateSentiment(content: string): Promise<ContentSafetyResult> {
    const category = BrandSafetyCategory.SENTIMENT_ANALYSIS;
    const mcpLlmClient = new McpLanguageModel();

    const prompt = `Analyze the sentiment of the following text. Classify it as "positive", "negative", or "neutral". If possible, provide a confidence score between 0 and 1. Return the result as a JSON object with "classification" and "score" fields. Text: "${content}"`;

    try {
      // const llmResponseRaw = await mcpLlmClient.sampling.createMessage({ prompt });
      // For demonstration, simulating LLM response:
      let llmResponseMock: { classification: string; score?: number };
      const lowerContent = content.toLowerCase();
      if (lowerContent.includes("happy") || lowerContent.includes("wonderful") || lowerContent.includes("excellent")) {
        llmResponseMock = { classification: "positive", score: 0.9 };
      } else if (lowerContent.includes("sad") || lowerContent.includes("terrible") || lowerContent.includes("bad")) {
        llmResponseMock = { classification: "negative", score: 0.85 };
      } else {
        llmResponseMock = { classification: "neutral", score: 0.7 };
      }
      // const llmResponse = JSON.parse(llmResponseRaw.completion);
      const llmResponse = llmResponseMock;

      let riskLevel = RiskLevel.NONE;
      let explanation = `Sentiment: ${llmResponse.classification}`;
      if (llmResponse.score !== undefined) {
        explanation += ` (Score: ${llmResponse.score.toFixed(2)})`;
      }

      switch (llmResponse.classification.toLowerCase()) {
        case "positive":
          riskLevel = RiskLevel.NONE;
          break;
        case "neutral":
          riskLevel = RiskLevel.LOW;
          break;
        case "negative":
          riskLevel = RiskLevel.MEDIUM;
          break;
        default:
          riskLevel = RiskLevel.LOW;
          explanation = `Unknown sentiment classification: ${llmResponse.classification}`;
      }
      return { category, riskLevel, explanation };

    } catch (error) {
      return {
        category,
        riskLevel: RiskLevel.NONE,
        explanation: "Sentiment analysis failed or returned an unexpected response."
      };
    }
  }

  /**
   * Perform contextual analysis using an LLM.
   */
  private async performContextualLlmAnalysis(content: string): Promise<ContentSafetyResult & { llmAssessment?: string }> {
    const category = BrandSafetyCategory.CONTEXTUAL_ANALYSIS;
    const mcpLlmClient = new McpLanguageModel(); // Placeholder

    const prompt = `You are a brand safety expert. Analyze the following text for contextual brand safety risks.
Consider the overall context, intent (e.g., informative, educational, satirical vs. malicious, promoting harm), sarcasm, and whether the content is reporting on a sensitive issue versus endorsing or promoting it.
Based on your analysis, provide a risk assessment and a brief explanation.
The risk assessment should be one of: 'safe_in_context', 'borderline_contextual_risk', 'unsafe_due_to_context'.
Return your response as a JSON object with the following fields:
- "assessment": Your risk assessment string.
- "explanation": A brief explanation for your assessment (1-2 sentences).
- "risk_level_suggestion": (Optional) If you can confidently map your assessment to a risk level from ["NONE", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"], provide it here. Otherwise, omit this field.

Text to analyze:
"${content}"`;

    try {
      // const llmResponseRaw = await mcpLlmClient.sampling.createMessage({ prompt });
      // For demonstration, simulating LLM response:
      let llmResponseMock: { assessment: string; explanation: string; risk_level_suggestion?: RiskLevel };
      const lowerContent = content.toLowerCase();

      if (lowerContent.includes("discussing violence for educational purposes")) {
        llmResponseMock = { assessment: "safe_in_context", explanation: "Content discusses violence in an educational context, not promoting it.", risk_level_suggestion: RiskLevel.LOW };
      } else if (lowerContent.includes("clearly satire about a sensitive topic")) {
        llmResponseMock = { assessment: "safe_in_context", explanation: "Content is satirical and not a genuine endorsement of harmful views.", risk_level_suggestion: RiskLevel.LOW };
      } else if (lowerContent.includes("subtle promotion of harmful ideology")) {
        llmResponseMock = { assessment: "unsafe_due_to_context", explanation: "Content subtly promotes harmful ideology under the guise of discussion.", risk_level_suggestion: RiskLevel.HIGH };
      } else if (lowerContent.includes("borderline case with ambiguous intent")) {
        llmResponseMock = { assessment: "borderline_contextual_risk", explanation: "Intent is ambiguous, could be misinterpreted as problematic.", risk_level_suggestion: RiskLevel.MEDIUM };
      } else {
         // Default mock for unhandled cases
        llmResponseMock = { assessment: "safe_in_context", explanation: "Context appears generally safe.", risk_level_suggestion: RiskLevel.NONE };
      }
      // const llmResponse = JSON.parse(llmResponseRaw.completion);
      const llmResponse = llmResponseMock;

      let riskLevel = RiskLevel.NONE;
      const llmAssessment = llmResponse.assessment;
      let explanation = llmResponse.explanation;

      if (llmResponse.risk_level_suggestion) {
        riskLevel = llmResponse.risk_level_suggestion;
      } else {
        // Map assessment string to RiskLevel if no direct suggestion
        switch (llmAssessment) {
          case "safe_in_context":
            riskLevel = RiskLevel.NONE; // Could be LOW if we want to be more cautious
            break;
          case "borderline_contextual_risk":
            riskLevel = RiskLevel.MEDIUM;
            break;
          case "unsafe_due_to_context":
            riskLevel = RiskLevel.HIGH; // Could be VERY_HIGH
            break;
          default:
            riskLevel = RiskLevel.LOW; // Default for unknown assessment
            explanation = `Unknown contextual assessment: ${llmAssessment}. ${explanation}`;
        }
      }
      return { category, riskLevel, explanation, llmAssessment };

    } catch (error) {
      return {
        category,
        riskLevel: RiskLevel.NONE, // Or a specific risk level for error cases
        explanation: "Contextual analysis failed or returned an unexpected response.",
        llmAssessment: "error"
      };
    }
  }

  /**
   * Calculate the overall risk level from individual evaluations
   */
  private calculateOverallRisk(
    evaluations: ContentSafetyResult[],
    contextualAssessment?: { assessment: string; explanation: string; riskLevel?: RiskLevel }
  ): RiskLevel {
    const riskLevels = evaluations.map(evaluation => evaluation.riskLevel);
    const riskValues = {
      [RiskLevel.NONE]: 0,
      [RiskLevel.LOW]: 1,
      [RiskLevel.MEDIUM]: 2,
      [RiskLevel.HIGH]: 3,
      [RiskLevel.VERY_HIGH]: 4
    };

    // Find the highest risk level from standard evaluations
    let highestStandardRiskValue = riskValues[RiskLevel.NONE];
    for (const risk of riskLevels) {
      // Exclude contextual analysis from this initial pass if its risk is derived differently
      const evalResult = evaluations.find(e => e.riskLevel === risk);
      if (evalResult && evalResult.category !== BrandSafetyCategory.CONTEXTUAL_ANALYSIS) {
         if (riskValues[risk] > highestStandardRiskValue) {
           highestStandardRiskValue = riskValues[risk];
         }
      } else if (evalResult && evalResult.category === BrandSafetyCategory.CONTEXTUAL_ANALYSIS && !contextualAssessment?.riskLevel) {
        // If contextual assessment doesn't have its own risk level, use its derived one
        if (riskValues[risk] > highestStandardRiskValue) {
           highestStandardRiskValue = riskValues[risk];
         }
      }
    }

    let overallRiskValue = highestStandardRiskValue;

    // Factor in contextual assessment
    if (contextualAssessment && contextualAssessment.riskLevel) {
      const contextualRiskValue = riskValues[contextualAssessment.riskLevel];
      // Specific logic for how contextual assessment overrides or influences overall risk
      if (contextualAssessment.assessment === "unsafe_due_to_context") {
        overallRiskValue = Math.max(overallRiskValue, riskValues[RiskLevel.HIGH]); // Ensure at least HIGH
        if (contextualRiskValue > overallRiskValue) overallRiskValue = contextualRiskValue;
      } else if (contextualAssessment.assessment === "safe_in_context") {
        // If context says safe, it can downgrade, but not below LOW if other flags exist.
        // Or, if LLM suggests a specific low risk, use that.
        const maxNonContextualRisk = evaluations
          .filter(e => e.category !== BrandSafetyCategory.CONTEXTUAL_ANALYSIS)
          .reduce((max, e) => Math.max(max, riskValues[e.riskLevel]), riskValues[RiskLevel.NONE]);

        if (contextualRiskValue < overallRiskValue) {
           // If LLM suggests a lower risk and context is safe, consider it.
           // Example: keywords flagged HIGH, but context is safe and LLM suggests LOW.
           // We might cap the downgrade or use a more complex rule.
           // For now, let's say if context is safe, the overall risk can be lowered,
           // but not necessarily to the LLM's suggestion if other strong signals exist.
           // A simple approach: if "safe_in_context", cap overall risk at MEDIUM, unless LLM suggests lower.
           if (maxNonContextualRisk >= riskValues[RiskLevel.HIGH] && contextualRiskValue <= riskValues[RiskLevel.MEDIUM]) {
               overallRiskValue = Math.min(overallRiskValue, riskValues[RiskLevel.MEDIUM]); // Cap at medium if previously high
               overallRiskValue = Math.min(overallRiskValue, contextualRiskValue); // Allow LLM to pull lower if it suggests
           } else {
                overallRiskValue = Math.min(overallRiskValue, contextualRiskValue);
           }
           // Ensure it doesn't go below the LLM's suggested risk level for "safe_in_context"
           overallRiskValue = Math.min(overallRiskValue, contextualRiskValue);

        }
         // If everything else is NONE, and context is safe and suggests NONE, it remains NONE.
         if (maxNonContextualRisk === riskValues[RiskLevel.NONE] && contextualRiskValue === riskValues[RiskLevel.NONE]) {
           overallRiskValue = riskValues[RiskLevel.NONE];
         }


      } else if (contextualAssessment.assessment === "borderline_contextual_risk") {
        overallRiskValue = Math.max(overallRiskValue, contextualRiskValue); // Take the higher of the two
        overallRiskValue = Math.max(overallRiskValue, riskValues[RiskLevel.MEDIUM]); // Ensure at least MEDIUM for borderline
      } else {
        // If contextual assessment has a risk level but no specific assessment string match
        overallRiskValue = Math.max(overallRiskValue, contextualRiskValue);
      }
    } else if (contextualAssessment && !contextualAssessment.riskLevel) {
       // If contextual assessment exists but didn't provide a direct risk level,
       // its derived risk level from performContextualLlmAnalysis would have been in 'evaluations'
       const contextualEval = evaluations.find(e => e.category === BrandSafetyCategory.CONTEXTUAL_ANALYSIS);
       if (contextualEval) {
           const contextualRiskValue = riskValues[contextualEval.riskLevel];
            if (contextualAssessment.assessment === "unsafe_due_to_context") {
               overallRiskValue = Math.max(overallRiskValue, riskValues[RiskLevel.HIGH]);
            } else if (contextualAssessment.assessment === "borderline_contextual_risk") {
               overallRiskValue = Math.max(overallRiskValue, riskValues[RiskLevel.MEDIUM]);
            }
           // Potentially other rules here based on assessment string
           overallRiskValue = Math.max(overallRiskValue, contextualRiskValue);
       }
    }

    // Convert back to RiskLevel
    const riskLevelEntries = Object.entries(riskValues);
    for (const [level, value] of riskLevelEntries) {
      if (value === overallRiskValue) {
        return level as RiskLevel;
      }
    }

    return RiskLevel.NONE; // Default
  }

  /**
   * Generate a summary of the brand safety evaluation
   */
  private generateSummary(
    evaluations: ContentSafetyResult[],
    overallRisk: RiskLevel,
    contextualAssessment?: { assessment: string; explanation: string; riskLevel?: RiskLevel }
  ): string {
    const highRiskCategories = evaluations
      .filter(evaluation => (evaluation.riskLevel === RiskLevel.HIGH || evaluation.riskLevel === RiskLevel.VERY_HIGH) && evaluation.category !== BrandSafetyCategory.CONTEXTUAL_ANALYSIS)
      .map(evaluation => evaluation.category);
    
    const mediumRiskCategories = evaluations
      .filter(evaluation => evaluation.riskLevel === RiskLevel.MEDIUM && evaluation.category !== BrandSafetyCategory.CONTEXTUAL_ANALYSIS)
      .map(evaluation => evaluation.category);
    
    const sentimentEvaluation = evaluations.find(ev => ev.category === BrandSafetyCategory.SENTIMENT_ANALYSIS);
    let sentimentSummary = "";
    if (sentimentEvaluation) {
      sentimentSummary = ` Sentiment: ${sentimentEvaluation.explanation.replace('Sentiment: ', '')}.`;
    }

    let contextualSummary = "";
    if (contextualAssessment) {
      contextualSummary = ` Contextual Analysis: ${contextualAssessment.assessment} - ${contextualAssessment.explanation}.`;
    }

    let baseSummary = "";

    if (overallRisk === RiskLevel.VERY_HIGH) {
      baseSummary = `UNSAFE: Content poses very high risk.`;
      if (highRiskCategories.length > 0) baseSummary += ` High risk in: ${highRiskCategories.join(', ')}.`;
    } else if (overallRisk === RiskLevel.HIGH) {
      baseSummary = `HIGH RISK: Content has high risk factors.`;
      if (highRiskCategories.length > 0) baseSummary += ` High risk in: ${highRiskCategories.join(', ')}.`;
    } else if (overallRisk === RiskLevel.MEDIUM) {
      baseSummary = `CAUTION: Content has moderate risk.`;
      if (mediumRiskCategories.length > 0) baseSummary += ` Moderate risk in: ${mediumRiskCategories.join(', ')}.`;
      else if (highRiskCategories.length > 0) baseSummary += ` Factors contributed from: ${highRiskCategories.join(', ')}.`; // If context downgraded
    } else if (overallRisk === RiskLevel.LOW) {
      baseSummary = `LOW RISK: Content has minimal brand safety concerns.`;
    } else {
      baseSummary = `SAFE: Content appears safe for brand association.`;
    }
    
    return `${baseSummary}${contextualSummary}${sentimentSummary}`.trim();
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
      'provocative', 'seductive' // Removed 'bedroom'
    ];
    const lowRiskTerms = [
      'kissing', 'romance', 'dating', // Removed 'relationship', 'love', 'attraction'
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
    
    // Helper function to create the regex safely
    const createBoundaryRegex = (term: string): RegExp => {
      const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escapedTerm}\\b`, 'i');
    };

    // Check for high risk phrases using word boundaries
    if (highRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.HIGH;
    }
    
    // Check for medium risk phrases using word boundaries
    if (mediumRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.MEDIUM;
    }

    // Check terms using word boundaries
    if (highRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.MEDIUM;
    } else if (lowRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.LOW;
    }
    return RiskLevel.NONE;
  }

  private checkForViolence(content: string): RiskLevel {
    const highRiskTerms = ['murder', 'killing', 'terrorist attack', 'death', 'harm', 'hurt']; // Removed 'kill', 'destroy'
    const mediumRiskTerms = [
      'fight', 'assault', 'violent', 'attack', 'punch', 'kick', 'suffer', // Removed 'beat', 'hit'
      'pain', 'blood', 'wound', 'injury' // Removed 'damage'
    ];
    const lowRiskTerms = [
      'tension', 'combat', 'aggressive', // Removed 'conflict', 'argument', 'battle', 'force'
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
    
    // Helper function to create the regex safely
    const createBoundaryRegex = (term: string): RegExp => {
      const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escapedTerm}\\b`, 'i');
    };

    // Check for high risk phrases using word boundaries
    if (highRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.HIGH;
    }
    
    // Check for medium risk phrases using word boundaries
    if (mediumRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.MEDIUM;
    }

    // Check terms using word boundaries
    if (highRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.MEDIUM;
    } else if (lowRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
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
      'discriminatory', 'prejudice', 'stereotyping', 'derogatory', // Removed 'offensive'
      'intolerant', 'biased', 'hateful' // Removed 'hate'
    ];
    const lowRiskTerms = [
      'insensitive', 'generalization', 'stereotype' // Removed 'controversial'
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
    
    // Helper function to create the regex safely
    const createBoundaryRegex = (term: string): RegExp => {
      const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escapedTerm}\\b`, 'i');
    };

    // Check for high risk phrases using word boundaries
    if (highRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.VERY_HIGH;
    }
    
    // Check for medium risk phrases using word boundaries
    if (mediumRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.HIGH;
    }
    
    // Check terms using word boundaries
    if (highRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.VERY_HIGH;
    } else if (mediumRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.HIGH;
    } else if (lowRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.NONE;
  }

  private checkForHarassment(content: string): RiskLevel {
    const highRiskTerms = ['harassment', 'bullying', 'stalking', 'threaten']; // Removed 'threat'
    const mediumRiskTerms = [
      'intimidation', 'threatening', 'mocking', 'bully', 'humiliate', // Removed 'mock'
      'ridicule', 'shame', 'embarrass' // Removed 'target'
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
    
    // Helper function to create the regex safely
    const createBoundaryRegex = (term: string): RegExp => {
      const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escapedTerm}\\b`, 'i');
    };

    // Check for high risk phrases using word boundaries
    if (highRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.HIGH;
    }
    
    // Check for medium risk phrases using word boundaries
    if (mediumRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.MEDIUM;
    }
    
    // Check terms using word boundaries
    if (highRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
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
    
    // Helper function to create the regex safely
    const createBoundaryRegex = (term: string): RegExp => {
      const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escapedTerm}\\b`, 'i');
    };

    // Check for high risk phrases using word boundaries
    if (highRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.VERY_HIGH;
    }
    
    // Check for medium risk phrases using word boundaries
    if (mediumRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.HIGH;
    }
    
    // Check terms using word boundaries
    if (highRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.VERY_HIGH;
    } else if (mediumRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.HIGH;
    } else if (lowRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
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
      'fraud', 'counterfeit', 'illegal', 'theft', 'stolen', // Removed 'hacking'
      'black market', 'dark web', 'scam' // Removed 'criminal'
    ];
    const lowRiskTerms = [
      'copyright infringement', 'circumvent', // Removed 'piracy', 'downloading'
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
    
    // Helper function to create the regex safely
    const createBoundaryRegex = (term: string): RegExp => {
      const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escapedTerm}\\b`, 'i');
    };

    // Check for high risk phrases using word boundaries
    if (highRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.VERY_HIGH;
    }
    
    // Check for medium risk phrases using word boundaries
    if (mediumRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.HIGH;
    }
    
    // Check terms using word boundaries
    if (highRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.VERY_HIGH;
    } else if (mediumRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.HIGH;
    } else if (lowRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
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
      'crap', 'piss', 'idiot', 'stupid', // Removed 'damn', 'hell', 'suck', 'screw', 'jerk'
      'dumb', 'moron', 'freak', 'wtf', 'stfu', 'lmfao'
    ];
    const lowRiskTerms = [
      'heck', 'darn', 'gosh', 'fudge', 'dang', 'freaking', 'hella' // Removed 'shoot'
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
    
    // Helper function to create the regex safely
    const createBoundaryRegex = (term: string): RegExp => {
      const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      // Special handling for terms with asterisks (already partially regex-like)
      // We'll assume they are meant to match variations, so don't add word boundaries
      if (term.includes('*')) {
        return new RegExp(escapedTerm.replace(/\*/g, '[^\\s]*'), 'i'); // Allow variations
      }
      return new RegExp(`\\b${escapedTerm}\\b`, 'i');
    };

    // Check for phrases with negative modifiers using word boundaries
    const contextualPhrases = [
      'what the f', 'f ing', 'freaking idiot', 'effing',
      'shut the f up', 'shut up', 'go to hell'
    ];
    
    if (contextualPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.MEDIUM;
    }
    
    // Check terms using word boundaries (or modified regex for asterisk terms)
    if (highRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.MEDIUM;
    } else if (lowRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
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
      // Removed 'bar', 'drink', 'party', 'smoke' due to ambiguity
      'pub', 'nightclub', 'cocktail', 'happy hour',
      'drinking', 'brewery', 'winery'
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
    
    // Use word boundaries for more precise term matching (case-insensitive)
    if (highRiskTerms.some(term => new RegExp(`\\b${term}\\b`, 'i').test(content))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => new RegExp(`\\b${term}\\b`, 'i').test(content))) {
      return RiskLevel.MEDIUM;
    } else if (lowRiskTerms.some(term => new RegExp(`\\b${term}\\b`, 'i').test(content))) {
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
      'political party', 'politician', 'democrat', 'republican', // Removed 'election'
      'liberal', 'conservative', 'left-wing', 'right-wing', 'campaign',
      'voter', 'politically' // Removed 'vote', 'political', 'politics'
    ];
    const lowRiskTerms = [
      'democratic', 'administration', // Removed 'policy', 'government', 'democracy'
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
    
    // Helper function to create the regex safely
    const createBoundaryRegex = (term: string): RegExp => {
      const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escapedTerm}\\b`, 'i');
    };

    // Check for high risk phrases using word boundaries
    if (highRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.HIGH;
    }
    
    // Check for medium risk phrases using word boundaries
    if (mediumRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.MEDIUM;
    }
    
    // Check terms using word boundaries
    if (highRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.MEDIUM;
    } else if (lowRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
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
      'religious', 'worship', 'mosque', 'temple', // Removed 'religion', 'faith', 'church'
      'synagogue', 'prayer', 'bible', 'quran', 'torah', 'allah', // Removed 'pray', 'god'
      'jesus', 'muhammad', 'buddha', 'christian', 'muslim', 'jew', 'hindu', 'sikh'
    ];
    const lowRiskTerms = [
      'spiritual', 'tradition', 'blessing', 'congregation', // Removed 'belief'
      'divine', 'ceremony', 'ritual', 'faith-based' // Removed 'holy', 'sacred'
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
    
    // Helper function to create the regex safely
    const createBoundaryRegex = (term: string): RegExp => {
      const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escapedTerm}\\b`, 'i');
    };

    // Check for high risk phrases using word boundaries
    if (highRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.HIGH;
    }
    
    // Check for medium risk phrases using word boundaries
    if (mediumRiskPhrases.some(phrase => createBoundaryRegex(phrase).test(content))) {
      return RiskLevel.MEDIUM;
    }
    
    // Check terms using word boundaries
    if (highRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.MEDIUM;
    } else if (lowRiskTerms.some(term => createBoundaryRegex(term).test(content))) {
      return RiskLevel.LOW;
    }
    return RiskLevel.NONE;
  }
} 