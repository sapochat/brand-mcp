import { Command } from 'commander';
import { promises as fs } from 'fs';
import { ContainerBuilder } from '../../infrastructure/di/ContainerBuilder.js';
import { ServiceKeys } from '../../infrastructure/di/Container.js';
import chalk from 'chalk';

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
    .action(async (input, options) => {
      try {
        // Load content
        let content = input;
        if (options.file) {
          content = await fs.readFile(input, 'utf-8');
        }

        // Initialize container and get use cases
        const container = await ContainerBuilder.build();
        
        let result;
        switch (options.type) {
          case 'safety': {
            const useCase = container.resolve<any>(ServiceKeys.CHECK_SAFETY_USE_CASE);
            result = await useCase.execute({ 
              content, 
              context: options.context 
            });
            break;
          }
          
          case 'compliance': {
            const useCase = container.resolve<any>(ServiceKeys.CHECK_COMPLIANCE_USE_CASE);
            const complianceResult = await useCase.execute({ 
              content, 
              context: options.context 
            });
            result = complianceResult.evaluation;
            break;
          }
          
          case 'combined':
          default: {
            const useCase = container.resolve<any>(ServiceKeys.COMBINED_EVALUATION_USE_CASE);
            result = await useCase.execute({ 
              content, 
              context: options.context,
              includeSafety: true,
              includeBrand: true
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
        const isCompliant = result.isCompliant || 
                          (result.complianceScore && result.complianceScore >= 70) ||
                          (result.combinedScore && result.combinedScore >= 70);
        
        process.exit(isCompliant ? 0 : 1);

      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return command;
}

function formatTextOutput(result: any, options: any): void {
  const useColor = options.color !== false;
  
  console.log('\n' + chalk.bold('=== Validation Results ===\n'));

  // Display score
  if (result.complianceScore !== undefined) {
    const score = result.complianceScore;
    const scoreColor = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
    console.log(chalk.bold('Compliance Score:'), useColor ? scoreColor(score + '/100') : score + '/100');
  }

  if (result.combinedScore !== undefined) {
    const score = result.combinedScore;
    const scoreColor = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
    console.log(chalk.bold('Combined Score:'), useColor ? scoreColor(score + '/100') : score + '/100');
  }

  // Display compliance status
  if (result.isCompliant !== undefined) {
    const status = result.isCompliant ? '✅ Compliant' : '❌ Non-Compliant';
    const statusColor = result.isCompliant ? chalk.green : chalk.red;
    console.log(chalk.bold('Status:'), useColor ? statusColor(status) : status);
  }

  // Display risk level
  if (result.overallRisk) {
    const riskColors: Record<string, any> = {
      'NONE': chalk.green,
      'LOW': chalk.green,
      'MEDIUM': chalk.yellow,
      'HIGH': chalk.red,
      'VERY_HIGH': chalk.red
    };
    const riskColor = riskColors[result.overallRisk] || chalk.white;
    console.log(chalk.bold('Risk Level:'), useColor ? riskColor(result.overallRisk) : result.overallRisk);
  }

  // Display issues
  if (result.issues && result.issues.length > 0) {
    console.log('\n' + chalk.bold('Issues Found:'));
    result.issues.forEach((issue: any, index: number) => {
      const severityColors: Record<string, any> = {
        'info': chalk.blue,
        'warning': chalk.yellow,
        'error': chalk.red,
        'critical': chalk.red.bold
      };
      
      const severityColor = severityColors[issue.severity || 'info'] || chalk.white;
      const severityText = useColor ? severityColor(`[${issue.severity || 'info'}]`) : `[${issue.severity || 'info'}]`;
      
      console.log(`  ${index + 1}. ${severityText} ${issue.type}: ${issue.description}`);
      
      if (issue.suggestion) {
        console.log(`     ${chalk.dim('Suggestion:')} ${issue.suggestion}`);
      }
    });
  } else {
    console.log('\n' + chalk.green('No issues found!'));
  }

  // Display recommendations
  if (result.recommendations && result.recommendations.length > 0) {
    console.log('\n' + chalk.bold('Recommendations:'));
    result.recommendations.forEach((rec: string) => {
      console.log(`  • ${rec}`);
    });
  }

  console.log();
}