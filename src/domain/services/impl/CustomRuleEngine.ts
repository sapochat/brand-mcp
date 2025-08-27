/**
 * Custom rule engine for defining and executing business-specific validation rules
 */
export class CustomRuleEngine {
  private rules: Map<string, Rule> = new Map();
  private ruleGroups: Map<string, RuleGroup> = new Map();
  private ruleCache: Map<string, RuleExecutionResult> = new Map();
  private executionHistory: ExecutionHistory[] = [];

  /**
   * Add a custom rule
   */
  addRule(rule: Rule): void {
    this.validateRule(rule);
    this.rules.set(rule.id, rule);
    this.invalidateCache();
  }

  /**
   * Add a rule group
   */
  addRuleGroup(group: RuleGroup): void {
    this.ruleGroups.set(group.id, group);
    group.rules.forEach(rule => this.addRule(rule));
  }

  /**
   * Execute rules on content
   */
  async execute(
    content: string,
    context?: RuleContext,
    options?: ExecutionOptions
  ): Promise<RuleEngineResult> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();

    // Get applicable rules
    const applicableRules = this.getApplicableRules(context, options);
    
    // Execute rules
    const results: RuleExecutionResult[] = [];
    const violations: RuleViolation[] = [];
    const passes: RulePass[] = [];

    for (const rule of applicableRules) {
      const result = await this.executeRule(rule, content, context);
      results.push(result);

      if (result.passed) {
        passes.push({
          ruleId: rule.id,
          ruleName: rule.name,
          score: result.score
        });
      } else {
        violations.push(...result.violations);
      }

      // Early exit on critical violation if configured
      if (options?.stopOnCritical && result.violations.some(v => v.severity === 'critical')) {
        break;
      }
    }

    // Calculate overall score
    const overallScore = this.calculateOverallScore(results);
    const summary = this.generateSummary(results, violations, passes);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(violations, context);

    // Record execution history
    const executionTime = Date.now() - startTime;
    this.recordExecution(executionId, results, executionTime);

