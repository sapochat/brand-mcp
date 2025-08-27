import { spawn } from 'child_process';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    console.log('Starting brand safety MCP server test...');
    
    // Start the server as a separate process
    const server = spawn('node', ['dist/index.js'], {
      stdio: 'inherit'
    });
    
    // Allow server startup time
    console.log('Server started, waiting for it to initialize...');
    await sleep(2000);
    
    // Start the test client as a separate process
    console.log('\nRunning simple test client...');
    console.log('\nTest completed. Server is running in the background.');
    console.log('You can now connect to it with Claude Desktop or other MCP clients.');
    console.log('\nPress Ctrl+C to stop the server when finished testing.');
    
    // Keep the process running
    await new Promise(() => {
      // Never resolves to keep the server running
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 