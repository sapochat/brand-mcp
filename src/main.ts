#!/usr/bin/env node

import { ContainerBuilder } from './infrastructure/di/ContainerBuilder.js';
import { ServiceKeys } from './infrastructure/di/Container.js';
import { McpServerAdapter } from './adapters/primary/mcp/McpServerAdapter.js';

/**
 * Main entry point for the Brand MCP Server using hexagonal architecture
 */
async function main(): Promise<void> {
  try {
    // Build dependency injection container
    const container = await ContainerBuilder.build();

    // Resolve the MCP server adapter
    const mcpServer = container.resolve<McpServerAdapter>(ServiceKeys.MCP_SERVER_ADAPTER);

    // Start the server
    await mcpServer.start();
  } catch (error) {
    console.error('Failed to start Brand MCP Server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\nReceived SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\nReceived SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
