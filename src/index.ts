import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

const apiKey = process.env.ITZULI_API_KEY;
if (!apiKey) {
  console.error('ITZULI_API_KEY environment variable is required');
  process.exit(1);
}

const server = createServer(apiKey);
const transport = new StdioServerTransport();
await server.connect(transport);
