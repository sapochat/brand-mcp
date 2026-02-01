/**
 * Multi-language support for content analysis
 */
export class MultiLanguageAnalyzer {
  private languageProcessors: Map<string, LanguageProcessor>;
  private translationCache: Map<string, TranslationResult>;
  private languagePatterns: Map<string, LanguagePatterns>;

  constructor() {
    this.languageProcessors = new Map();
    this.translationCache = new Map();
    this.languagePatterns = new Map();
    this.initializeLanguageSupport();
  }

  /**
   * Initialize language support
   */
  private initializeLanguageSupport(): void {
    // English patterns
    this.languagePatterns.set('en', {
      stopWords: new Set([
        'the',
        'is',
        'at',
        'which',
        'on',
        'and',
        'a',
        'an',
        'as',
        'are',
        'was',
        'were',
        'been',
        'be',
      ]),
      sentenceDelimiters: /[.!?]+/g,
      wordDelimiters: /\s+/g,
      commonPatterns: {
        greeting: /\b(hello|hi|hey|good morning|good evening)\b/gi,
        thanks: /\b(thank you|thanks|appreciate)\b/gi,
        apology: /\b(sorry|apologize|excuse me)\b/gi,
      },
    });

    // Spanish patterns
    this.languagePatterns.set('es', {
      stopWords: new Set([
        'el',
        'la',
        'de',
        'que',
        'y',
        'a',
        'en',
        'un',
        'ser',
        'se',
        'no',
        'haber',
        'por',
        'con',
      ]),
      sentenceDelimiters: /[.!?¡¿]+/g,
      wordDelimiters: /\s+/g,
      commonPatterns: {
        greeting: /\b(hola|buenos días|buenas tardes|buenas noches)\b/gi,
        thanks: /\b(gracias|agradezco|muchas gracias)\b/gi,
        apology: /\b(perdón|disculpe|lo siento)\b/gi,
      },
    });

    // French patterns
    this.languagePatterns.set('fr', {
      stopWords: new Set([
        'le',
        'de',
        'un',
        'être',
        'et',
        'à',
        'il',
        'avoir',
        'ne',
        'je',
        'son',
        'que',
        'se',
        'qui',
      ]),
      sentenceDelimiters: /[.!?]+/g,
      wordDelimiters: /\s+/g,
      commonPatterns: {
        greeting: /\b(bonjour|bonsoir|salut|bonne journée)\b/gi,
        thanks: /\b(merci|je vous remercie)\b/gi,
        apology: /\b(pardon|excusez-moi|désolé)\b/gi,
      },
    });

    // German patterns
    this.languagePatterns.set('de', {
      stopWords: new Set([
        'der',
        'die',
        'und',
        'in',
        'den',
        'von',
        'zu',
        'das',
        'mit',
        'sich',
        'des',
        'auf',
        'für',
      ]),
      sentenceDelimiters: /[.!?]+/g,
      wordDelimiters: /\s+/g,
      commonPatterns: {
        greeting: /\b(hallo|guten tag|guten morgen|guten abend)\b/gi,
        thanks: /\b(danke|vielen dank|danke schön)\b/gi,
        apology: /\b(entschuldigung|es tut mir leid|verzeihung)\b/gi,
      },
    });

    // Japanese patterns (simplified)
    this.languagePatterns.set('ja', {
      stopWords: new Set([
        'の',
        'に',
        'は',
        'を',
        'た',
        'が',
        'で',
        'て',
        'と',
        'し',
        'れ',
        'さ',
        'ある',
      ]),
      sentenceDelimiters: /[。！？]/g,
      wordDelimiters: /[\s、]+/g,
      commonPatterns: {
        greeting: /(こんにちは|おはよう|こんばんは|はじめまして)/g,
        thanks: /(ありがとう|感謝|お礼)/g,
        apology: /(すみません|申し訳|ごめん)/g,
      },
    });

    // Chinese patterns (simplified)
    this.languagePatterns.set('zh', {
      stopWords: new Set([
        '的',
        '了',
        '在',
        '是',
        '我',
        '有',
        '和',
        '就',
        '不',
        '人',
        '都',
        '一',
        '一个',
        '上',
      ]),
      sentenceDelimiters: /[。！？]/g,
      wordDelimiters: /[\s，]+/g,
      commonPatterns: {
        greeting: /(你好|您好|早上好|晚上好)/g,
        thanks: /(谢谢|感谢|多谢)/g,
        apology: /(对不起|抱歉|不好意思)/g,
      },
    });

    // Initialize processors
    this.initializeProcessors();
  }

