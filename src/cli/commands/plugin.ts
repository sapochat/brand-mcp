import { Command } from 'commander';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { PluginManager } from '../../plugins/PluginManager.js';

const PLUGINS_DIR = './plugins';

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

/**
 * Validate that a directory contains a valid plugin
 */
async function validatePluginDirectory(
  pluginPath: string
): Promise<{ valid: boolean; name?: string; error?: string }> {
  try {
    const manifestPath = path.join(pluginPath, 'manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent) as { name?: string; main?: string };

    if (!manifest.name) {
      return { valid: false, error: 'manifest.json missing "name" field' };
    }

    if (!manifest.main) {
      return { valid: false, error: 'manifest.json missing "main" field' };
    }

    const mainPath = path.join(pluginPath, manifest.main);
    await fs.access(mainPath);

    return { valid: true, name: manifest.name };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { valid: false, error: 'manifest.json not found' };
    }
    return { valid: false, error: error instanceof Error ? error.message : String(error) };
  }
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
    .description('Install a plugin from a directory')
    .argument('<source>', 'Path to plugin directory')
    .action(async (sourcePath: string) => {
      try {
        // Resolve absolute path
        const absoluteSource = path.resolve(sourcePath);

        // Validate source is a valid plugin
        const validation = await validatePluginDirectory(absoluteSource);
        if (!validation.valid) {
          console.error(chalk.red(`Invalid plugin: ${validation.error}`));
          process.exit(1);
        }

        // Ensure plugins directory exists
        await fs.mkdir(PLUGINS_DIR, { recursive: true });

        // Get plugin name from manifest for target directory
        const pluginName = path.basename(absoluteSource);
        const targetPath = path.join(PLUGINS_DIR, pluginName);

        // Check if plugin already exists
        try {
          await fs.access(targetPath);
          console.error(chalk.red(`Plugin already exists at ${targetPath}`));
          console.log(chalk.dim('Use "plugin remove" first, then reinstall'));
          process.exit(1);
        } catch {
          // Target doesn't exist, which is what we want
        }

        // Copy plugin directory
        await copyDirectory(absoluteSource, targetPath);

        console.log(chalk.green(`✅ Plugin "${validation.name}" installed successfully`));
        console.log(chalk.dim(`   Location: ${targetPath}`));

        // Verify by loading
        const manager = new PluginManager(PLUGINS_DIR);
        await manager.initialize();
        console.log(chalk.dim('   Plugin loaded and verified'));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Recursively copy a directory
 */
async function copyDirectory(source: string, target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

function removePlugin(): Command {
  const cmd = new Command('remove');

  cmd
    .description('Remove an installed plugin')
    .argument('<pluginId>', 'Plugin ID or directory name to remove')
    .option('-f, --force', 'Force removal without confirmation')
    .action(async (pluginId: string, options: { force?: boolean }) => {
      try {
        const pluginPath = path.join(PLUGINS_DIR, pluginId);

        // Check if plugin exists
        try {
          await fs.access(pluginPath);
        } catch {
          console.error(chalk.red(`Plugin not found: ${pluginId}`));
          console.log(chalk.dim('Use "plugin list" to see installed plugins'));
          process.exit(1);
        }

        // Validate it's actually a plugin directory
        const validation = await validatePluginDirectory(pluginPath);
        if (!validation.valid && !options.force) {
          console.error(chalk.yellow(`Warning: ${pluginPath} may not be a valid plugin`));
          console.log(chalk.dim('Use --force to remove anyway'));
          process.exit(1);
        }

        // Remove the plugin directory
        await fs.rm(pluginPath, { recursive: true, force: true });

        console.log(chalk.green(`✅ Plugin "${pluginId}" removed successfully`));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
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
