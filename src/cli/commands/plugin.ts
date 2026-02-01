import { Command } from 'commander';
import chalk from 'chalk';
import { PluginManager } from '../../plugins/PluginManager.js';

/**
 * Plugin management command
 */
export function pluginCommand(): Command {
  const command = new Command('plugin');

  command
    .description('Manage Brand MCP plugins')
    .addCommand(listPlugins())
    .addCommand(installPlugin())
    .addCommand(removePlugin())
    .addCommand(reloadPlugin());

  return command;
}

function listPlugins(): Command {
  const cmd = new Command('list');

  cmd.description('List installed plugins').action(async () => {
    try {
      const manager = new PluginManager('./plugins');
      await manager.initialize();

      const stats = manager.getStats();

      console.log(chalk.bold('\n=== Installed Plugins ===\n'));

      if (stats.pluginList.length === 0) {
        console.log(chalk.dim('No plugins installed'));
      } else {
        stats.pluginList.forEach((plugin) => {
          console.log(`${chalk.bold(plugin.name)} (${plugin.id})`);
          console.log(`  Version: ${plugin.version}`);
          console.log(`  Type: ${plugin.type}`);
          console.log();
        });
      }

      console.log(chalk.bold('Summary:'));
      console.log(`  Total: ${stats.totalPlugins}`);
      console.log(`  Evaluation: ${stats.evaluationPlugins}`);
      console.log(`  Enricher: ${stats.enricherPlugins}`);
      console.log(`  Formatter: ${stats.formatterPlugins}\n`);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

  return cmd;
}

function installPlugin(): Command {
  const cmd = new Command('install');

  cmd
    .description('Install a plugin')
    .argument('<path>', 'Path to plugin directory or package')
    .action(async (path) => {
      console.log(chalk.yellow('Plugin installation not yet implemented'));
      console.log(`Would install plugin from: ${path}`);
    });

  return cmd;
}

function removePlugin(): Command {
  const cmd = new Command('remove');

  cmd
    .description('Remove a plugin')
    .argument('<pluginId>', 'Plugin ID to remove')
    .action(async (pluginId) => {
      console.log(chalk.yellow('Plugin removal not yet implemented'));
      console.log(`Would remove plugin: ${pluginId}`);
    });

  return cmd;
}

function reloadPlugin(): Command {
  const cmd = new Command('reload');

  cmd
    .description('Reload a plugin')
    .argument('<pluginId>', 'Plugin ID to reload')
    .action(async (pluginId) => {
      try {
        const manager = new PluginManager('./plugins');
        await manager.initialize();
        await manager.reloadPlugin(pluginId);
        console.log(chalk.green(`✅ Plugin ${pluginId} reloaded successfully`));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return cmd;
}
