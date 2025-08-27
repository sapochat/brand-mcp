/**
 * Sample JSON formatter plugin
 */
export default class JsonFormatterPlugin {
  constructor() {
    this.id = 'json-formatter';
    this.name = 'JSON Formatter Plugin';
    this.version = '1.0.0';
    this.description = 'Formats evaluation results as JSON with various styles';
    this.supportedFormats = ['json', 'json-compact', 'json-summary'];
  }

  isCompatible(systemVersion) {
    return true; // Compatible with all versions
  }

  async format(result, format) {
    switch (format) {
      case 'json':
        return this.formatPrettyJson(result);
      
      case 'json-compact':
        return this.formatCompactJson(result);
      
      case 'json-summary':
        return this.formatJsonSummary(result);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  formatPrettyJson(result) {
    return JSON.stringify(result, null, 2);
  }

  formatCompactJson(result) {
    return JSON.stringify(result);
  }

  formatJsonSummary(result) {
    // Extract summary information
    const summary = {
      timestamp: new Date().toISOString(),
      evaluation: {
        score: result.complianceScore || result.score || 0,
        isCompliant: result.isCompliant || false,
        riskLevel: result.overallRisk || result.riskLevel || 'UNKNOWN'
      },
      issues: {
        total: result.issues?.length || 0,
        byType: this.groupIssuesByType(result.issues || []),
        bySeverity: this.groupIssuesBySeverity(result.issues || [])
      }
    };

    // Add plugin results if available
    if (result.pluginResults) {
      summary.plugins = result.pluginResults.map(pr => ({
        pluginId: pr.pluginId,
        score: pr.score,
        isCompliant: pr.isCompliant
      }));
    }

    return JSON.stringify(summary, null, 2);
  }

  groupIssuesByType(issues) {
    const grouped = {};
    issues.forEach(issue => {
      const type = issue.type || 'unknown';
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return grouped;
  }

  groupIssuesBySeverity(issues) {
    const grouped = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0
    };
    
    issues.forEach(issue => {
      const severity = issue.severity || 'info';
      if (severity in grouped) {
        grouped[severity]++;
      }
    });
    
    return grouped;
  }
}