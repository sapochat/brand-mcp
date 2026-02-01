import { Command } from 'commander';
import { promises as fs } from 'fs';
import { ContainerBuilder } from '../../infrastructure/di/ContainerBuilder.js';
import { ServiceKeys } from '../../infrastructure/di/Container.js';
import chalk from 'chalk';
import { SafetyEvaluation } from '../../domain/entities/SafetyEvaluation.js';
import { ComplianceEvaluation } from '../../domain/entities/ComplianceEvaluation.js';
import { CombinedEvaluationResult } from '../../domain/value-objects/EvaluationResult.js';

/**
 * Chalk color function type
 */
type ChalkColorFn = typeof chalk.green;

/**
 * Union type for all possible evaluation results
 */
type EvaluationResult = SafetyEvaluation | ComplianceEvaluation | CombinedEvaluationResult;

/**
 * Interface for safety use case
 */
interface SafetyUseCaseExecutor {
  execute(input: { content: string; context?: string }): Promise<SafetyEvaluation>;
}

/**
 * Interface for compliance use case result
 */
interface ComplianceUseCaseResult {
  evaluation: ComplianceEvaluation;
  brandName: string;
}

/**
 * Interface for compliance use case
 */
interface ComplianceUseCaseExecutor {
  execute(input: { content: string; context?: string }): Promise<ComplianceUseCaseResult>;
}

/**
 * Interface for combined use case
 */
interface CombinedUseCaseExecutor {
  execute(input: {
    content: string;
    context?: string;
    includeSafety: boolean;
    includeBrand: boolean;
  }): Promise<CombinedEvaluationResult>;
}

/**
 * Command options for validate command
 */
interface ValidateOptions {
  file?: boolean;
  type: string;
  context?: string;
  output: string;
  color?: boolean;
}

/**
 * Issue structure for display
 */
interface DisplayIssue {
  type: string;
  severity?: string;
  description: string;
  suggestion?: string;
}

/**
 * Validation command for checking content against brand safety rules
 */
export function validateCommand(): Command {
  const command = new Command('validate');

  command
    .description('Validate content against brand safety and compliance rules')
    .argument('<input>', 'Content to validate (text or file path)')
    .option('-f, --file', 'Treat input as file path')
    .option('-t, --type <type>', 'Type of validation (safety|compliance|combined)', 'combined')
    .option('-c, --context <context>', 'Context for evaluation')
    .option('-o, --output <format>', 'Output format (text|json)', 'text')
    .option('--no-color', 'Disable colored output')
    .action(async (input: string, options: ValidateOptions) => {
      try {
        // Load content
        let content = input;
        if (options.file) {
          content = await fs.readFile(input, 'utf-8');
        }

        // Initialize container and get use cases
        const container = await ContainerBuilder.build();

        let result: EvaluationResult;
        switch (options.type) {
          case 'safety': {
            const useCase = container.resolve<SafetyUseCaseExecutor>(
              ServiceKeys.CHECK_SAFETY_USE_CASE
            );
            result = await useCase.execute({
              content,
              context: options.context,
            });
            break;
          }

          case 'compliance': {
            const useCase = container.resolve<ComplianceUseCaseExecutor>(
              ServiceKeys.CHECK_COMPLIANCE_USE_CASE
            );
            const complianceResult = await useCase.execute({
              content,
              context: options.context,
            });
            result = complianceResult.evaluation;
            break;
          }

          case 'combined':
          default: {
            const useCase = container.resolve<CombinedUseCaseExecutor>(
              ServiceKeys.COMBINED_EVALUATION_USE_CASE
            );
            result = await useCase.execute({
              content,
              context: options.context,
              includeSafety: true,
              includeBrand: true,
            });
            break;
          }
        }

        // Format output
        if (options.output === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          formatTextOutput(result, options);
        }

        // Exit with appropriate code
        const isCompliant = checkCompliance(result);

        process.exit(isCompliant ? 0 : 1);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return command;
}

/**
 * Check if the result is compliant
 */
function checkCompliance(result: EvaluationResult): boolean {
  // Check for CombinedEvaluationResult
  if (result instanceof CombinedEvaluationResult) {
    if (result.combinedScore !== undefined) {
      return result.combinedScore >= 70;
    }
    return result.isCompliant;
  }

  // Check for ComplianceEvaluation
  if (result instanceof ComplianceEvaluation) {
    return result.complianceScore >= 70;
  }

  // Check for SafetyEvaluation
  if (result instanceof SafetyEvaluation) {
    return result.isSafe;
  }

  return false;
}

function formatTextOutput(result: EvaluationResult, options: ValidateOptions): void {
  const useColor = options.color !== false;

  console.log('\n' + chalk.bold('=== Validation Results ===\n'));

  // Display score
  if ('complianceScore' in result) {
    const score = result.complianceScore;
    const scoreColor = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
    console.log(
      chalk.bold('Compliance Score:'),
      useColor ? scoreColor(score + '/100') : score + '/100'
    );
  }

  if ('combinedScore' in result && result.combinedScore !== undefined) {
    const score = result.combinedScore;
    const scoreColor = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
    console.log(
      chalk.bold('Combined Score:'),
      useColor ? scoreColor(score + '/100') : score + '/100'
    );
  }

  // Display compliance status
  if ('isCompliant' in result) {
    const status = result.isCompliant ? 'Compliant' : 'Non-Compliant';
    const statusColor = result.isCompliant ? chalk.green : chalk.red;
    console.log(chalk.bold('Status:'), useColor ? statusColor(status) : status);
  }

  // Display risk level
  if ('overallRisk' in result) {
    const riskColors: Record<string, ChalkColorFn> = {
      NONE: chalk.green,
      LOW: chalk.green,
      MEDIUM: chalk.yellow,
      HIGH: chalk.red,
      VERY_HIGH: chalk.red,
    };
    const riskColor = riskColors[result.overallRisk] || chalk.white;
    console.log(
      chalk.bold('Risk Level:'),
      useColor ? riskColor(result.overallRisk) : result.overallRisk
    );
  }

  // Display issues
  if ('issues' in result && result.issues && result.issues.length > 0) {
    console.log('\n' + chalk.bold('Issues Found:'));
    result.issues.forEach((issue: DisplayIssue, index: number) => {
      const severityColors: Record<string, ChalkColorFn> = {
        info: chalk.blue,
        low: chalk.blue,
        warning: chalk.yellow,
        medium: chalk.yellow,
        error: chalk.red,
        high: chalk.red,
        critical: chalk.red,
      };

      const severity = issue.severity || 'info';
      const severityColor = severityColors[severity] || chalk.white;
      const severityText = useColor ? severityColor(`[${severity}]`) : `[${severity}]`;

      console.log(`  ${index + 1}. ${severityText} ${issue.type}: ${issue.description}`);

      if (issue.suggestion) {
        console.log(`     ${chalk.dim('Suggestion:')} ${issue.suggestion}`);
      }
    });
  } else {
    console.log('\n' + chalk.green('No issues found!'));
  }

  // Display recommendations (only for combined results with complianceEvaluation)
  if ('complianceEvaluation' in result && result.complianceEvaluation) {
    const issues = result.complianceEvaluation.issues;
    if (issues && issues.length > 0) {
      console.log('\n' + chalk.bold('Recommendations:'));
      issues.forEach((issue) => {
        if (issue.suggestion) {
          console.log(`  - ${issue.suggestion}`);
        }
      });
    }
  }

  console.log();
}
