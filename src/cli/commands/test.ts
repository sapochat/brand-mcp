import { Command } from 'commander';
import { ContainerBuilder } from '../../infrastructure/di/ContainerBuilder.js';
import { ServiceKeys } from '../../infrastructure/di/Container.js';
import { CombinedEvaluationUseCase } from '../../application/use-cases/CombinedEvaluationUseCase.js';
import chalk from 'chalk';

/**
 * Test command for testing content scenarios
 */
export function testCommand(): Command {
  const command = new Command('test');

  command
    .description('Test content against various brand safety scenarios')
    .option('-s, --scenario <scenario>', 'Test scenario (safe|risky|offensive|mixed)', 'mixed')
    .option('-n, --count <count>', 'Number of test cases to generate', '5')
    .option('-v, --verbose', 'Show detailed results')
    .action(async (options) => {
      try {
        const container = await ContainerBuilder.build();
        const useCase = container.resolve<CombinedEvaluationUseCase>(
          ServiceKeys.COMBINED_EVALUATION_USE_CASE
        );

        // Generate test content based on scenario
        const testCases = generateTestCases(options.scenario, parseInt(options.count));

        console.log(chalk.bold(`\n=== Testing ${testCases.length} Content Samples ===\n`));

        let passCount = 0;
        let failCount = 0;

        for (const testCase of testCases) {
          console.log(chalk.bold(`Test: ${testCase.name}`));

          if (options.verbose) {
            console.log(chalk.dim(`Content: "${testCase.content.substring(0, 100)}..."`));
          }

          const result = await useCase.execute({
            content: testCase.content,
            context: testCase.context,
            includeSafety: true,
            includeBrand: true,
          });

          const passed = result.isCompliant === testCase.expectedCompliant;

          if (passed) {
            console.log(chalk.green('  ✅ PASSED'));
            passCount++;
          } else {
            console.log(chalk.red('  ❌ FAILED'));
            console.log(
              chalk.dim(
                `    Expected: ${testCase.expectedCompliant ? 'Compliant' : 'Non-Compliant'}`
              )
            );
            console.log(
              chalk.dim(`    Actual: ${result.isCompliant ? 'Compliant' : 'Non-Compliant'}`)
            );
            console.log(chalk.dim(`    Score: ${result.combinedScore}/100`));
            failCount++;
          }

          const issues = result.complianceEvaluation?.issues;
          if (options.verbose && issues && issues.length > 0) {
            console.log(chalk.dim('    Issues:'));
            issues.forEach((issue) => {
              console.log(chalk.dim(`      - ${issue.type}: ${issue.description}`));
            });
          }

          console.log();
        }

        // Summary
        console.log(chalk.bold('=== Test Summary ==='));
        console.log(chalk.green(`  Passed: ${passCount}`));
        console.log(chalk.red(`  Failed: ${failCount}`));
        console.log(`  Total: ${testCases.length}`);

        const successRate = (passCount / testCases.length) * 100;
        console.log(`  Success Rate: ${successRate.toFixed(1)}%\n`);

        process.exit(failCount > 0 ? 1 : 0);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return command;
}

interface TestCase {
  name: string;
  content: string;
  context?: string;
  expectedCompliant: boolean;
}

function generateTestCases(scenario: string, count: number): TestCase[] {
  const testCases: TestCase[] = [];

  const safeContent = [
    'Our company is committed to delivering exceptional value to our customers through innovative solutions.',
    "We're excited to announce the launch of our new product line designed with sustainability in mind.",
    'Join us for our annual conference where industry leaders share insights on best practices.',
    'Our team has been working diligently to improve customer experience across all touchpoints.',
    'We believe in fostering a culture of continuous learning and professional development.',
  ];

  const riskyContent = [
    "This deal is so crazy, you'd be stupid not to take advantage of it!",
    'Our competitors are absolute garbage compared to our superior products.',
    'Warning: This product may cause extreme reactions in some users.',
    'Get rich quick with our revolutionary system that beats the market!',
    "This exclusive offer is only for VIP members - don't tell anyone else!",
  ];

  const offensiveContent = [
    "Those idiots at the competition don't know what they're doing, damn fools!",
    'This crap product from our rivals is total hell to work with.',
    'What the hell were they thinking with this stupid design?',
    'Our old system was dumb as rocks, but this new one is brilliant!',
    'Those morons in marketing really screwed this campaign up badly.',
  ];

  switch (scenario) {
    case 'safe':
      for (let i = 0; i < Math.min(count, safeContent.length); i++) {
        testCases.push({
          name: `Safe Content Test ${i + 1}`,
          content: safeContent[i],
          context: 'marketing',
          expectedCompliant: true,
        });
      }
      break;

    case 'risky':
      for (let i = 0; i < Math.min(count, riskyContent.length); i++) {
        testCases.push({
          name: `Risky Content Test ${i + 1}`,
          content: riskyContent[i],
          context: 'marketing',
          expectedCompliant: false,
        });
      }
      break;

    case 'offensive':
      for (let i = 0; i < Math.min(count, offensiveContent.length); i++) {
        testCases.push({
          name: `Offensive Content Test ${i + 1}`,
          content: offensiveContent[i],
          context: 'internal',
          expectedCompliant: false,
        });
      }
      break;

    case 'mixed':
    default: {
      // Mix of different types
      const allContent = [
        { content: safeContent[0], expected: true, type: 'Safe' },
        { content: riskyContent[0], expected: false, type: 'Risky' },
        { content: safeContent[1], expected: true, type: 'Safe' },
        { content: offensiveContent[0], expected: false, type: 'Offensive' },
        { content: safeContent[2], expected: true, type: 'Safe' },
      ];

      for (let i = 0; i < Math.min(count, allContent.length); i++) {
        testCases.push({
          name: `${allContent[i].type} Content Test ${i + 1}`,
          content: allContent[i].content,
          context: 'marketing',
          expectedCompliant: allContent[i].expected,
        });
      }
      break;
    }
  }

  return testCases;
}
