// Brand safety categories
export enum BrandSafetyCategory {
  SEXUAL_CONTENT = 'SEXUAL_CONTENT',
  VIOLENCE = 'VIOLENCE',
  HATE_SPEECH = 'HATE_SPEECH',
  HARASSMENT = 'HARASSMENT',
  SELF_HARM = 'SELF_HARM',
  ILLEGAL_ACTIVITIES = 'ILLEGAL_ACTIVITIES',
  PROFANITY = 'PROFANITY',
  ALCOHOL_TOBACCO = 'ALCOHOL_TOBACCO',
  POLITICAL = 'POLITICAL',
  RELIGION = 'RELIGION',
  SENTIMENT_ANALYSIS = 'SENTIMENT_ANALYSIS',
  CONTEXTUAL_ANALYSIS = 'CONTEXTUAL_ANALYSIS',
}

// Risk levels for safety evaluations
export enum RiskLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

// Interface for content safety evaluation result
export interface ContentSafetyResult {
  category: BrandSafetyCategory;
  riskLevel: RiskLevel;
  explanation: string;
}

// Overall brand safety evaluation
export interface BrandSafetyEvaluation {
  content: string;
  evaluations: ContentSafetyResult[];
  overallRisk: RiskLevel;
  summary: string;
  timestamp: string;
  contextualAssessment?: {
    assessment: string; // e.g., "safe_in_context", "borderline_contextual_risk", "unsafe_due_to_context"
    explanation: string;
    riskLevel?: RiskLevel; // Optional: if the LLM provides a direct risk level
  };
}

// Brand safety configuration
export interface BrandSafetyConfig {
  // Categories to evaluate
  categories: BrandSafetyCategory[];

  // Risk tolerance per category
  riskTolerances: Record<BrandSafetyCategory, RiskLevel>;

  // Brand-specific keywords to monitor
  sensitiveKeywords: string[];

  // Brand-specific allowed topics
  allowedTopics: string[];

  // Brand-specific blocked topics
  blockedTopics: string[];
}

// Default brand safety configuration
export const DEFAULT_BRAND_SAFETY_CONFIG: BrandSafetyConfig = {
  categories: Object.values(BrandSafetyCategory),
  riskTolerances: {
    [BrandSafetyCategory.SEXUAL_CONTENT]: RiskLevel.LOW,
    [BrandSafetyCategory.VIOLENCE]: RiskLevel.LOW,
    [BrandSafetyCategory.HATE_SPEECH]: RiskLevel.NONE,
    [BrandSafetyCategory.HARASSMENT]: RiskLevel.NONE,
    [BrandSafetyCategory.SELF_HARM]: RiskLevel.NONE,
    [BrandSafetyCategory.ILLEGAL_ACTIVITIES]: RiskLevel.NONE,
    [BrandSafetyCategory.PROFANITY]: RiskLevel.LOW,
    [BrandSafetyCategory.ALCOHOL_TOBACCO]: RiskLevel.MEDIUM,
    [BrandSafetyCategory.POLITICAL]: RiskLevel.MEDIUM,
    [BrandSafetyCategory.RELIGION]: RiskLevel.MEDIUM,
    [BrandSafetyCategory.SENTIMENT_ANALYSIS]: RiskLevel.NONE, // Default, can be adjusted
    [BrandSafetyCategory.CONTEXTUAL_ANALYSIS]: RiskLevel.NONE, // Default, actual risk determined by LLM
  },
  sensitiveKeywords: [],
  allowedTopics: [],
  blockedTopics: [],
};

// Recommendation types
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ActionableInsight {
  title: string;
  description: string;
  actionItems: string[];
  expectedImpact: string;
  priority: RecommendationPriority;
  category: string;
  metrics?: {
    currentValue: number;
    targetValue: number;
    improvement: string;
  };
  context?: {
    industry?: string;
    audience?: string;
    platform?: string;
    constraints?: string[];
  };
}

export interface ImprovementStrategy {
  id: string;
  name: string;
  description: string;
  filter: (insights: ActionableInsight[]) => ActionableInsight[];
  prioritize: (insights: ActionableInsight[]) => ActionableInsight[];
}

export interface PriorityMatrix {
  urgent: {
    important: ActionableInsight[];
    notImportant: ActionableInsight[];
  };
  notUrgent: {
    important: ActionableInsight[];
    notImportant: ActionableInsight[];
  };
}

export interface RoadmapPhases {
  immediate: ActionableInsight[];
  shortTerm: ActionableInsight[];
  longTerm: ActionableInsight[];
}

export interface RoadmapMilestone {
  name: string;
  target: string;
  items: number;
  priority: RecommendationPriority | string;
}

export interface RoadmapTimeline {
  totalEstimatedDays: number;
  breakdown: {
    immediate: number;
    shortTerm: number;
    longTerm: number;
  };
}

export interface RoadmapDependency {
  prerequisite: string;
  dependent: string;
  reason: string;
}

export interface Roadmap {
  phases: RoadmapPhases;
  milestones: RoadmapMilestone[];
  timeline: RoadmapTimeline;
  dependencies: RoadmapDependency[];
}

export interface ImpactEstimate {
  current: number;
  projected: number;
  improvement: number;
  percentageGain: string;
  confidence: string;
}

export interface ResourceSuggestion {
  type: string;
  title: string;
  url: string;
  relevance: string;
}

export interface ContentRecommendation {
  summary: string;
  insights: ActionableInsight[];
  priorityMatrix: PriorityMatrix;
  roadmap: Roadmap;
  estimatedImpact: ImpactEstimate;
  nextSteps: string[];
  resources: ResourceSuggestion[];
}

export interface RecommendationContext {
  industry?: string;
  audience?: string;
  platform?: string;
  urgency?: 'low' | 'medium' | 'high';
  constraints?: string[];
}

export interface RecommendationConfig {
  strategy?: string;
  maxRecommendations?: number;
  includeMetrics?: boolean;
  detailLevel?: 'summary' | 'detailed' | 'comprehensive';
}

export interface SafetyScores {
  overallScore: number;
  toxicityScore: number;
  biasScore: number;
  categoryScores?: Partial<Record<BrandSafetyCategory, number>>;
}

export interface ComplianceScores {
  overallScore: number;
  brandAlignmentScore: number;
  regulatoryCompliance: number;
  ruleScores?: Record<string, number>;
}

export interface EvaluationMetadata {
  wordCount?: number;
  source?: string;
  language?: string;
  contentType?: string;
  additionalData?: Record<string, string | number | boolean>;
}

export interface EvaluationResult {
  safety: SafetyScores;
  compliance: ComplianceScores;
  metadata?: EvaluationMetadata;
}
