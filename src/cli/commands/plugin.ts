import { Command } from 'commander';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PluginManager } from '../../plugins/PluginManager.js';
import { validatePath } from '../../utils/security.js';

const PLUGINS_DIR = './plugins';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

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
 * Validate that a directory contains a valid plugin with required manifest.json
 *
 * Checks for:
 * - manifest.json exists and is valid JSON
 * - Required fields: name, main (with proper types)
 * - Plugin name format (alphanumeric, hyphens, underscores only)
 * - Main entry point doesn't escape plugin directory
 * - Main entry point file exists
 *
 * @param pluginPath - Absolute path to plugin directory
 * @returns Validation result with plugin name if valid, error message if invalid
 */
async function validatePluginDirectory(
  pluginPath: string
): Promise<{ valid: boolean; name?: string; error?: string }> {
  try {
    const manifestPath = path.join(pluginPath, 'manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');

    // Parse and validate as object first
    let parsed: unknown;
    try {
      parsed = JSON.parse(manifestContent);
    } catch {
      return { valid: false, error: 'manifest.json is not valid JSON' };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { valid: false, error: 'manifest.json is not a valid object' };
    }

    const manifest = parsed as Record<string, unknown>;

    // Validate required fields with type checking
    if (!manifest.name || typeof manifest.name !== 'string' || manifest.name.trim().length === 0) {
      return { valid: false, error: 'manifest.json missing or invalid "name" field' };
    }

    if (!manifest.main || typeof manifest.main !== 'string' || manifest.main.trim().length === 0) {
      return { valid: false, error: 'manifest.json missing or invalid "main" field' };
    }

    // Validate plugin name format (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(manifest.name)) {
      return {
        valid: false,
        error: 'plugin name contains invalid characters (use only a-z, A-Z, 0-9, -, _)',
      };
    }

    // Validate main file path doesn't escape plugin directory
    if (manifest.main.includes('..') || path.isAbsolute(manifest.main)) {
      return { valid: false, error: 'manifest.json "main" field contains invalid path' };
    }

    const mainPath = path.join(pluginPath, manifest.main);
    try {
      await fs.access(mainPath);
    } catch {
      return { valid: false, error: `main entry point not found: ${manifest.main}` };
    }

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
      let pluginCopied = false;
      let targetPath: string | null = null;

      try {
        // Resolve absolute path
        const absoluteSource = path.resolve(sourcePath);

        // Security: Validate source path is within project or current working directory
        const cwd = process.cwd();
        if (!validatePath(absoluteSource, cwd) && !validatePath(absoluteSource, PROJECT_ROOT)) {
          console.error(chalk.red('Error: Plugin source path is outside allowed directories'));
          console.log(chalk.dim('Plugins must be located within the project or current directory'));
          process.exit(1);
        }

        // Validate source is a valid plugin
        const validation = await validatePluginDirectory(absoluteSource);
        if (!validation.valid) {
          console.error(chalk.red(`Invalid plugin: ${validation.error}`));
          process.exit(1);
        }

        // Use validated plugin name from manifest (already validated for filesystem safety)
        const pluginName = validation.name ?? path.basename(absoluteSource);

        // Ensure plugins directory exists
        const absolutePluginsDir = path.resolve(PLUGINS_DIR);
        await fs.mkdir(absolutePluginsDir, { recursive: true });

        // Use validated name directly (validation ensures [a-zA-Z0-9_-] only)
        targetPath = path.join(absolutePluginsDir, pluginName);

        // Security: Verify target path is within plugins directory
        const absoluteTarget = path.resolve(targetPath);
        if (!absoluteTarget.startsWith(absolutePluginsDir + path.sep)) {
          console.error(chalk.red('Error: Invalid plugin name would escape plugins directory'));
          process.exit(1);
        }

        // Check if plugin already exists
        try {
          await fs.access(targetPath);
          console.error(chalk.red(`Plugin already exists at ${targetPath}`));
          console.log(chalk.dim('Use "plugin remove" first, then reinstall'));
          process.exit(1);
        } catch {
          // Target doesn't exist, which is what we want
        }

        // Copy plugin directory (with permission preservation)
        await copyDirectory(absoluteSource, targetPath);
        pluginCopied = true;

        console.log(chalk.dim(`   Copied to: ${targetPath}`));

        // Verify by loading
        const manager = new PluginManager(PLUGINS_DIR);
        await manager.initialize();

        // Verify the specific plugin was loaded
        const loadedPlugin = manager.getPlugin(pluginName);
        if (!loadedPlugin) {
          const stats = manager.getStats();
          throw new Error(
            `Plugin verification failed: "${pluginName}" was not loaded by PluginManager.\n` +
              `   Loaded plugins: ${stats.pluginList.map((p) => p.name).join(', ') || 'none'}\n` +
              `   This might indicate a manifest error or initialization failure.`
          );
        }

        console.log(chalk.green(`✅ Plugin "${pluginName}" installed and verified successfully`));
      } catch (error) {
        // Cleanup on failure if we already copied files
        if (pluginCopied && targetPath) {
          try {
            await fs.rm(targetPath, { recursive: true, force: true });
            console.error(chalk.yellow('   Rolled back installation due to error'));
          } catch {
            console.error(chalk.red('   Warning: Failed to cleanup after error'));
            console.error(chalk.dim(`   Manual cleanup may be needed: ${targetPath}`));
          }
        }

        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Recursively copy a directory while preserving file permissions.
 * Skips symlinks for security (prevents symlink attacks).
 *
 * @param source - Source directory path
 * @param target - Target directory path (will be created if doesn't exist)
 * @throws If source doesn't exist or copy operation fails
 */
async function copyDirectory(source: string, target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    // Security: Skip symlinks to prevent symlink attacks
    if (entry.isSymbolicLink()) {
      console.warn(chalk.yellow(`   Skipping symlink: ${entry.name}`));
      continue;
    }

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      // Use lstat to avoid following symlinks (defense in depth)
      const stats = await fs.lstat(sourcePath);

      // Copy file content
      await fs.copyFile(sourcePath, targetPath);

      // Preserve file permissions but remove execute bits for safety
      const safeMode = stats.mode & 0o666; // Keep read/write, remove execute
      await fs.chmod(targetPath, safeMode);
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
        // Validate plugin ID format to prevent path traversal
        if (!/^[a-zA-Z0-9_-]+$/.test(pluginId)) {
          console.error(chalk.red('Error: Invalid plugin ID format'));
          console.log(
            chalk.dim('Plugin ID must contain only letters, numbers, hyphens, underscores')
          );
          process.exit(1);
        }

        const absolutePluginsDir = path.resolve(PLUGINS_DIR);
        const pluginPath = path.join(absolutePluginsDir, pluginId);

        // Security: Verify path is within plugins directory
        const absolutePluginPath = path.resolve(pluginPath);
        if (!absolutePluginPath.startsWith(absolutePluginsDir + path.sep)) {
          console.error(chalk.red('Error: Invalid plugin path'));
          process.exit(1);
        }

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
