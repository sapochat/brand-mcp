/**
 * Sample profanity filter evaluation plugin
 */
export default class ProfanityFilterPlugin {
  constructor() {
    this.id = 'profanity-filter';
    this.name = 'Profanity Filter Plugin';
    this.version = '1.0.0';
    this.description = 'Detects and filters profanity in content';
    this.evaluationType = 'safety';
    
    // Common profanity patterns (simplified for demo)
    this.profanityPatterns = [
      /\b(damn|hell|crap)\b/gi,
      /\b(stupid|idiot|dumb)\b/gi,
      // Add more patterns as needed
    ];
  }

  isCompatible(systemVersion) {
    const [major] = systemVersion.split('.');
    return major === '1';
  }

  async onLoad() {
    console.log(`${this.name} loaded successfully`);
  }

  async evaluate(content, context) {
    const issues = [];
    let score = 100;
    let riskLevel = 'NONE';

    // Check for profanity
    for (const pattern of this.profanityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const position = content.indexOf(match);
          issues.push({
            type: 'profanity',
            severity: 'warning',
            description: `Potentially inappropriate language detected: "${match}"`,
            position: {
              start: position,
              end: position + match.length
            },
            suggestion: 'Consider using more professional language'
          });
          score -= 10;
        });
      }
    }

    // Determine risk level based on score
    if (score >= 90) {
      riskLevel = 'NONE';
    } else if (score >= 70) {
      riskLevel = 'LOW';
    } else if (score >= 50) {
      riskLevel = 'MEDIUM';
    } else if (score >= 30) {
      riskLevel = 'HIGH';
    } else {
      riskLevel = 'VERY_HIGH';
    }

    return {
      pluginId: this.id,
      score: Math.max(0, score),
      isCompliant: score >= 70,
      riskLevel,
      issues,
      metadata: {
        profanityCount: issues.length,
        checkedAt: new Date().toISOString()
      }
    };
  }

  getConfigSchema() {
    return {
      schema: {
        type: 'object',
        properties: {
          strictMode: {
            type: 'boolean',
            default: false
          },
          customWords: {
            type: 'array',
            items: { type: 'string' },
            default: []
          }
        }
      }
    };
  }
}