  /**
   * Initialize language processors
   */
  private initializeProcessors(): void {
    // Add base processors for each language
    const languages = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'pt', 'it', 'ru', 'ar'];

    languages.forEach((lang) => {
      this.languageProcessors.set(lang, new BaseLanguageProcessor(lang));
    });
  }

  /**
   * Detect language of content
   */
  async detectLanguage(content: string): Promise<LanguageDetectionResult> {
    const scores = new Map<string, number>();
    const indicators: LanguageIndicator[] = [];

    // Character set detection
    const charsetLanguages = this.detectByCharset(content);
    charsetLanguages.forEach((lang) => {
      scores.set(lang, (scores.get(lang) || 0) + 30);
      indicators.push({
        type: 'charset',
        language: lang,
        confidence: 30,
        evidence: 'Character set match',
      });
    });

    // Pattern matching
    for (const [lang, patterns] of this.languagePatterns) {
      const patternScore = this.scoreByPatterns(content, patterns);
      if (patternScore > 0) {
        scores.set(lang, (scores.get(lang) || 0) + patternScore);
        indicators.push({
          type: 'pattern',
          language: lang,
          confidence: patternScore,
          evidence: 'Language pattern match',
        });
      }
    }

    // Stop words analysis
    for (const [lang, patterns] of this.languagePatterns) {
      const stopWordScore = this.scoreByStopWords(content, patterns.stopWords);
      if (stopWordScore > 0) {
        scores.set(lang, (scores.get(lang) || 0) + stopWordScore);
        indicators.push({
          type: 'stopwords',
          language: lang,
          confidence: stopWordScore,
          evidence: `${stopWordScore} stop words found`,
        });
      }
    }

    // Determine primary language
    let primaryLanguage = 'en'; // Default to English
    let maxScore = 0;

    for (const [lang, score] of scores) {
      if (score > maxScore) {
        maxScore = score;
        primaryLanguage = lang;
      }
    }

    // Calculate confidence
    const totalScore = Array.from(scores.values()).reduce((sum, score) => sum + score, 0);
    const confidence = totalScore > 0 ? (maxScore / totalScore) * 100 : 0;

    // Get alternative languages
    const alternatives = Array.from(scores.entries())
      .filter(([lang, _]) => lang !== primaryLanguage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([lang, score]) => ({
        language: lang,
        confidence: (score / totalScore) * 100,
      }));

    return {
      primaryLanguage,
      confidence,
      alternatives,
      indicators,
      isMultilingual: alternatives.some((alt) => alt.confidence > 30),
      supportedLanguages: this.getSupportedLanguages(),
    };
  }

  /**
   * Analyze content in specific language
   */
  async analyzeInLanguage(content: string, language: string): Promise<LanguageAnalysisResult> {
    const processor = this.languageProcessors.get(language);
    if (!processor) {
      throw new Error(`Language ${language} not supported`);
    }

    const patterns = this.languagePatterns.get(language);
    if (!patterns) {
      throw new Error(`Language patterns for ${language} not found`);
    }

    // Tokenize content
    const tokens = await processor.tokenize(content);

    // Extract language-specific features
    const features = await this.extractLanguageFeatures(content, language, patterns);

    // Analyze sentiment in language
    const sentiment = await this.analyzeSentimentInLanguage(content, language);

    // Detect cultural sensitivities
    const culturalIssues = await this.detectCulturalIssues(content, language);

    // Calculate readability for language
    const readability = await this.calculateReadability(content, language, tokens);

    // Get language-specific recommendations
    const recommendations = this.generateLanguageRecommendations(
      features,
      sentiment,
      culturalIssues,
      language
    );

    return {
      language,
      tokens,
      features,
      sentiment,
      culturalIssues,
      readability,
      recommendations,
      metadata: {
        processedAt: new Date(),
        processorVersion: processor.version,
      },
    };
  }

  /**
   * Translate content for analysis
   */
  async translateForAnalysis(
    content: string,
    fromLanguage: string,
    toLanguage: string = 'en'
  ): Promise<TranslationResult> {
    const cacheKey = `${fromLanguage}:${toLanguage}:${this.hashContent(content)}`;

    // Check cache
    const cached = this.translationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // For demo purposes, we'll create a mock translation
    // In production, this would integrate with a translation service
    const result: TranslationResult = {
      originalLanguage: fromLanguage,
      targetLanguage: toLanguage,
      originalContent: content,
      translatedContent: await this.mockTranslate(content, fromLanguage, toLanguage),
      confidence: 85,
      preservedElements: this.extractPreservedElements(content),
      warnings: [],
    };

    // Cache result
    this.translationCache.set(cacheKey, result);

    return result;
  }

  /**
   * Detect by character set
   */
  private detectByCharset(content: string): string[] {
    const languages: string[] = [];

    // Latin script
    if (/[a-zA-Z]/.test(content)) {
      languages.push('en', 'es', 'fr', 'de', 'pt', 'it');
    }

    // Cyrillic script
    if (/[а-яА-Я]/.test(content)) {
      languages.push('ru');
    }

    // Arabic script
    if (/[\u0600-\u06FF]/.test(content)) {
      languages.push('ar');
    }

    // Chinese characters
    if (/[\u4e00-\u9fff]/.test(content)) {
      languages.push('zh');
    }

    // Japanese characters
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(content)) {
      languages.push('ja');
    }

    // Korean characters
    if (/[\uac00-\ud7af\u1100-\u11ff]/.test(content)) {
      languages.push('ko');
    }

    return languages;
  }

  /**
   * Score by patterns
   */
  private scoreByPatterns(content: string, patterns: LanguagePatterns): number {
    let score = 0;
    const contentLower = content.toLowerCase();

    for (const [, pattern] of Object.entries(patterns.commonPatterns)) {
      const matches = contentLower.match(pattern);
      if (matches) {
        score += matches.length * 5;
      }
    }

    return Math.min(score, 40); // Cap at 40 points
  }

  /**
   * Score by stop words
   */
  private scoreByStopWords(content: string, stopWords: Set<string>): number {
    const words = content.toLowerCase().split(/\s+/);
    let count = 0;

    for (const word of words) {
      if (stopWords.has(word)) {
        count++;
      }
    }

    // Score based on percentage of stop words
    const percentage = (count / words.length) * 100;
    return Math.min(percentage * 2, 30); // Cap at 30 points
  }

  /**
   * Extract language features
   */
  private async extractLanguageFeatures(
    content: string,
    language: string,
    patterns: LanguagePatterns
  ): Promise<LanguageFeatures> {
    const sentences = content.split(patterns.sentenceDelimiters).filter((s) => s.trim());
    const words = content.split(patterns.wordDelimiters).filter((w) => w.trim());

    return {
      sentenceCount: sentences.length,
      wordCount: words.length,
      averageSentenceLength: words.length / Math.max(sentences.length, 1),
      averageWordLength: words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1),
      vocabularyDiversity: new Set(words.map((w) => w.toLowerCase())).size / words.length,
      stopWordRatio:
        words.filter((w) => patterns.stopWords.has(w.toLowerCase())).length / words.length,
      punctuationDensity: (content.match(/[.,;:!?]/g) || []).length / content.length,
      languageSpecificMetrics: await this.getLanguageSpecificMetrics(content, language),
    };
  }

  /**
   * Get language-specific metrics
   */
  private async getLanguageSpecificMetrics(
    content: string,
    language: string
  ): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};

    switch (language) {
      case 'en':
        // Passive voice usage
        metrics.passiveVoice = (
          content.match(/\b(was|were|been|being|is|are|be)\s+\w+ed\b/gi) || []
        ).length;
        break;

      case 'de':
        // Compound word usage
        metrics.compoundWords = (content.match(/[A-Z][a-z]+[A-Z][a-z]+/g) || []).length;
        break;

      case 'ja':
        // Politeness levels
        metrics.politeForm = (content.match(/です|ます/g) || []).length;
        metrics.casualForm = (content.match(/だ|る/g) || []).length;
        break;

      case 'es':
      case 'fr':
        // Formal vs informal address
        metrics.formalAddress = (content.match(/usted|vous/gi) || []).length;
        metrics.informalAddress = (content.match(/tú|tu/gi) || []).length;
        break;
    }

    return metrics;
  }

  /**
   * Analyze sentiment in language
   */
  private async analyzeSentimentInLanguage(
    content: string,
    language: string
  ): Promise<LanguageSentiment> {
    // Language-specific sentiment words
    const sentimentWords = this.getSentimentWords(language);

    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 0;

    const words = content.toLowerCase().split(/\s+/);

    for (const word of words) {
      if (sentimentWords.positive.has(word)) positiveScore++;
      if (sentimentWords.negative.has(word)) negativeScore++;
      if (sentimentWords.neutral.has(word)) neutralScore++;
    }

    const total = positiveScore + negativeScore + neutralScore;

    return {
      positive: total > 0 ? (positiveScore / total) * 100 : 0,
      negative: total > 0 ? (negativeScore / total) * 100 : 0,
      neutral: total > 0 ? (neutralScore / total) * 100 : 0,
      overall:
        positiveScore > negativeScore
          ? 'positive'
          : negativeScore > positiveScore
            ? 'negative'
            : 'neutral',
      confidence: Math.min(total * 10, 100),
    };
  }

  /**
   * Get sentiment words for language
   */
  private getSentimentWords(language: string): {
    positive: Set<string>;
    negative: Set<string>;
    neutral: Set<string>;
  } {
    type SentimentWordSet = {
      positive: Set<string>;
      negative: Set<string>;
      neutral: Set<string>;
    };
    const sentimentMaps: Record<string, SentimentWordSet> = {
      en: {
        positive: new Set([
          'good',
          'great',
          'excellent',
          'wonderful',
          'amazing',
          'happy',
          'love',
          'beautiful',
        ]),
        negative: new Set(['bad', 'terrible', 'awful', 'horrible', 'hate', 'angry', 'sad', 'ugly']),
        neutral: new Set(['okay', 'fine', 'normal', 'average', 'regular', 'standard']),
      },
      es: {
        positive: new Set([
          'bueno',
          'excelente',
          'maravilloso',
          'feliz',
          'amor',
          'hermoso',
          'genial',
        ]),
        negative: new Set(['malo', 'terrible', 'horrible', 'odio', 'triste', 'feo', 'peor']),
        neutral: new Set(['bien', 'normal', 'regular', 'promedio']),
      },
      fr: {
        positive: new Set([
          'bon',
          'excellent',
          'merveilleux',
          'heureux',
          'amour',
          'beau',
          'génial',
        ]),
        negative: new Set(['mauvais', 'terrible', 'horrible', 'déteste', 'triste', 'laid', 'pire']),
        neutral: new Set(['bien', 'normal', 'moyen', 'ordinaire']),
      },
    };

    return sentimentMaps[language] || sentimentMaps.en;
  }

  /**
   * Detect cultural issues
   */
  private async detectCulturalIssues(content: string, language: string): Promise<CulturalIssue[]> {
    const issues: CulturalIssue[] = [];
    const culturalPatterns = this.getCulturalPatterns(language);

    for (const pattern of culturalPatterns) {
      if (pattern.regex.test(content)) {
        issues.push({
          type: pattern.type,
          severity: pattern.severity,
          description: pattern.description,
          affectedRegions: pattern.regions,
          recommendation: pattern.recommendation,
        });
      }
    }

    return issues;
  }

  /**
   * Get cultural patterns
   */
  private getCulturalPatterns(language: string): CulturalPattern[] {
    const patterns: Record<string, CulturalPattern[]> = {
      en: [
        {
          type: 'number_superstition',
          regex: /\b(13|666)\b/g,
          severity: 'low',
          description: 'Number 13 considered unlucky in Western cultures',
          regions: ['US', 'UK', 'CA'],
          recommendation: 'Consider avoiding if targeting superstitious audiences',
        },
      ],
      zh: [
        {
          type: 'number_superstition',
          regex: /\b4\b/g,
          severity: 'medium',
          description: 'Number 4 sounds like "death" in Chinese',
          regions: ['CN', 'TW', 'HK'],
          recommendation: 'Avoid using number 4 in Chinese markets',
        },
        {
          type: 'color_symbolism',
          regex: /white\s+(flowers?|gift)/gi,
          severity: 'high',
          description: 'White flowers symbolize death in Chinese culture',
          regions: ['CN', 'TW', 'HK'],
          recommendation: 'Use red or other colors for positive contexts',
        },
      ],
      ja: [
        {
          type: 'number_superstition',
          regex: /\b(4|9)\b/g,
          severity: 'medium',
          description: 'Numbers 4 and 9 are unlucky in Japanese',
          regions: ['JP'],
          recommendation: 'Avoid these numbers in Japanese content',
        },
      ],
    };

    return patterns[language] || [];
  }

  /**
   * Calculate readability
   */
  private async calculateReadability(
    content: string,
    language: string,
    tokens: Token[]
  ): Promise<LanguageReadability> {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim());
    const words = tokens.filter((t) => t.type === 'word');
    const syllables = this.countSyllables(
      words.map((w) => w.text),
      language
    );

    // Calculate language-adjusted scores
    const fleschScore = this.calculateFleschScore(
      words.length,
      sentences.length,
      syllables,
      language
    );

    const gradeLevel = this.calculateGradeLevel(
      words.length,
      sentences.length,
      syllables,
      language
    );

    return {
      fleschReadingEase: fleschScore,
      gradeLevel,
      difficulty: this.getDifficultyLevel(fleschScore),
      averageSentenceLength: words.length / Math.max(sentences.length, 1),
      averageWordLength:
        words.reduce((sum, w) => sum + w.text.length, 0) / Math.max(words.length, 1),
      languageSpecificScore: await this.getLanguageSpecificReadabilityScore(content, language),
    };
  }

  /**
   * Count syllables (simplified)
   */
  private countSyllables(words: string[], language: string): number {
    let totalSyllables = 0;

    for (const word of words) {
      if (language === 'en') {
        // Simple English syllable counting
        totalSyllables += Math.max(1, (word.match(/[aeiouAEIOU]/g) || []).length);
      } else {
        // Rough estimate for other languages
        totalSyllables += Math.max(1, Math.ceil(word.length / 3));
      }
    }

    return totalSyllables;
  }

  /**
   * Calculate Flesch score
   */
  private calculateFleschScore(
    words: number,
    sentences: number,
    syllables: number,
    _language: string
  ): number {
    if (sentences === 0 || words === 0) return 0;

    // Language-specific coefficients
    const coefficients: Record<string, { a: number; b: number }> = {
      en: { a: 206.835, b: 1.015 },
      es: { a: 206.84, b: 1.02 },
      fr: { a: 207, b: 1.015 },
      de: { a: 180, b: 1.0 },
    };

    const coef = coefficients[_language] || coefficients.en;

    const score = coef.a - coef.b * (words / sentences) - 84.6 * (syllables / words);
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate grade level
   */
  private calculateGradeLevel(
    words: number,
    sentences: number,
    syllables: number,
    _language: string
  ): number {
    if (sentences === 0 || words === 0) return 0;

    // Simplified grade level calculation
    const gradeLevel = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
    return Math.max(0, Math.min(20, gradeLevel));
  }

  /**
   * Get difficulty level
   */
  private getDifficultyLevel(fleschScore: number): string {
    if (fleschScore >= 90) return 'very_easy';
    if (fleschScore >= 80) return 'easy';
    if (fleschScore >= 70) return 'fairly_easy';
    if (fleschScore >= 60) return 'standard';
    if (fleschScore >= 50) return 'fairly_difficult';
    if (fleschScore >= 30) return 'difficult';
    return 'very_difficult';
  }

  /**
   * Get language-specific readability score
   */
  private async getLanguageSpecificReadabilityScore(
    _content: string,
    _language: string
  ): Promise<number> {
    // Placeholder for language-specific calculations
    // Would implement LIX for Swedish, ARI for Arabic, etc.
    return 50;
  }

  /**
   * Generate language recommendations
   */
  private generateLanguageRecommendations(
    features: LanguageFeatures,
    _sentiment: LanguageSentiment,
    culturalIssues: CulturalIssue[],
    language: string
  ): string[] {
    const recommendations: string[] = [];

    // Sentence length recommendations
    if (features.averageSentenceLength > 25) {
      recommendations.push('Consider breaking long sentences for better readability');
    }

    // Vocabulary diversity
    if (features.vocabularyDiversity < 0.4) {
      recommendations.push('Increase vocabulary variety to improve engagement');
    }

    // Cultural sensitivity
    if (culturalIssues.length > 0) {
      recommendations.push('Review cultural sensitivities for target market');
    }

    // Language-specific recommendations
    const langSpecific = this.getLanguageSpecificRecommendations(features, language);
    recommendations.push(...langSpecific);

    return recommendations;
  }

  /**
   * Get language-specific recommendations
   */
  private getLanguageSpecificRecommendations(
    features: LanguageFeatures,
    language: string
  ): string[] {
    const recommendations: string[] = [];

    if (language === 'en' && features.languageSpecificMetrics?.passiveVoice > 5) {
      recommendations.push('Reduce passive voice usage for more direct communication');
    }

    if (language === 'ja') {
      const polite = features.languageSpecificMetrics?.politeForm || 0;
      const casual = features.languageSpecificMetrics?.casualForm || 0;
      if (polite > 0 && casual > 0) {
        recommendations.push('Maintain consistent formality level throughout');
      }
    }

    return recommendations;
  }

  /**
   * Mock translate function
   */
  private async mockTranslate(content: string, from: string, to: string): Promise<string> {
    // In production, this would call a real translation API
    return `[Translated from ${from} to ${to}]: ${content}`;
  }

  /**
   * Extract preserved elements
   */
  private extractPreservedElements(content: string): PreservedElement[] {
    const elements: PreservedElement[] = [];

    // Extract URLs
    const urls = content.match(/https?:\/\/[^\s]+/g);
    if (urls) {
      urls.forEach((url) => {
        elements.push({ type: 'url', value: url, position: content.indexOf(url) });
      });
    }

    // Extract emails
    const emails = content.match(/[\w.-]+@[\w.-]+\.\w+/g);
    if (emails) {
      emails.forEach((email) => {
        elements.push({ type: 'email', value: email, position: content.indexOf(email) });
      });
    }

    // Extract numbers
    const numbers = content.match(/\b\d+([.,]\d+)?\b/g);
    if (numbers) {
      numbers.forEach((num) => {
        elements.push({ type: 'number', value: num, position: content.indexOf(num) });
      });
    }

    return elements;
  }

  /**
   * Hash content
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.languageProcessors.keys());
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): boolean {
    return this.languageProcessors.has(language);
  }
}

/**
 * Base language processor
 */
class BaseLanguageProcessor implements LanguageProcessor {
  constructor(
    public readonly language: string,
    public readonly version: string = '1.0.0'
  ) {}

  async tokenize(content: string): Promise<Token[]> {
    const tokens: Token[] = [];
    const words = content.split(/(\s+|[.,;:!?])/);

    for (const word of words) {
      if (/\s+/.test(word)) {
        tokens.push({ type: 'whitespace', text: word });
      } else if (/[.,;:!?]/.test(word)) {
        tokens.push({ type: 'punctuation', text: word });
      } else if (word.trim()) {
        tokens.push({ type: 'word', text: word });
      }
    }

    return tokens;
  }

  async normalize(content: string): Promise<string> {
    return content.toLowerCase().trim();
  }
}

/**
 * Types and interfaces
 */
export interface LanguageDetectionResult {
  primaryLanguage: string;
  confidence: number;
  alternatives: Array<{
    language: string;
    confidence: number;
  }>;
  indicators: LanguageIndicator[];
  isMultilingual: boolean;
  supportedLanguages: string[];
}

export interface LanguageIndicator {
  type: 'charset' | 'pattern' | 'stopwords';
  language: string;
  confidence: number;
  evidence: string;
}

export interface LanguageAnalysisResult {
  language: string;
  tokens: Token[];
  features: LanguageFeatures;
  sentiment: LanguageSentiment;
  culturalIssues: CulturalIssue[];
  readability: LanguageReadability;
  recommendations: string[];
  metadata: {
    processedAt: Date;
    processorVersion: string;
  };
}

export interface Token {
  type: 'word' | 'punctuation' | 'whitespace' | 'symbol';
  text: string;
}

export interface LanguageFeatures {
  sentenceCount: number;
  wordCount: number;
  averageSentenceLength: number;
  averageWordLength: number;
  vocabularyDiversity: number;
  stopWordRatio: number;
  punctuationDensity: number;
  languageSpecificMetrics: Record<string, number>;
}

export interface LanguageSentiment {
  positive: number;
  negative: number;
  neutral: number;
  overall: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface CulturalIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedRegions: string[];
  recommendation: string;
}

export interface LanguageReadability {
  fleschReadingEase: number;
  gradeLevel: number;
  difficulty: string;
  averageSentenceLength: number;
  averageWordLength: number;
  languageSpecificScore: number;
}

export interface TranslationResult {
  originalLanguage: string;
  targetLanguage: string;
  originalContent: string;
  translatedContent: string;
  confidence: number;
  preservedElements: PreservedElement[];
  warnings: string[];
}

export interface PreservedElement {
  type: 'url' | 'email' | 'number' | 'code' | 'brand';
  value: string;
  position: number;
}

export interface LanguagePatterns {
  stopWords: Set<string>;
  sentenceDelimiters: RegExp;
  wordDelimiters: RegExp;
  commonPatterns: Record<string, RegExp>;
}

export interface CulturalPattern {
  type: string;
  regex: RegExp;
  severity: 'low' | 'medium' | 'high';
  description: string;
  regions: string[];
  recommendation: string;
}

export interface LanguageDetector {
  detect(content: string): Promise<string>;
  confidence(): number;
}

export interface LanguageProcessor {
  language: string;
  version: string;
  tokenize(content: string): Promise<Token[]>;
  normalize(content: string): Promise<string>;
}
