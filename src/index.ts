import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const ITZULI_BASE_URL = 'https://api.itzuli.vicomtech.org/';
const SUPPORTED_LANGUAGES = ['eu', 'es', 'en', 'fr'] as const;

const apiKey = process.env.ITZULI_API_KEY;
if (!apiKey) {
  console.error('ITZULI_API_KEY environment variable is required');
  process.exit(1);
}

const authHeaders = {
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
};

const server = new McpServer({
  name: 'itzuli-mcp',
  version: '1.0.0',
});

server.registerTool(
  'translate',
  {
    description: 'Translate text between Basque (eu), Spanish (es), English (en), and French (fr)',
    inputSchema: {
      text: z.string().describe('The text to translate'),
      sourceLanguage: z.enum(SUPPORTED_LANGUAGES).describe('Source language code'),
      targetLanguage: z.enum(SUPPORTED_LANGUAGES).describe('Target language code'),
    },
  },
  async ({ text, sourceLanguage, targetLanguage }) => {
    const response = await fetch(`${ITZULI_BASE_URL}translation/get`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        sourcelanguage: sourceLanguage,
        targetlanguage: targetLanguage,
        text,
      }),
    });

    if (!response.ok) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Translation failed: HTTP ${response.status}` }],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  },
);

server.registerTool(
  'get_quota',
  {
    description: 'Check the current API usage quota for the Itzuli translation service',
  },
  async () => {
    const response = await fetch(`${ITZULI_BASE_URL}quota/get`, {
      headers: authHeaders,
    });

    if (!response.ok) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Quota check failed: HTTP ${response.status}` }],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  },
);

server.registerTool(
  'send_feedback',
  {
    description: 'Submit feedback or a correction for a previous translation',
    inputSchema: {
      translationId: z.string().describe('The ID of the translation to provide feedback on'),
      correction: z.string().describe('The corrected translation text'),
      evaluation: z.number().describe('Numeric evaluation score for the translation'),
    },
  },
  async ({ translationId, correction, evaluation }) => {
    const response = await fetch(`${ITZULI_BASE_URL}translation/feedback`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        id: translationId,
        correction,
        evaluation,
      }),
    });

    if (!response.ok) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Feedback submission failed: HTTP ${response.status}` }],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
