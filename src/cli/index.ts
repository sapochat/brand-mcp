#!/usr/bin/env node

import { Command } from 'commander';
import { validateCommand } from './commands/validate.js';
import { testCommand } from './commands/test.js';
import { pluginCommand } from './commands/plugin.js';
import { configCommand } from './commands/config.js';
import { batchCommand } from './commands/batch.js';
import packageData from '../../package.json' with { type: 'json' };
const { version } = packageData;

/**
 * Brand MCP CLI Tool
 */
const program = new Command();

program
  .name('brand-mcp')
  .description('CLI tool for Brand Safety MCP Server')
  .version(version || '1.0.0');

// Add commands
program.addCommand(validateCommand());
program.addCommand(testCommand());
program.addCommand(pluginCommand());
program.addCommand(configCommand());
program.addCommand(batchCommand());

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