    return {
      executionId,
      timestamp: new Date(),
      passed: violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
      score: overallScore,
      rulesExecuted: results.length,
      violations,
      passes,
      summary,
      recommendations,
      executionTimeMs: executionTime,
      details: options?.includeDetails ? results : undefined
    };
  }

  /**
   * Execute a single rule
   */
  private async executeRule(
    rule: Rule,
    content: string,
    context?: RuleContext
  ): Promise<RuleExecutionResult> {
    // Check cache if enabled
    const cacheKey = this.getCacheKey(rule.id, content, context);
    if (rule.cacheable && this.ruleCache.has(cacheKey)) {
      return this.ruleCache.get(cacheKey)!;
    }

    const startTime = Date.now();
    const violations: RuleViolation[] = [];
    let passed = true;
    let score = 100;

    try {
      // Execute conditions
      for (const condition of rule.conditions) {
        const conditionResult = await this.evaluateCondition(condition, content, context);
        
        if (!conditionResult.met) {
          passed = false;
          score -= condition.weight || 10;

          if (rule.generateViolations) {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              condition: condition.description,
              severity: rule.severity,
              message: conditionResult.message || `Condition not met: ${condition.description}`,
              evidence: conditionResult.evidence,
              position: conditionResult.position
            });
          }
        }
      }

      // Execute actions if configured
      if (!passed && rule.actions) {
        for (const action of rule.actions) {
          await this.executeAction(action, content, context, violations);
        }
      }

      const result: RuleExecutionResult = {
        ruleId: rule.id,
        ruleName: rule.name,
        passed,
        score: Math.max(0, score),
        violations,
        executionTimeMs: Date.now() - startTime,
        metadata: rule.metadata
      };

      // Cache result if cacheable
      if (rule.cacheable) {
        this.ruleCache.set(cacheKey, result);
      }

      return result;

    } catch (error) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        score: 0,
        violations: [{
          ruleId: rule.id,
          ruleName: rule.name,
          condition: 'Rule Execution Error',
          severity: 'high',
          message: `Error executing rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
          evidence: []
        }],
        executionTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Evaluate a condition
   */
  private async evaluateCondition(
    condition: RuleCondition,
    content: string,
    context?: RuleContext
  ): Promise<ConditionResult> {
    switch (condition.type) {
      case 'pattern':
        return this.evaluatePatternCondition(condition as PatternCondition, content);
      
      case 'length':
        return this.evaluateLengthCondition(condition as LengthCondition, content);
      
      case 'contains':
        return this.evaluateContainsCondition(condition as ContainsCondition, content);
      
      case 'custom':
        return this.evaluateCustomCondition(condition as CustomCondition, content, context);
      
      case 'composite':
        return this.evaluateCompositeCondition(condition as CompositeCondition, content, context);
      
      default:
        return { met: false, message: `Unknown condition type: ${condition.type}` };
    }
  }

  /**
   * Evaluate pattern condition
   */
  private evaluatePatternCondition(
    condition: PatternCondition,
    content: string
  ): ConditionResult {
    const regex = new RegExp(condition.pattern, condition.flags || 'gi');
    const matches = content.match(regex);
    const matchCount = matches ? matches.length : 0;

    let met = false;
    switch (condition.operator) {
      case 'exists':
        met = matchCount > 0;
        break;
      case 'not_exists':
        met = matchCount === 0;
        break;
      case 'count_equals':
        met = matchCount === condition.value;
        break;
      case 'count_greater':
        met = matchCount > (condition.value || 0);
        break;
      case 'count_less':
        met = matchCount < (condition.value || Infinity);
        break;
    }

    return {
      met,
      message: met ? undefined : `Pattern "${condition.pattern}" ${condition.operator} failed`,
      evidence: matches || [],
      position: matches && matches.length > 0 ? {
        start: content.indexOf(matches[0]),
        end: content.indexOf(matches[0]) + matches[0].length
      } : undefined
    };
  }

  /**
   * Evaluate length condition
   */
  private evaluateLengthCondition(
    condition: LengthCondition,
    content: string
  ): ConditionResult {
    const length = condition.unit === 'characters' ? 
      content.length : 
      content.split(/\s+/).length;

    let met = false;
    switch (condition.operator) {
      case 'equals':
        met = length === condition.value;
        break;
      case 'greater':
        met = length > condition.value;
        break;
      case 'less':
        met = length < condition.value;
        break;
      case 'between':
        met = length >= condition.min! && length <= condition.max!;
        break;
    }

    return {
      met,
      message: met ? undefined : `Content ${condition.unit} count (${length}) ${condition.operator} ${condition.value} failed`
    };
  }

  /**
   * Evaluate contains condition
   */
  private evaluateContainsCondition(
    condition: ContainsCondition,
    content: string
  ): ConditionResult {
    const contentLower = content.toLowerCase();
    const found: string[] = [];
    const missing: string[] = [];

    for (const term of condition.terms) {
      if (contentLower.includes(term.toLowerCase())) {
        found.push(term);
      } else {
        missing.push(term);
      }
    }

    let met = false;
    switch (condition.mode) {
      case 'all':
        met = missing.length === 0;
        break;
      case 'any':
        met = found.length > 0;
        break;
      case 'none':
        met = found.length === 0;
        break;
    }

    return {
      met,
      message: met ? undefined : `Content must ${condition.mode} of: ${condition.terms.join(', ')}`,
      evidence: condition.mode === 'none' ? found : missing
    };
  }

  /**
   * Evaluate custom condition
   */
  private async evaluateCustomCondition(
    condition: CustomCondition,
    content: string,
    context?: RuleContext
  ): Promise<ConditionResult> {
    try {
      const result = await condition.evaluator(content, context);
      return {
        met: result.passed,
        message: result.message,
        evidence: result.evidence || []
      };
    } catch (error) {
      return {
        met: false,
        message: `Custom condition error: ${error instanceof Error ? error.message : 'Unknown'}`
      };
    }
  }

  /**
   * Evaluate composite condition
   */
  private async evaluateCompositeCondition(
    condition: CompositeCondition,
    content: string,
    context?: RuleContext
  ): Promise<ConditionResult> {
    const results: ConditionResult[] = [];
    
    for (const subCondition of condition.conditions) {
      const result = await this.evaluateCondition(subCondition, content, context);
      results.push(result);
    }

    let met = false;
    switch (condition.operator) {
      case 'AND':
        met = results.every(r => r.met);
        break;
      case 'OR':
        met = results.some(r => r.met);
        break;
      case 'NOT':
        met = !results[0].met;
        break;
    }

    return {
      met,
      message: met ? undefined : `Composite condition (${condition.operator}) failed`,
      evidence: results.filter(r => !r.met).flatMap(r => r.evidence || [])
    };
  }

  /**
   * Execute an action
   */
  private async executeAction(
    action: RuleAction,
    content: string,
    context?: RuleContext,
    violations: RuleViolation[]
  ): Promise<void> {
    switch (action.type) {
      case 'log':
        console.log(`Rule Action: ${action.message}`);
        break;
      
      case 'modify_score':
        // Score modification handled in rule execution
        break;
      
      case 'add_metadata':
        violations.forEach(v => {
          v.metadata = { ...v.metadata, ...action.metadata };
        });
        break;
      
      case 'custom':
        if (action.handler) {
          await action.handler(content, context, violations);
        }
        break;
    }
  }

  /**
   * Get applicable rules based on context
   */
  private getApplicableRules(
    context?: RuleContext,
    options?: ExecutionOptions
  ): Rule[] {
    let rules = Array.from(this.rules.values());

    // Filter by tags
    if (options?.tags && options.tags.length > 0) {
      rules = rules.filter(rule => 
        rule.tags?.some(tag => options.tags!.includes(tag))
      );
    }

    // Filter by groups
    if (options?.groups && options.groups.length > 0) {
      const groupRules = new Set<string>();
      options.groups.forEach(groupId => {
        const group = this.ruleGroups.get(groupId);
        if (group) {
          group.rules.forEach(rule => groupRules.add(rule.id));
        }
      });
      rules = rules.filter(rule => groupRules.has(rule.id));
    }

    // Filter by context
    if (context) {
      rules = rules.filter(rule => this.isRuleApplicable(rule, context));
    }

    // Sort by priority
    rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return rules;
  }

  /**
   * Check if rule is applicable to context
   */
  private isRuleApplicable(rule: Rule, context: RuleContext): boolean {
    if (!rule.applicability) return true;

    const { channels, industries, regions, contentTypes } = rule.applicability;

    if (channels && context.channel && !channels.includes(context.channel)) {
      return false;
    }

    if (industries && context.industry && !industries.includes(context.industry)) {
      return false;
    }

    if (regions && context.region && !regions.includes(context.region)) {
      return false;
    }

    if (contentTypes && context.contentType && !contentTypes.includes(context.contentType)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate overall score
   */
  private calculateOverallScore(results: RuleExecutionResult[]): number {
    if (results.length === 0) return 100;

    const totalWeight = results.reduce((sum, r) => {
      const rule = this.rules.get(r.ruleId);
      return sum + (rule?.weight || 1);
    }, 0);

    const weightedScore = results.reduce((sum, r) => {
      const rule = this.rules.get(r.ruleId);
      const weight = rule?.weight || 1;
      return sum + (r.score * weight);
    }, 0);

    return Math.round(weightedScore / totalWeight);
  }

  /**
   * Generate summary
   */
  private generateSummary(
    results: RuleExecutionResult[],
    violations: RuleViolation[],
    passes: RulePass[]
  ): RuleSummary {
    const violationsBySeverity = new Map<string, number>();
    violations.forEach(v => {
      violationsBySeverity.set(v.severity, (violationsBySeverity.get(v.severity) || 0) + 1);
    });

    return {
      totalRules: results.length,
      passed: passes.length,
      failed: results.length - passes.length,
      violations: violations.length,
      violationsBySeverity: Object.fromEntries(violationsBySeverity),
      criticalViolations: violations.filter(v => v.severity === 'critical').length,
      averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    violations: RuleViolation[],
    context?: RuleContext
  ): string[] {
    const recommendations = new Set<string>();

    violations.forEach(violation => {
      const rule = this.rules.get(violation.ruleId);
      if (rule?.recommendation) {
        recommendations.add(rule.recommendation);
      }
    });

    // Add severity-based recommendations
    if (violations.some(v => v.severity === 'critical')) {
      recommendations.add('Address critical violations immediately');
    }

    if (violations.length > 10) {
      recommendations.add('Consider comprehensive content review');
    }

    return Array.from(recommendations);
  }

  /**
   * Validate rule structure
   */
  private validateRule(rule: Rule): void {
    if (!rule.id || !rule.name) {
      throw new Error('Rule must have id and name');
    }

    if (!rule.conditions || rule.conditions.length === 0) {
      throw new Error('Rule must have at least one condition');
    }

    if (rule.severity && !['low', 'medium', 'high', 'critical'].includes(rule.severity)) {
      throw new Error('Invalid rule severity');
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(ruleId: string, content: string, context?: RuleContext): string {
    const contextKey = context ? JSON.stringify(context) : '';
    const contentHash = this.hashContent(content);
    return `${ruleId}:${contentHash}:${contextKey}`;
  }

  /**
   * Simple hash for content
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Generate execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record execution history
   */
  private recordExecution(
    executionId: string,
    results: RuleExecutionResult[],
    executionTime: number
  ): void {
    this.executionHistory.push({
      id: executionId,
      timestamp: new Date(),
      rulesExecuted: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      executionTimeMs: executionTime
    });

    // Keep only last 100 executions
    if (this.executionHistory.length > 100) {
      this.executionHistory.shift();
    }
  }

  /**
   * Invalidate cache
   */
  private invalidateCache(): void {
    this.ruleCache.clear();
  }

  /**
   * Export rules as JSON
   */
  exportRules(): string {
    const exportData = {
      rules: Array.from(this.rules.values()),
      groups: Array.from(this.ruleGroups.values())
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import rules from JSON
   */
  importRules(json: string): void {
    const data = JSON.parse(json);
    
    if (data.rules) {
      data.rules.forEach((rule: Rule) => this.addRule(rule));
    }
    
    if (data.groups) {
      data.groups.forEach((group: RuleGroup) => this.addRuleGroup(group));
    }
  }
}

/**
 * Types and interfaces
 */
export interface Rule {
  id: string;
  name: string;
  description?: string;
  conditions: RuleCondition[];
  actions?: RuleAction[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority?: number;
  weight?: number;
  tags?: string[];
  applicability?: RuleApplicability;
  generateViolations?: boolean;
  cacheable?: boolean;
  recommendation?: string;
  metadata?: Record<string, any>;
}

export interface RuleGroup {
  id: string;
  name: string;
  description?: string;
  rules: Rule[];
  enabled?: boolean;
}

export interface RuleCondition {
  type: 'pattern' | 'length' | 'contains' | 'custom' | 'composite';
  description: string;
  weight?: number;
}

export interface PatternCondition extends RuleCondition {
  type: 'pattern';
  pattern: string;
  flags?: string;
  operator: 'exists' | 'not_exists' | 'count_equals' | 'count_greater' | 'count_less';
  value?: number;
}

export interface LengthCondition extends RuleCondition {
  type: 'length';
  unit: 'characters' | 'words';
  operator: 'equals' | 'greater' | 'less' | 'between';
  value: number;
  min?: number;
  max?: number;
}

export interface ContainsCondition extends RuleCondition {
  type: 'contains';
  terms: string[];
  mode: 'all' | 'any' | 'none';
}

export interface CustomCondition extends RuleCondition {
  type: 'custom';
  evaluator: (content: string, context?: RuleContext) => Promise<{
    passed: boolean;
    message?: string;
    evidence?: string[];
  }>;
}

export interface CompositeCondition extends RuleCondition {
  type: 'composite';
  operator: 'AND' | 'OR' | 'NOT';
  conditions: RuleCondition[];
}

export interface RuleAction {
  type: 'log' | 'modify_score' | 'add_metadata' | 'custom';
  message?: string;
  metadata?: Record<string, any>;
  handler?: (content: string, context?: RuleContext, violations?: RuleViolation[]) => Promise<void>;
}

export interface RuleContext {
  channel?: string;
  industry?: string;
  region?: string;
  contentType?: string;
  metadata?: Record<string, any>;
}

export interface RuleApplicability {
  channels?: string[];
  industries?: string[];
  regions?: string[];
  contentTypes?: string[];
}

export interface ExecutionOptions {
  tags?: string[];
  groups?: string[];
  stopOnCritical?: boolean;
  includeDetails?: boolean;
}

export interface RuleEngineResult {
  executionId: string;
  timestamp: Date;
  passed: boolean;
  score: number;
  rulesExecuted: number;
  violations: RuleViolation[];
  passes: RulePass[];
  summary: RuleSummary;
  recommendations: string[];
  executionTimeMs: number;
  details?: RuleExecutionResult[];
}

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  score: number;
  violations: RuleViolation[];
  executionTimeMs: number;
  metadata?: Record<string, any>;
  error?: string;
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  evidence?: string[];
  position?: { start: number; end: number };
  metadata?: Record<string, any>;
}

export interface RulePass {
  ruleId: string;
  ruleName: string;
  score: number;
}

export interface RuleSummary {
  totalRules: number;
  passed: number;
  failed: number;
  violations: number;
  violationsBySeverity: Record<string, number>;
  criticalViolations: number;
  averageScore: number;
}

export interface ConditionResult {
  met: boolean;
  message?: string;
  evidence?: string[];
  position?: { start: number; end: number };
}

export interface ExecutionHistory {
  id: string;
  timestamp: Date;
  rulesExecuted: number;
  passed: number;
  failed: number;
  executionTimeMs: number;
}