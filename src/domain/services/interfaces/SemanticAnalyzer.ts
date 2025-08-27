/**
 * Interface for semantic analysis of content
 * Analyzes meaning, intent, and contextual relationships
 */
export interface SemanticAnalyzer {
  /**
   * Analyze semantic properties of content
   */
  analyze(content: string, options?: SemanticAnalysisOptions): Promise<SemanticAnalysisResult>;

  /**
   * Extract key concepts and entities
   */
  extractConcepts(content: string): Promise<ConceptExtraction>;

  /**
   * Analyze relationships between concepts
   */
  analyzeRelationships(concepts: Concept[]): Promise<ConceptRelationship[]>;

  /**
   * Determine content intent
   */
  detectIntent(content: string): Promise<IntentDetection>;
}

/**
 * Options for semantic analysis
 */
export interface SemanticAnalysisOptions {
  /**
   * Language of the content
   */
  language?: string;

  /**
   * Domain context (e.g., 'marketing', 'technical', 'legal')
   */
  domain?: string;

  /**
   * Enable deep analysis
   */
  deepAnalysis?: boolean;

  /**
   * Custom vocabulary to consider
   */
  customVocabulary?: string[];

  /**
   * Industry-specific terms
   */
  industryTerms?: Map<string, string>;
}

/**
 * Result of semantic analysis
 */
export interface SemanticAnalysisResult {
  /**
   * Primary topic/theme
   */
  primaryTopic: string;

  /**
   * Secondary topics
   */
  secondaryTopics: string[];

  /**
   * Semantic coherence score (0-100)
   */
  coherenceScore: number;

  /**
   * Detected intent
   */
  intent: IntentType;

  /**
   * Sentiment analysis
   */
  sentiment: SentimentAnalysis;

  /**
   * Key concepts extracted
   */
  concepts: Concept[];

  /**
   * Concept relationships
   */
  relationships: ConceptRelationship[];

  /**
   * Readability metrics
   */
  readability: ReadabilityMetrics;

  /**
   * Semantic issues detected
   */
  issues: SemanticIssue[];

  /**
   * Confidence in analysis (0-100)
   */
  confidence: number;
}

/**
 * Extracted concept
 */
export interface Concept {
  /**
   * Concept text
   */
  text: string;

  /**
   * Concept type (entity, action, attribute, etc.)
   */
  type: ConceptType;

  /**
   * Relevance score (0-100)
   */
  relevance: number;

  /**
   * Frequency in content
   */
  frequency: number;

  /**
   * Position in text
   */
  positions: TextPosition[];

  /**
   * Associated metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Concept extraction result
 */
export interface ConceptExtraction {
  /**
   * All extracted concepts
   */
  concepts: Concept[];

  /**
   * Named entities
   */
  entities: NamedEntity[];

  /**
   * Key phrases
   */
  keyPhrases: string[];

  /**
   * Categories detected
   */
  categories: string[];
}

/**
 * Named entity
 */
export interface NamedEntity {
  /**
   * Entity text
   */
  text: string;

  /**
   * Entity type (person, organization, location, etc.)
   */
  type: EntityType;

  /**
   * Confidence score
   */
  confidence: number;

  /**
   * Position in text
   */
  position: TextPosition;
}

/**
 * Relationship between concepts
 */
export interface ConceptRelationship {
  /**
   * Source concept
   */
  source: Concept;

  /**
   * Target concept
   */
  target: Concept;

  /**
   * Relationship type
   */
  type: RelationshipType;

  /**
   * Strength of relationship (0-100)
   */
  strength: number;

  /**
   * Direction of relationship
   */
  direction: 'unidirectional' | 'bidirectional';
}

/**
 * Intent detection result
 */
export interface IntentDetection {
  /**
   * Primary intent
   */
  primary: IntentType;

  /**
   * Secondary intents
   */
  secondary: IntentType[];

  /**
   * Intent confidence scores
   */
  confidences: Map<IntentType, number>;

