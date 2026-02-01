import { Command } from 'commander';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import path from 'path';

interface NodeError extends Error {
  code?: string;
}

type ConfigValue = string | number | boolean | null | ConfigObject | ConfigValue[];
interface ConfigObject {
  [key: string]: ConfigValue;
}

/**
 * Configuration management command
 */
export function configCommand(): Command {
  const command = new Command('config');

  command
    .description('Manage Brand MCP configuration')
    .addCommand(showConfig())
    .addCommand(setConfig())
    .addCommand(resetConfig());

  return command;
}

function showConfig(): Command {
  const cmd = new Command('show');

  cmd
    .description('Show current configuration')
    .option('-p, --path <path>', 'Configuration file path', './brand-config.json')
    .action(async (options) => {
      try {
        const configPath = path.resolve(options.path);
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent) as ConfigObject;

        console.log(chalk.bold('\n=== Brand MCP Configuration ===\n'));
        console.log(JSON.stringify(config, null, 2));
        console.log();
      } catch (error) {
        const nodeError = error as NodeError;
        if (nodeError.code === 'ENOENT') {
          console.log(chalk.yellow('No configuration file found. Using defaults.'));
        } else {
          console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      }
    });

  return cmd;
}

function setConfig(): Command {
  const cmd = new Command('set');

  cmd
    .description('Set configuration value')
    .argument('<key>', 'Configuration key (use dot notation for nested)')
    .argument('<value>', 'Configuration value')
    .option('-p, --path <path>', 'Configuration file path', './brand-config.json')
    .action(async (key, value, options) => {
      try {
        const configPath = path.resolve(options.path);
        let config: ConfigObject = {};

        // Try to load existing config
        try {
          const configContent = await fs.readFile(configPath, 'utf-8');
          config = JSON.parse(configContent) as ConfigObject;
        } catch {
          // Config doesn't exist, start fresh
        }

        // Set nested value using dot notation
        const keys = key.split('.');
        let current: ConfigObject = config;

        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]] as ConfigObject;
        }

        // Parse value
        let parsedValue: ConfigValue = value;
        if (value === 'true') parsedValue = true;
        else if (value === 'false') parsedValue = false;
        else if (!isNaN(Number(value))) parsedValue = Number(value);
        else if (value.startsWith('[') || value.startsWith('{')) {
          try {
            parsedValue = JSON.parse(value) as ConfigValue;
          } catch {
            // Keep as string if not valid JSON
          }
        }

        current[keys[keys.length - 1]] = parsedValue;

        // Save config
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));

        console.log(chalk.green(`✅ Set ${key} = ${JSON.stringify(parsedValue)}`));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return cmd;
}

function resetConfig(): Command {
  const cmd = new Command('reset');

  cmd
    .description('Reset configuration to defaults')
    .option('-p, --path <path>', 'Configuration file path', './brand-config.json')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options) => {
      try {
        const configPath = path.resolve(options.path);

        if (!options.force) {
          console.log(chalk.yellow('This will reset all configuration to defaults.'));
          console.log(chalk.yellow('Use --force to skip this confirmation.'));
          return;
        }

        // Default configuration
        const defaultConfig = {
          brandSafety: {
            sensitiveKeywords: [],
            allowedTopics: [],
            blockedTopics: [],
            riskTolerances: {
              SEXUAL_CONTENT: 'LOW',
              VIOLENCE: 'LOW',
              HATE_SPEECH: 'NONE',
              SELF_HARM: 'NONE',
              PROFANITY: 'MEDIUM',
              LEGAL_RISK: 'LOW',
              FINANCIAL_RISK: 'LOW',
              MEDICAL_CLAIMS: 'LOW',
              POLITICAL_CONTENT: 'MEDIUM',
              MISINFORMATION: 'NONE',
              COMPETITIVE_MENTION: 'MEDIUM',
            },
          },
          plugins: {
            enabled: true,
            directory: './plugins',
          },
        };

        await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));

        console.log(chalk.green('✅ Configuration reset to defaults'));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return cmd;
}
