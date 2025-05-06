import * as fs from 'fs';
import * as path from 'path';
import { BrandSchema, BrandComplianceIssue, BrandComplianceResult } from '../types/brandSchema.js';

export class BrandService {
  private brandSchema: BrandSchema | null = null;
  private defaultContext: string = 'general';
  
  // Technical terms that are exempt from tone analysis
  private technicalTermsAllowlist: string[] = [
    'api', 'sdk', 'ui', 'ux', 'http', 'rest', 'json', 'xml', 'database', 'server',
    'client', 'interface', 'framework', 'library', 'component', 'function', 'class',
    'algorithm', 'parameter', 'configuration', 'deployment', 'integration', 'authentication',
    'content recognition system', 'machine learning', 'artificial intelligence', 'neural network',
    'data processing', 'software', 'hardware', 'platform', 'architecture', 'infrastructure',
    'repository', 'codebase', 'pipeline', 'workflow', 'backend', 'frontend', 'fullstack'
  ];
  
  // Technical contexts that should have relaxed tone requirements
  private technicalContexts: string[] = [
    'technical-documentation', 'api-reference', 'developer-guide', 
    'product-specs', 'technical-specs', 'feature-description',
    'technical-support', 'code-example', 'implementation-guide'
  ];

  // Phrase-level patterns for more accurate tone detection
  private phrasePatterns: Record<string, RegExp[]> = {
    'condescending': [
      /as (everyone|anybody) knows/i,
      /it('s| is) (very |really |quite )?(simple|easy|obvious)/i,
      /even a (child|beginner) could/i,
      /if you (just|simply) (read|understood|knew)/i,
      /of course|needless to say/i
    ],
    'pessimistic': [
      /unlikely to (succeed|work)/i,
      /bound to (fail|disappoint)/i,
      /don't expect (much|good results)/i,
      /(won't|will not) (work|succeed|help)/i,
      /too (difficult|hard|complex) to/i,
      /never (works|succeeds)/i
    ],
    'overly technical': [
      /leveraging the (architecture|framework|system)/i,
      /utilizing (advanced|complex) (algorithms|systems)/i,
      /implementing (sophisticated|complex) (mechanisms|protocols)/i,
      /technical (specifications|parameters|considerations)/i
    ],
    'confident': [
      /we (guarantee|ensure|promise)/i,
      /you can (count on|rely on|trust)/i,
      /(guaranteed|certain|definite) (results|outcome)/i,
      /we're (confident|certain|sure) that/i
    ],
    'approachable': [
      /let('s| us) (explore|discover|learn)/i,
      /we'd love (to hear|to help)/i,
      /feel free to/i,
      /we're here (to help|for you)/i
    ]
  };

  // Domain-specific exemptions beyond technical terms
  private domainExemptions: Record<string, string[]> = {
    'marketing': [
      'campaign', 'promotion', 'limited time', 'exclusive', 'offering',
      'launch', 'announce', 'introducing', 'new', 'improved', 'featuring',
      'special', 'offer', 'discount', 'premium', 'value', 'benefits'
    ],
    'legal': [
      'terms', 'conditions', 'agreement', 'liability', 'warranty',
      'disclaimer', 'rights', 'confidential', 'privacy', 'compliance',
      'legal', 'law', 'regulation', 'policy', 'guideline', 'procedure'
    ],
    'educational': [
      'learn', 'study', 'understand', 'concept', 'lesson', 'tutorial',
      'guide', 'explanation', 'introduction', 'basics', 'fundamentals'
    ]
  };

  // Define content types beyond technical
  private contentTypes: string[] = [
    'technical', 'marketing', 'legal', 'educational', 'conversational'
  ];

  // Store examples of false positives for learning - Will be updated later
  private falsePositives: Array<{issue: BrandComplianceIssue, content: string, context: string}> = []; // Added context

  // --- Persistent Learning ---
  private learningDataPath = path.resolve(__dirname, '../../data/learning.json');
  private dataDir = path.dirname(this.learningDataPath);

  private learningData: {
    allowlistedTerms: Record<string, string[]>; // Key: content-type, Value: array of terms
    contextAllowlists: Record<string, string[]>; // Key: context, Value: array of terms
    confidenceThresholds: Record<string, number>; // Key: issue type, Value: threshold (0-1)
    patternWeights: Record<string, Record<string, number>>; // Placeholder
    contextSensitivity: Record<string, number>; // Key: context, Value: multiplier
  } = {
    allowlistedTerms: {},
    contextAllowlists: {},
    confidenceThresholds: { // Default thresholds
      'tone': 0.7,
      'voice': 0.7,
      'terminology': 0.8
    },
    patternWeights: {}, // Initialize empty
    contextSensitivity: { // Default sensitivity
      'general': 1.0,
      'technical-documentation': 0.8, // Less sensitive in technical docs
      'marketing': 1.1 // Slightly more sensitive in marketing
    }
  };

  constructor(brandSchema?: BrandSchema) {
    if (brandSchema) {
      this.setBrandSchema(brandSchema);
    }
    this.loadLearningData(); // Load learning data on initialization
  }

  /**
   * Load learning data from the JSON file.
   */
  private loadLearningData(): void {
    try {
      if (fs.existsSync(this.learningDataPath)) {
        const data = fs.readFileSync(this.learningDataPath, 'utf-8');
        const parsedData = JSON.parse(data);

        // Basic validation/merge (can be more robust)
        this.learningData = {
          ...this.learningData, // Keep defaults if file is missing keys
          ...parsedData,
          // Ensure nested objects exist if file was partial
          allowlistedTerms: parsedData.allowlistedTerms || {},
          contextAllowlists: parsedData.contextAllowlists || {},
          confidenceThresholds: parsedData.confidenceThresholds || this.learningData.confidenceThresholds,
          patternWeights: parsedData.patternWeights || {},
          contextSensitivity: parsedData.contextSensitivity || this.learningData.contextSensitivity,
        };
        console.log(`Learning data loaded from ${this.learningDataPath}`);
      } else {
        console.log(`Learning data file not found at ${this.learningDataPath}. Using defaults.`);
        // Optionally save defaults on first run: this.saveLearningData();
      }
    } catch (error) {
      console.error(`Error loading learning data from ${this.learningDataPath}:`, error);
      // Use default data in case of error
    }
  }

  /**
   * Save the current learning data to the JSON file.
   */
  private saveLearningData(): void {
    try {
      // Ensure the data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        console.log(`Created data directory: ${this.dataDir}`);
      }

      const data = JSON.stringify(this.learningData, null, 2); // Pretty print JSON
      fs.writeFileSync(this.learningDataPath, data, 'utf-8');
      console.log(`Learning data saved to ${this.learningDataPath}`);
    } catch (error) {
      console.error(`Error saving learning data to ${this.learningDataPath}:`, error);
    }
  }

  /**
   * Reset learning data to defaults and save.
   */
  public resetLearning(): void {
    console.log('Resetting learning data to defaults...');
    // Re-initialize with the default structure defined in the class
    this.learningData = {
      allowlistedTerms: {},
      contextAllowlists: {},
      confidenceThresholds: {
        'tone': 0.7,
        'voice': 0.7,
        'terminology': 0.8
      },
      patternWeights: {},
      contextSensitivity: {
        'general': 1.0,
        'technical-documentation': 0.8,
        'marketing': 1.1
      }
    };
    this.saveLearningData(); // Save the reset state
  }

  /**
   * Get diagnostic information about the learned data.
   */
  public getLearningStats(): any {
    return {
      dataPath: this.learningDataPath,
      ...this.learningData
    };
  }


  /**
   * Set the brand schema to use for compliance checks
   */
  setBrandSchema(brandSchema: BrandSchema): void {
    this.brandSchema = brandSchema;
  }

  /**
   * Get the current brand schema
   */
  getBrandSchema(): BrandSchema | null {
    return this.brandSchema;
  }

  /**
   * Add technical terms to the allowlist
   */
  addTechnicalTerms(terms: string[]): void {
    this.technicalTermsAllowlist.push(...terms);
  }

  /**
   * Add technical contexts
   */
  addTechnicalContexts(contexts: string[]): void {
    this.technicalContexts.push(...contexts);
  }

  /**
   * Record a false positive to improve future detection
   */
  public addFalsePositive(issue: BrandComplianceIssue, content: string, context: string): void { // Added context parameter
    this.falsePositives.push({ issue, content, context }); // Store context
    
    // If we have accumulated enough examples, adjust detection parameters
    const LEARNING_THRESHOLD = 5; // Define threshold
    if (this.falsePositives.length >= LEARNING_THRESHOLD) {
      console.log(`Reached ${LEARNING_THRESHOLD} false positives. Updating detection parameters...`);
      this.updateDetectionParameters();
    }
  }

  /**
   * Update detection parameters based on accumulated false positive feedback.
   */
  private updateDetectionParameters(): void {
    console.log('Analyzing false positives to update learning data...');
    const issueTypeCounts: Record<string, number> = {};
    const termCounts: Record<string, { count: number; contexts: Set<string>; contentTypes: Set<string> }> = {};
    const contextCounts: Record<string, number> = {};
    const termFrequencyThreshold = 3; // How many times a term must appear to be considered for allowlisting

    // 1. Analyze accumulated false positives
    for (const { issue, content, context } of this.falsePositives) {
      // Count issue types
      issueTypeCounts[issue.type] = (issueTypeCounts[issue.type] || 0) + 1;

      // Count contexts
      contextCounts[context] = (contextCounts[context] || 0) + 1;

      // Extract and count terms (assuming terms are often quoted in descriptions)
      const terms = issue.description.match(/["']([^"']+)["']/g) || [];
      const contentType = this.detectContentType(content); // Detect content type for context

      for (const termMatch of terms) {
        const term = termMatch.replace(/["']/g, '').toLowerCase(); // Normalize term
        if (!termCounts[term]) {
          termCounts[term] = { count: 0, contexts: new Set(), contentTypes: new Set() };
        }
        termCounts[term].count++;
        termCounts[term].contexts.add(context);
        termCounts[term].contentTypes.add(contentType);
      }
    }

    console.log('Analysis complete:', { issueTypeCounts, termCounts, contextCounts });

    // 2. Update learningData based on analysis
    let updated = false;

    // Update allowlisted terms (content-type specific and context-specific)
    for (const [term, data] of Object.entries(termCounts)) {
      if (data.count >= termFrequencyThreshold) {
        // Prioritize context allowlist if it appears frequently in specific contexts
        if (data.contexts.size === 1) {
          const context = [...data.contexts][0];
          this.learningData.contextAllowlists[context] = this.learningData.contextAllowlists[context] || [];
          if (!this.learningData.contextAllowlists[context].includes(term)) {
            this.learningData.contextAllowlists[context].push(term);
            console.log(`Added term "${term}" to context allowlist for "${context}"`);
            updated = true;
          }
        }
        // Otherwise, add to content-type allowlist if consistent across types
        else if (data.contentTypes.size === 1) {
            const contentType = [...data.contentTypes][0];
             this.learningData.allowlistedTerms[contentType] = this.learningData.allowlistedTerms[contentType] || [];
             if (!this.learningData.allowlistedTerms[contentType].includes(term)) {
                this.learningData.allowlistedTerms[contentType].push(term);
                console.log(`Added term "${term}" to allowlisted terms for content type "${contentType}"`);
                updated = true;
             }
        }
        // Avoid adding overly generic terms if they appear in many contexts/types without clear pattern
        else {
             console.log(`Term "${term}" appeared frequently but in diverse contexts/types. Skipping allowlisting for now.`);
        }
      }
    }

    // Adjust confidence thresholds for frequently problematic issue types
    for (const [type, count] of Object.entries(issueTypeCounts)) {
      // Increase threshold slightly if this type causes > 50% of recent false positives
      if (count > this.falsePositives.length / 2 && this.learningData.confidenceThresholds[type]) {
        const oldThreshold = this.learningData.confidenceThresholds[type];
        // Increase threshold, capping at 0.95 to avoid ignoring everything
        this.learningData.confidenceThresholds[type] = Math.min(0.95, oldThreshold + 0.05);
        if (oldThreshold !== this.learningData.confidenceThresholds[type]) {
            console.log(`Increased confidence threshold for issue type "${type}" to ${this.learningData.confidenceThresholds[type]}`);
            updated = true;
        }
      }
    }

    // Adjust context sensitivity for frequently problematic contexts
    for (const [context, count] of Object.entries(contextCounts)) {
       // Decrease sensitivity slightly if this context causes > 50% of recent false positives
       if (count > this.falsePositives.length / 2) {
           const oldSensitivity = this.learningData.contextSensitivity[context] || 1.0; // Default to 1.0 if not set
           // Decrease sensitivity, capping at 0.5 to avoid making it completely insensitive
           this.learningData.contextSensitivity[context] = Math.max(0.5, oldSensitivity - 0.1);
           if (oldSensitivity !== this.learningData.contextSensitivity[context]) {
               console.log(`Decreased context sensitivity for "${context}" to ${this.learningData.contextSensitivity[context]}`);
               updated = true;
           }
       }
    }


    // 3. Save updated learning data if changes were made
    if (updated) {
      this.saveLearningData();
    } else {
      console.log('No significant patterns found to update learning data this cycle.');
    }

    // 4. Clear the processed false positives
    this.falsePositives = [];
    console.log('Cleared processed false positives.');
  }

  /**
   * Add domain-specific exemptions
   */
  public addDomainExemptions(domain: string, terms: string[]): void {
    if (this.domainExemptions[domain]) {
      this.domainExemptions[domain].push(...terms);
    } else {
      this.domainExemptions[domain] = terms;
    }
  }

  /**
   * Check if content complies with brand guidelines
   */
  checkBrandCompliance(content: string, context: string = this.defaultContext): BrandComplianceResult {
    if (!this.brandSchema) {
      throw new Error('Brand schema is not set');
    }

    const issues: BrandComplianceIssue[] = [];
    
    // Detect content type for more accurate analysis
    const contentType = this.detectContentType(content);
    
    // Check for tone compliance with section analysis
    const toneIssues = this.checkToneComplianceWithSections(content, context, contentType);
    issues.push(...toneIssues);
    
    // Check for voice compliance
    const voiceIssues = this.checkVoiceCompliance(content, context);
    issues.push(...voiceIssues);
    
    // Check for terminology compliance
    const terminologyIssues = this.checkTerminologyCompliance(content, context);
    issues.push(...terminologyIssues);

    // Filter issues based on learning data (probability, thresholds, allowlists)
    const filteredIssues = this.filterIssuesByLearning(issues, content, context, contentType); // Updated call

    // Calculate compliance score (inversely proportional to number and severity of issues)
    const complianceScore = this.calculateComplianceScore(filteredIssues);
    
    // Determine overall compliance
    const isCompliant = complianceScore >= 80;
    
    // Generate summary
    const summary = this.generateComplianceSummary(filteredIssues, complianceScore, isCompliant);
    
    return {
      content,
      isCompliant,
      complianceScore,
      issues: filteredIssues,
      summary,
      timestamp: new Date().toISOString(),
      brandName: this.brandSchema.name,
      context,
      contentType
    };
  }

  /**
   * Detect the type of content (technical, marketing, legal, etc.)
   */
  private detectContentType(content: string): string {
    const lowerContent = content.toLowerCase();
    const contentWords = lowerContent.split(/\s+/);
    const totalWords = contentWords.length;
    
    // Calculate term density for each content type
    const densities: Record<string, number> = {};
    
    // Technical content detection
    const technicalTerms = this.countTechnicalTerms(content);
    densities['technical'] = totalWords > 0 ? technicalTerms / totalWords : 0;
    
    // Marketing content detection
    const marketingTerms = this.countDomainTerms(content, 'marketing');
    densities['marketing'] = totalWords > 0 ? marketingTerms / totalWords : 0;
    
    // Legal content detection
    const legalTerms = this.countDomainTerms(content, 'legal');
    densities['legal'] = totalWords > 0 ? legalTerms / totalWords : 0;
    
    // Educational content detection
    const educationalTerms = this.countDomainTerms(content, 'educational');
    densities['educational'] = totalWords > 0 ? educationalTerms / totalWords : 0;
    
    // Sentiment-based detection for conversational content
    const sentiment = this.analyzeSentiment(content);
    densities['conversational'] = Math.max(sentiment.positivity, sentiment.negativity) * 0.5;
    
    // Find the content type with the highest density
    let maxDensity = 0;
    let contentType = 'general';
    
    for (const [type, density] of Object.entries(densities)) {
      if (density > maxDensity && density > 0.1) { // Threshold to avoid random matches
        maxDensity = density;
        contentType = type;
      }
    }
    
    return contentType;
  }

  /**
   * Count domain-specific terms in the content
   */
  private countDomainTerms(content: string, domain: string): number {
    const domainTerms = this.domainExemptions[domain] || [];
    const lowerContent = content.toLowerCase();
    
    return domainTerms.filter(term => 
      new RegExp(`\\b${term.toLowerCase()}\\b`).test(lowerContent)
    ).length;
  }
/**
   * Count technical terms in the content
   */
  private countTechnicalTerms(content: string): number {
    const lowerContent = content.toLowerCase();
    let count = 0;
    for (const term of this.technicalTermsAllowlist) {
      if (new RegExp(`\\b${term.toLowerCase()}\\b`).test(lowerContent)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Analyze sentiment of content
   */
  private analyzeSentiment(content: string): {
    positivity: number;
    negativity: number;
    objectivity: number;
  } {
    const lowerContent = content.toLowerCase();
    
    // Simple sentiment analysis using keyword lists
    // A real implementation would use a more sophisticated NLP model
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 
      'helpful', 'best', 'positive', 'recommend', 'love', 'like', 'enjoy',
      'happy', 'pleased', 'satisfied', 'impressive', 'easy', 'effective'
    ];
    
    const negativeWords = [
      'bad', 'poor', 'terrible', 'horrible', 'awful', 'disappointing',
      'difficult', 'hard', 'negative', 'issue', 'problem', 'hate', 'dislike',
      'unhappy', 'displeased', 'dissatisfied', 'complicated', 'ineffective'
    ];
    
    const objectiveWords = [
      'is', 'are', 'was', 'were', 'has', 'have', 'had', 'will', 'would',
      'can', 'could', 'may', 'might', 'should', 'must', 'shall', 'includes',
      'contains', 'features', 'provides', 'supports', 'enables'
    ];
    
    // Count occurrences
    let positiveCount = 0;
    let negativeCount = 0;
    let objectiveCount = 0;
    
    const words = lowerContent.split(/\s+/);
    
    for (const word of words) {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
      if (objectiveWords.includes(word)) objectiveCount++;
    }
    
    // Calculate normalized scores
    const total = words.length || 1; // Avoid division by zero
    
    return {
      positivity: positiveCount / total,
      negativity: negativeCount / total,
      objectivity: objectiveCount / total
    };
  }

  /**
   * Apply n-gram analysis to content for tone detection
   */
  private analyzeNgrams(content: string, tone: string): number {
    const words = content.toLowerCase().split(/\s+/);
    const ngrams: string[] = [];
    
    // Create bigrams and trigrams
    for (let i = 0; i < words.length - 1; i++) {
      ngrams.push(words[i] + ' ' + words[i+1]);
      if (i < words.length - 2) {
        ngrams.push(words[i] + ' ' + words[i+1] + ' ' + words[i+2]);
      }
    }
    
    // Define ngram indicators for each tone
    const ngramIndicators: Record<string, Array<{pattern: string, weight: number}>> = {
      'confident': [
        { pattern: 'we guarantee', weight: 1.0 },
        { pattern: 'we ensure', weight: 0.9 },
        { pattern: 'we promise', weight: 0.9 },
        { pattern: 'proven to', weight: 0.7 },
        { pattern: 'certainly will', weight: 0.8 }
      ],
      'approachable': [
        { pattern: 'easy to', weight: 0.8 },
        { pattern: 'simple to', weight: 0.8 },
        { pattern: 'here to help', weight: 1.0 },
        { pattern: 'feel free', weight: 0.9 },
        { pattern: 'happy to', weight: 0.7 }
      ],
      'pessimistic': [
        { pattern: 'might not', weight: 0.7 },
        { pattern: 'could fail', weight: 0.9 },
        { pattern: 'unlikely to', weight: 0.8 },
        { pattern: 'difficult to', weight: 0.6 },
        { pattern: 'not easy', weight: 0.7 }
      ],
      'condescending': [
        { pattern: 'obviously you', weight: 0.9 },
        { pattern: 'of course you', weight: 0.8 },
        { pattern: 'simply put', weight: 0.6 },
        { pattern: 'just remember', weight: 0.6 },
        { pattern: 'basic understanding', weight: 0.7 }
      ]
    };
    
    // Get indicators for the specific tone
    const indicators = ngramIndicators[tone.toLowerCase()] || [];
    
    if (indicators.length === 0) {
      return 0; // No indicators, no score
    }
    
    // Calculate total possible weight
    const totalWeight = indicators.reduce((sum, indicator) => sum + indicator.weight, 0);
    
    // Calculate matched weight
    let matchedWeight = 0;
    
    for (const indicator of indicators) {
      for (const ngram of ngrams) {
        if (ngram.includes(indicator.pattern)) {
          matchedWeight += indicator.weight;
          break; // Only count each indicator once
        }
      }
    }
    
    // Return normalized score (0-1)
    return totalWeight > 0 ? matchedWeight / totalWeight : 0;
  }

  /**
   * Check content for tone compliance with section-based analysis
   */
  private checkToneComplianceWithSections(content: string, context: string, contentType: string): BrandComplianceIssue[] {
    const issues: BrandComplianceIssue[] = [];
    
    if (!this.brandSchema) return issues;
    
    // Split content into sections (paragraphs)
    const sections = content.split(/\n{2,}|\r\n{2,}/);
    
    // If content is short or only has one section, analyze as a whole
    if (sections.length <= 1 || content.length < 100) {
      return this.checkToneCompliance(content, context, contentType);
    }
    
    // Analyze each section separately
    const sectionIssues: BrandComplianceIssue[][] = [];
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (section.trim().length === 0) continue;
      
      const issues = this.checkToneCompliance(section, context, contentType);
      
      // Add section information to issues
      const sectionNumber = i + 1;
      const augmentedIssues = issues.map(issue => ({
        ...issue,
        description: `Section ${sectionNumber}: ${issue.description}`
      }));
      
      sectionIssues.push(augmentedIssues);
    }
    
    // Aggregate issues, prioritizing high severity ones
    // Only include the most severe issues to avoid overwhelming feedback
    const highSeverityIssues = sectionIssues.flat().filter(issue => issue.severity === 'high');
    const mediumSeverityIssues = sectionIssues.flat().filter(issue => issue.severity === 'medium');
    const lowSeverityIssues = sectionIssues.flat().filter(issue => issue.severity === 'low');
    
    // Add all high severity issues
    issues.push(...highSeverityIssues);
    
    // Add at most 3 medium severity issues
    issues.push(...mediumSeverityIssues.slice(0, 3));
    
    // Add at most 2 low severity issues
    issues.push(...lowSeverityIssues.slice(0, 2));
    
    return issues;
  }

  /**
   * Check content for tone compliance with enhanced detection
   */
  private checkToneCompliance(content: string, context: string, contentType: string = 'general'): BrandComplianceIssue[] {
    const issues: BrandComplianceIssue[] = [];
    const lowerContent = content.toLowerCase();
    
    if (!this.brandSchema) return issues;
    
    // Skip tone analysis for technical contexts or if technical terms density is high
    const isTechnicalContext = this.technicalContexts.includes(context);
    const technicalTermsCount = this.countTechnicalTerms(content);
    const contentWords = content.split(/\s+/).length;
    const technicalDensity = contentWords > 0 ? technicalTermsCount / contentWords : 0;
    
    // If this is a technical context or has high technical term density (>20%),
    // apply more lenient tone checking or skip certain checks
    const isHighlyTechnical = isTechnicalContext || technicalDensity > 0.2;
    
    // Also check if this is another exempt content type (like legal)
    const isExemptContentType = contentType === 'legal' || 
                              (contentType === 'technical' && isHighlyTechnical);
    
    // Get context-specific tone if available
    const contextualTone = this.getContextualTone(context);
    const primaryTone = contextualTone || this.brandSchema.toneGuidelines.primaryTone;
    
    // Check for avoided tones using multiple detection methods
    if (!isExemptContentType) {
      for (const avoidedTone of this.brandSchema.toneGuidelines.avoidedTones) {
        // 1. Keyword-based detection with confidence
        const { detected: keywordDetected, confidence: keywordConfidence } = 
          this.detectToneWithConfidence(lowerContent, avoidedTone);
        
        // 2. Phrase-pattern detection
        const phraseDetected = this.detectToneWithPhrases(lowerContent, avoidedTone);
        
        // 3. N-gram analysis
        const ngramScore = this.analyzeNgrams(lowerContent, avoidedTone);
        
        // Combine all signals for final confidence score
        // Weight the different methods
        const combinedConfidence = 
          (keywordConfidence * 0.5) + 
          (phraseDetected ? 0.3 : 0) + 
          (ngramScore * 0.2);
        
        // Only flag if combined confidence is above threshold
        if (combinedConfidence > 0.6) {
          issues.push({
            type: 'tone',
            severity: combinedConfidence > 0.8 ? 'high' : (combinedConfidence > 0.7 ? 'medium' : 'low'),
            description: `Content uses avoided tone: "${avoidedTone}" (confidence: ${Math.round(combinedConfidence * 100)}%)`,
            suggestion: `Rewrite to align with the brand's preferred tone: "${primaryTone}"`
          });
        }
      }
    }
    
    // Check for primary tone with combined detection methods
    // Skip this check for exempt content types with technical density over 30%
    if (!isExemptContentType || technicalDensity <= 0.3) {
      // 1. Keyword-based detection
      const { detected: keywordDetected, confidence: keywordConfidence } = 
        this.detectToneWithConfidence(lowerContent, primaryTone);
      
      // 2. Phrase-pattern detection
      const phraseDetected = this.detectToneWithPhrases(lowerContent, primaryTone);
      
      // 3. N-gram analysis
      const ngramScore = this.analyzeNgrams(lowerContent, primaryTone);
      
      // Combine all signals for final confidence score
      const combinedConfidence = 
        (keywordConfidence * 0.5) + 
        (phraseDetected ? 0.3 : 0) + 
        (ngramScore * 0.2);
      
      // For technical content, we're more lenient with primary tone requirements
      const confidenceThreshold = isHighlyTechnical ? 0.3 : 0.5;
      
      if (combinedConfidence < confidenceThreshold) {
        // Adjust severity based on context and confidence
        let severity: 'low' | 'medium' | 'high' = 'medium';
        
        if (isHighlyTechnical || contentType === 'technical') {
          severity = 'low'; // Lower severity for technical content
        } else if (combinedConfidence < 0.2) {
          severity = 'high'; // High severity for very low confidence
        } else if (combinedConfidence < 0.4) {
          severity = 'medium';
        } else {
          severity = 'low';
        }
        
        issues.push({
          type: 'tone',
          severity,
          description: `Content may not align with the brand's primary tone: "${primaryTone}" (confidence: ${Math.round((1 - combinedConfidence) * 100)}%)`,
          suggestion: `Consider adjusting tone to be more ${primaryTone}`
        });
      }
    }
    
    return issues;
  }

  /**
   * Detect tone using phrase patterns
   */
  private detectToneWithPhrases(content: string, tone: string): boolean {
    // Get phrase patterns for this tone
    const patterns = this.phrasePatterns[tone.toLowerCase()] || [];
    
    // Test each pattern against the content
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return true;
      }
    }
    
    return false;
  }
/**
   * Detect tone using keywords with a confidence score (simplified)
   */
  private detectToneWithConfidence(content: string, tone: string): { detected: boolean, confidence: number } {
    const lowerContent = content.toLowerCase();
    const lowerTone = tone.toLowerCase();
    
    // Placeholder keyword lists - replace with actual keywords for each tone
    const toneKeywords: Record<string, string[]> = {
      'condescending': ['obviously', 'simple', 'easy', 'clearly', 'just'],
      'pessimistic': ['unlikely', 'fail', 'won\'t work', 'difficult', 'never'],
      'overly technical': ['leverage', 'utilize', 'implementing', 'synergy', 'paradigm'],
      'confident': ['guarantee', 'ensure', 'promise', 'certain', 'definitely', 'best'],
      'approachable': ['welcome', 'happy to help', 'feel free', 'easy', 'simple']
      // Add other tones as needed
    };

    const keywords = toneKeywords[lowerTone] || [];
    if (keywords.length === 0) {
      return { detected: false, confidence: 0 }; // No keywords for this tone
    }

    let matches = 0;
    for (const keyword of keywords) {
      if (new RegExp(`\\b${keyword}\\b`).test(lowerContent)) {
        matches++;
      }
    }

    const detected = matches > 0;
    // Simple confidence: proportion of keywords found, capped at 1.0
    const confidence = Math.min(1.0, matches / Math.max(1, keywords.length * 0.5)); // Require finding ~half the keywords for full confidence

    return { detected, confidence };
  }

  /**
   * Filter issues based on Bayesian probability to reduce false positives
   */
  /**
   * Filter issues based on learned data (allowlists, thresholds, context sensitivity).
   */
  private filterIssuesByLearning(
    issues: BrandComplianceIssue[],
    content: string,
    context: string,
    contentType: string
  ): BrandComplianceIssue[] {
    return issues.filter(issue => {
      // Pass context to the updated probability calculation
      const probability = this.calculateIssueProbability(issue, content, context, contentType);
      // Use the learned threshold for this issue type, or a default of 0.5
      const threshold = this.learningData.confidenceThresholds[issue.type] || 0.5;
      
      // Log filtering decision (optional)
      // console.log(`Issue: "${issue.description}", Type: ${issue.type}, Context: ${context}, ContentType: ${contentType}, Probability: ${probability.toFixed(2)}, Threshold: ${threshold.toFixed(2)}, Keep: ${probability >= threshold}`);

      // Keep the issue if its calculated probability meets or exceeds the learned threshold
      return probability >= threshold;
    });
  }


  /**
   * Calculate the probability of an issue being a true positive, considering learned data.
   */
  private calculateIssueProbability(
    issue: BrandComplianceIssue,
    content: string, // Keep content for potential future use in probability calculation
    context: string, // Added context parameter
    contentType: string
  ): number {
    // 1. Check Allowlists first - if allowlisted, probability is effectively 0
    // Extract term from description (assuming format like 'Term used: "example"')
    const termMatch = issue.description.match(/["']([^"']+)["']/);
    if (termMatch) {
      const term = termMatch[1].toLowerCase(); // Normalize term
      // Check content-type specific allowlist
      const typeAllowlist = this.learningData.allowlistedTerms[contentType] || [];
      // Check context-specific allowlist
      const contextAllowlist = this.learningData.contextAllowlists[context] || [];
      
      // If the term is found in either relevant allowlist, return 0 probability
      if (typeAllowlist.includes(term) || contextAllowlist.includes(term)) {
        // console.log(`Term "${term}" allowlisted for contentType "${contentType}" or context "${context}". Probability -> 0.`);
        return 0.0; // Allowlisted term, ignore issue by setting probability to 0
      }
    }

    // 2. Base probability based on severity (remains a starting point)
    let baseProbability: number;
    switch (issue.severity) {
      case 'high': baseProbability = 0.8; break;
      case 'medium': baseProbability = 0.6; break;
      case 'low': baseProbability = 0.4; break;
      default: baseProbability = 0.5; // Default if severity is unknown
    }

    // 3. Apply Context Sensitivity Multiplier from learning data
    // Get the multiplier for the current context, defaulting to 1.0 if not specifically learned
    const sensitivityMultiplier = this.learningData.contextSensitivity[context] ?? 1.0;
    let adjustedProbability = baseProbability * sensitivityMultiplier;

    // 4. (Optional) Incorporate other factors from the previous implementation if still desired
    //    For example, confidence parsed from description, content length adjustments, etc.
    //    These could be added here, potentially also adjusted by learning data in the future.
    //    Example: Adjust based on confidence parsed from description
    //    const confidenceMatch = issue.description.match(/confidence: (\d+)%/);
    //    if (confidenceMatch) {
    //      const confidence = parseInt(confidenceMatch[1], 10) / 100;
    //      adjustedProbability = adjustedProbability * (0.5 + confidence); // Simple scaling by confidence
    //    }


    // 5. Clamp final probability between 0 and 1
    adjustedProbability = Math.max(0, Math.min(1, adjustedProbability));

    // console.log(`Prob Calc: Type=${issue.type}, Severity=${issue.severity}, Context=${context}, ContentType=${contentType} => Base=${baseProbability.toFixed(2)}, Sensitivity=${sensitivityMultiplier.toFixed(2)}, Final=${adjustedProbability.toFixed(2)}`);

    return adjustedProbability;
  }


  /**
   * Check content for voice compliance
   */
  private checkVoiceCompliance(content: string, context: string): BrandComplianceIssue[] {
    const issues: BrandComplianceIssue[] = [];
    
    if (!this.brandSchema) return issues;
    
    const voiceGuidelines = this.getContextualVoice(context) || this.brandSchema.voiceGuidelines;
    
    // Check for contractions usage
    const hasContractions = /'\w+\b/.test(content);
    if (voiceGuidelines.usesContractions !== hasContractions) {
      issues.push({
        type: 'voice',
        severity: 'low',
        description: voiceGuidelines.usesContractions 
          ? 'Content doesn\'t use contractions when brand voice prefers them' 
          : 'Content uses contractions when brand voice avoids them',
        suggestion: voiceGuidelines.usesContractions
          ? 'Use contractions (e.g., "don\'t" instead of "do not")'
          : 'Avoid contractions (e.g., "do not" instead of "don\'t")'
      });
    }
    
    // Check for first-person pronouns
    const hasFirstPerson = /\b(I|we|our|us|my)\b/i.test(content);
    if (voiceGuidelines.usesPronoun.firstPerson !== hasFirstPerson) {
      issues.push({
        type: 'voice',
        severity: 'medium',
        description: voiceGuidelines.usesPronoun.firstPerson
          ? 'Content doesn\'t use first-person pronouns when brand voice prefers them'
          : 'Content uses first-person pronouns when brand voice avoids them',
        suggestion: voiceGuidelines.usesPronoun.firstPerson
          ? 'Include first-person pronouns (I, we, our, us) where appropriate'
          : 'Avoid first-person pronouns (I, we, our, us)'
      });
    }
    
    // Check for second-person pronouns
    const hasSecondPerson = /\b(you|your)\b/i.test(content);
    if (voiceGuidelines.usesPronoun.secondPerson !== hasSecondPerson) {
      issues.push({
        type: 'voice',
        severity: 'medium',
        description: voiceGuidelines.usesPronoun.secondPerson
          ? 'Content doesn\'t use second-person pronouns when brand voice prefers them'
          : 'Content uses second-person pronouns when brand voice avoids them',
        suggestion: voiceGuidelines.usesPronoun.secondPerson
          ? 'Include second-person pronouns (you, your) where appropriate'
          : 'Avoid second-person pronouns (you, your)'
      });
    }
    
    return issues;
  }

  /**
   * Check content for terminology compliance with improved handling of technical terms
   */
  /**
   * Check content for terminology compliance, considering learned allowlists.
   * NOTE: This implementation assumes the schema structure might be slightly different
   * based on the previous file state. Adjusting based on the provided `read_file` output.
   * It seems the schema might have `terminologyGuidelines` instead of just `terminology`.
   */
  private checkTerminologyCompliance(content: string, context: string): BrandComplianceIssue[] {
    const issues: BrandComplianceIssue[] = [];
    // Assuming the schema structure from the 'Best Match Found' in the error message
    if (!this.brandSchema || !this.brandSchema.terminologyGuidelines) return issues;

    const lowerContent = content.toLowerCase();
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content]; // Basic sentence split
    const contentType = this.detectContentType(content); // Detect content type for allowlist check
    const isTechnicalContext = this.technicalContexts.includes(context); // Keep for schema logic

    // Helper to check if a term is allowlisted (context or content type)
    const isAllowlisted = (term: string): boolean => {
        const lowerTerm = term.toLowerCase();
        const typeAllowlist = this.learningData.allowlistedTerms[contentType] || [];
        const contextAllowlist = this.learningData.contextAllowlists[context] || [];
        // Also consider the original technicalTermsAllowlist as a base
        const isTechAllowlisted = this.technicalTermsAllowlist.some(t => t.toLowerCase() === lowerTerm);
        
        // Allowlisted if in learned lists OR if it's a base technical term in a technical context
        return typeAllowlist.includes(lowerTerm) ||
               contextAllowlist.includes(lowerTerm) ||
               (isTechnicalContext && isTechAllowlisted);
    };

    // Check for globally avoided terms (from schema)
    if (this.brandSchema.terminologyGuidelines.avoidedGlobalTerms) {
        for (const term of this.brandSchema.terminologyGuidelines.avoidedGlobalTerms) {
            if (isAllowlisted(term)) continue; // Skip if allowlisted by learning or context

            const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            let match: RegExpExecArray | null; // Explicitly type match
            while ((match = regex.exec(lowerContent)) !== null) {
                if (isAllowlisted(match[0])) continue; // Double check specific match

                // const sentence = sentences.find(s => s.toLowerCase().includes(match[0])) || content; // Sentence context removed for simplicity/type safety
                issues.push({
                    type: 'terminology',
                    severity: 'high',
                    description: `Forbidden term used: "${match[0]}"`, // Changed description slightly
                    suggestion: `Avoid using "${match[0]}". Consider alternatives if available.`
                    // context: sentence.trim(), // Removed context property
                    // position: { start: match.index, end: regex.lastIndex } // Removed position property
                });
            }
        }
    }


    // Check for preferred/avoided terms based on context (from schema)
    if (this.brandSchema.terminologyGuidelines.terms) {
        for (const termRule of this.brandSchema.terminologyGuidelines.terms) {
            // Skip if rule doesn't apply to this context (schema logic)
            if ((termRule.contexts && !termRule.contexts.includes(context)) ||
                (termRule.avoidInContexts && termRule.avoidInContexts.includes(context))) {
                continue;
            }

            // Check for preferred terms (replacing alternatives)
            if (termRule.preferred) {
                const alternatives = termRule.alternatives || [];
                for (const alt of alternatives) {
                    // Skip if the alternative term itself is allowlisted
                    if (isAllowlisted(alt)) continue;

                    const regex = new RegExp(`\\b${alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                    let match: RegExpExecArray | null; // Explicitly type match
                    while ((match = regex.exec(lowerContent)) !== null) {
                        // Skip if the specific matched instance is allowlisted
                        if (isAllowlisted(match[0])) continue;

                        // const sentence = sentences.find(s => s.toLowerCase().includes(match[0])) || content;
                        issues.push({
                            type: 'terminology',
                            severity: 'medium',
                            description: `Non-preferred term used: "${match[0]}"`, // Changed description
                            suggestion: `Prefer using "${termRule.preferred}" instead of "${match[0]}".`
                            // context: sentence.trim(), // Removed context property
                            // position: { start: match.index, end: regex.lastIndex } // Removed position property
                        });
                    }
                }
            }
             // Check for terms to avoid in specific contexts (schema logic, but respect allowlist)
             // This part seems redundant if avoidInContexts is checked above, but keeping structure
             if (termRule.term && termRule.avoidInContexts && termRule.avoidInContexts.includes(context)) {
                 if (isAllowlisted(termRule.term)) continue; // Skip if allowlisted

                 const regex = new RegExp(`\\b${termRule.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                 let match: RegExpExecArray | null; // Explicitly type match
                 while ((match = regex.exec(lowerContent)) !== null) {
                     if (isAllowlisted(match[0])) continue; // Double check match

                     // const sentence = sentences.find(s => s.toLowerCase().includes(match[0])) || content;
                     issues.push({
                         type: 'terminology',
                         severity: 'medium', // Or high depending on rule?
                         description: `Term "${match[0]}" should be avoided in "${context}" context`,
                         suggestion: termRule.notes || `Consider an alternative to "${match[0]}"`
                         // context: sentence.trim(), // Removed context property
                         // position: { start: match.index, end: regex.lastIndex } // Removed position property
                     });
                 }
             }
        }
    }

    // Check for proper noun formatting (Allowlisting less relevant here)
    if (this.brandSchema.terminologyGuidelines.properNouns) {
        for (const [noun, correctFormat] of Object.entries(this.brandSchema.terminologyGuidelines.properNouns)) {
            // Maybe skip if noun is allowlisted? Unlikely needed for formatting.
            // if (isAllowlisted(noun)) continue;

            const incorrectUsages = this.checkProperNounFormatting(content, noun, correctFormat);
            for (const usage of incorrectUsages) {
                 // const sentence = sentences.find(s => s.includes(usage)) || content;
                 issues.push({
                     type: 'terminology',
                     severity: 'low',
                     description: `Incorrect formatting for proper noun: "${usage}"`,
                     suggestion: `Ensure proper noun "${noun}" is formatted as "${correctFormat}".`, // Adjusted suggestion
                     // context: sentence.trim(), // Removed context property
                 });
            }
        }
    }

    return issues;
  }

  /**
   * Check for proper noun formatting (e.g., "TechFuture" vs "techfuture")
   */
  private checkProperNounFormatting(content: string, noun: string, correctFormat: string): string[] {
    const incorrectFormats: string[] = [];
    const nounRegex = new RegExp(`\\b${noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    
    // Find all instances of the noun
    const matches = content.match(new RegExp(nounRegex, 'gi')) || [];
    
    // Check if any instances don't match the correct format
    for (const match of matches) {
      if (match !== correctFormat) {
        incorrectFormats.push(match);
      }
    }
    
    return incorrectFormats;
  }

  /**
   * Calculate compliance score based on issues
   */
  private calculateComplianceScore(issues: BrandComplianceIssue[]): number {
    if (issues.length === 0) return 100;
    
    // Assign weights based on severity
    const severityWeights = {
      low: 1,
      medium: 3,
      high: 5
    };
    
    // Calculate total severity points
    const totalSeverityPoints = issues.reduce((sum, issue) => {
      return sum + severityWeights[issue.severity];
    }, 0);
    
    // Calculate score (inverse relationship with severity points)
    const maxPoints = 20; // Threshold above which score is 0
    const score = Math.max(0, 100 - (totalSeverityPoints / maxPoints) * 100);
    
    return Math.round(score);
  }

  /**
   * Generate a summary of compliance issues
   */
  private generateComplianceSummary(issues: BrandComplianceIssue[], score: number, isCompliant: boolean): string {
    if (issues.length === 0) {
      return `COMPLIANT: Content fully complies with ${this.brandSchema?.name} brand guidelines (100% compliance score).`;
    }
    
    const highIssues = issues.filter(issue => issue.severity === 'high').length;
    const mediumIssues = issues.filter(issue => issue.severity === 'medium').length;
    const lowIssues = issues.filter(issue => issue.severity === 'low').length;
    
    if (!isCompliant) {
      return `NON-COMPLIANT: Content does not meet ${this.brandSchema?.name} brand guidelines (${score}% compliance). Found ${highIssues} high, ${mediumIssues} medium, and ${lowIssues} low severity issues.`;
    } else {
      return `MOSTLY COMPLIANT: Content generally aligns with ${this.brandSchema?.name} brand guidelines (${score}% compliance). Found ${highIssues} high, ${mediumIssues} medium, and ${lowIssues} low severity issues that should be addressed.`;
    }
  }

  /**
   * Get contextual tone for a specific context
   */
  private getContextualTone(context: string): string | null {
    if (!this.brandSchema) return null;
    
    // Look for a contextual adjustment that matches the context
    for (const adjustment of this.brandSchema.contextualAdjustments) {
      if (adjustment.contexts.includes(context) && adjustment.applyRules.tone) {
        return adjustment.applyRules.tone;
      }
    }
    
    // Check tonalShift in toneGuidelines
    if (this.brandSchema.toneGuidelines.tonalShift[context]) {
      return this.brandSchema.toneGuidelines.tonalShift[context];
    }
    
    return null;
  }

  /**
   * Get contextual voice for a specific context
   */
  private getContextualVoice(context: string): any | null {
    if (!this.brandSchema) return null;
    
    // Look for a contextual adjustment that matches the context
    for (const adjustment of this.brandSchema.contextualAdjustments) {
      if (adjustment.contexts.includes(context) && adjustment.applyRules.voice) {
        // Merge with base voice guidelines
        return {
          ...this.brandSchema.voiceGuidelines,
          ...adjustment.applyRules.voice,
          sentence: {
            ...this.brandSchema.voiceGuidelines.sentence,
            length: adjustment.applyRules.voice.sentenceLength || this.brandSchema.voiceGuidelines.sentence.length,
            structure: adjustment.applyRules.voice.sentenceStructure || this.brandSchema.voiceGuidelines.sentence.structure
          }
        };
      }
    }
    
    return null;
  }
} 