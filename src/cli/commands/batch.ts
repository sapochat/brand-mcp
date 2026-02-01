import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { ContainerBuilder } from '../../infrastructure/di/ContainerBuilder.js';
import { ServiceKeys } from '../../infrastructure/di/Container.js';
import chalk from 'chalk';
import type {
  BatchEvaluationResult,
  BatchItemResult,
  BatchItemError,
  CommonIssue,
} from '../../application/use-cases/BatchEvaluationUseCase.js';

/**
 * Parsed CSV row with dynamic string keys
 */
interface CSVRow {
  [key: string]: string;
}

/**
 * Input item from JSON file for batch processing
 */
interface BatchFileItem {
  id?: string;
  content?: string;
  text?: string;
  message?: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for batch use case execute method
 */
interface BatchUseCaseExecutor {
  execute(input: {
    items: Array<{
      id: string;
      content: string;
      context?: string;
      metadata?: Record<string, unknown>;
    }>;
    evaluationType: string;
    options: {
      includeSafety: boolean;
      includeBrand: boolean;
    };
  }): Promise<BatchEvaluationResult>;
}

/**
 * Batch processing command
 */
export function batchCommand(): Command {
  const command = new Command('batch');

  command
    .description('Process multiple content items in batch')
    .argument('<input>', 'Input file path (JSON or CSV)')
    .option('-t, --type <type>', 'Evaluation type (safety|compliance|combined)', 'combined')
    .option('-o, --output <path>', 'Output file path')
    .option('-f, --format <format>', 'Output format (json|csv)', 'json')
    .option('--max-concurrent <n>', 'Maximum concurrent evaluations', '10')
    .action(async (input, options) => {
      try {
        // Load input file
        const inputPath = path.resolve(input);
        const inputContent = await fs.readFile(inputPath, 'utf-8');

        // Parse input based on file extension
        let items: BatchFileItem[] = [];
        if (inputPath.endsWith('.json')) {
          items = JSON.parse(inputContent) as BatchFileItem[];
        } else if (inputPath.endsWith('.csv')) {
          items = parseCSV(inputContent);
        } else {
          throw new Error('Unsupported input format. Use JSON or CSV.');
        }

        console.log(chalk.bold(`\n=== Processing ${items.length} items ===\n`));

        // Initialize container and get batch use case
        const container = await ContainerBuilder.build();
        const batchUseCase = container.resolve<BatchUseCaseExecutor>(
          ServiceKeys.BATCH_EVALUATION_USE_CASE
        );

        // Prepare batch input
        const batchInput = {
          items: items.map((item, index) => ({
            id: item.id || `item_${index}`,
            content: item.content || item.text || item.message || '',
            context: item.context,
            metadata: item.metadata,
          })),
          evaluationType: options.type as string,
          options: {
            includeSafety: options.type === 'safety' || options.type === 'combined',
            includeBrand: options.type === 'compliance' || options.type === 'combined',
          },
        };

        // Execute batch evaluation
        const startTime = Date.now();
        const result = await batchUseCase.execute(batchInput);
        const duration = Date.now() - startTime;

        // Display results
        console.log(chalk.bold('Results:'));
        console.log(`  Success: ${result.successCount}`);
        console.log(`  Errors: ${result.errorCount}`);
        console.log(`  Time: ${duration}ms`);
        console.log(`  Success Rate: ${result.summary.successRate.toFixed(1)}%`);

        if (result.summary.averageComplianceScore > 0) {
          console.log(`  Avg Score: ${result.summary.averageComplianceScore.toFixed(1)}/100`);
        }

        if (result.summary.highRiskCount > 0) {
          console.log(chalk.red(`  High Risk Items: ${result.summary.highRiskCount}`));
        }

        // Save output if specified
        if (options.output) {
          const outputPath = path.resolve(options.output as string);

          if (options.format === 'csv') {
            const csv = formatResultsAsCSV(result);
            await fs.writeFile(outputPath, csv);
          } else {
            await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
          }

          console.log(chalk.green(`\nResults saved to: ${outputPath}`));
        }

        // Show common issues
        if (result.summary.commonIssues.length > 0) {
          console.log(chalk.bold('\nCommon Issues:'));
          result.summary.commonIssues.forEach((issue: CommonIssue) => {
            console.log(`  - ${issue.type}: ${issue.description} (${issue.frequency}x)`);
          });
        }

        console.log();

        process.exit(result.errorCount > 0 ? 1 : 0);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return command;
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have headers and at least one data row');
  }

  const headers = lines[0].split(',').map((h) => h.trim());
  const items: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const item: CSVRow = {};

    headers.forEach((header, index) => {
      item[header] = values[index] || '';
    });

    items.push(item);
  }

  return items;
}

function formatResultsAsCSV(result: BatchEvaluationResult): string {
  const rows: string[] = [];

  // Headers
  rows.push('ID,Status,Score,Compliant,Risk Level,Issues');

  // Data rows
  result.results.forEach((item: BatchItemResult) => {
    const evalResult = item.result;
    let score = 0;
    let isCompliant = false;
    let riskLevel = 'UNKNOWN';
    let issueCount = 0;

    if ('complianceScore' in evalResult) {
      score = evalResult.complianceScore;
      isCompliant = evalResult.isCompliant;
      if ('issues' in evalResult && Array.isArray(evalResult.issues)) {
        issueCount = evalResult.issues.length;
      }
    }

    if ('combinedScore' in evalResult && evalResult.combinedScore !== undefined) {
      score = evalResult.combinedScore;
      isCompliant = evalResult.isCompliant;
    }

    if ('overallRisk' in evalResult) {
      riskLevel = evalResult.overallRisk;
    }

    rows.push(`${item.id},${item.status},${score},${isCompliant},${riskLevel},${issueCount}`);
  });

  // Add errors
  result.errors.forEach((error: BatchItemError) => {
    rows.push(`${error.id},error,0,false,UNKNOWN,"${error.error}"`);
  });

  return rows.join('\n');
}