  /**
   * Intent indicators found
   */
  indicators: string[];
}

/**
 * Sentiment analysis result
 */
export interface SentimentAnalysis {
  /**
   * Overall sentiment
   */
  overall: 'positive' | 'negative' | 'neutral' | 'mixed';

  /**
   * Sentiment score (-100 to 100)
   */
  score: number;

  /**
   * Emotion detection
   */
  emotions: EmotionScores;

  /**
   * Sentiment by aspect
   */
  aspects: Map<string, SentimentScore>;
}

/**
 * Emotion scores
 */
export interface EmotionScores {
  joy: number;
  anger: number;
  fear: number;
  sadness: number;
  surprise: number;
  disgust: number;
  trust: number;
  anticipation: number;
}

/**
 * Readability metrics
 */
export interface ReadabilityMetrics {
  /**
   * Flesch Reading Ease score
   */
  fleschReadingEase: number;

  /**
   * Grade level required
   */
  gradeLevel: number;

  /**
   * Average sentence length
   */
  avgSentenceLength: number;

  /**
   * Average word length
   */
  avgWordLength: number;

  /**
   * Complex word percentage
   */
  complexWordPercentage: number;

  /**
   * Readability category
   */
  category: 'very_easy' | 'easy' | 'moderate' | 'difficult' | 'very_difficult';
}

/**
 * Semantic issue detected
 */
export interface SemanticIssue {
  /**
   * Issue type
   */
  type: SemanticIssueType;

  /**
   * Severity level
   */
  severity: 'low' | 'medium' | 'high';

  /**
   * Issue description
   */
  description: string;

  /**
   * Location in text
   */
  position?: TextPosition;

  /**
   * Suggested fix
   */
  suggestion?: string;

  /**
   * Impact on meaning
   */
  impact: string;
}

/**
 * Text position
 */
export interface TextPosition {
  start: number;
  end: number;
  line?: number;
  column?: number;
}

/**
 * Types of concepts
 */
export enum ConceptType {
  ENTITY = 'entity',
  ACTION = 'action',
  ATTRIBUTE = 'attribute',
  VALUE = 'value',
  RELATIONSHIP = 'relationship',
  EVENT = 'event',
  STATE = 'state'
}

/**
 * Types of entities
 */
export enum EntityType {
  PERSON = 'person',
  ORGANIZATION = 'organization',
  LOCATION = 'location',
  PRODUCT = 'product',
  DATE = 'date',
  TIME = 'time',
  MONEY = 'money',
  PERCENTAGE = 'percentage',
  EMAIL = 'email',
  URL = 'url',
  PHONE = 'phone'
}

/**
 * Types of relationships
 */
export enum RelationshipType {
  IS_A = 'is_a',
  PART_OF = 'part_of',
  RELATED_TO = 'related_to',
  CAUSES = 'causes',
  AFFECTS = 'affects',
  PRECEDES = 'precedes',
  FOLLOWS = 'follows',
  CONTRADICTS = 'contradicts',
  SUPPORTS = 'supports'
}

/**
 * Types of intent
 */
export enum IntentType {
  INFORM = 'inform',
  PERSUADE = 'persuade',
  ENTERTAIN = 'entertain',
  INSTRUCT = 'instruct',
  QUESTION = 'question',
  REQUEST = 'request',
  COMPLAIN = 'complain',
  PRAISE = 'praise',
  WARN = 'warn',
  THREATEN = 'threaten'
}

/**
 * Types of semantic issues
 */
export enum SemanticIssueType {
  AMBIGUITY = 'ambiguity',
  CONTRADICTION = 'contradiction',
  REDUNDANCY = 'redundancy',
  VAGUENESS = 'vagueness',
  INCONSISTENCY = 'inconsistency',
  MISSING_CONTEXT = 'missing_context',
  UNCLEAR_REFERENCE = 'unclear_reference',
  LOGICAL_FALLACY = 'logical_fallacy'
}

/**
 * Individual sentiment score
 */
export interface SentimentScore {
  value: number;
  confidence: number;
}