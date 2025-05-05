import { startServer } from './server/brandMcpServer.js';

// Start the MCP server
startServer().catch((error: unknown) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 