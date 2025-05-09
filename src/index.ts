import { startServer } from './server/brandMcpServer.js';

// Start the MCP server
startServer().catch((error: unknown) => {
  process.exit(1);
}); 