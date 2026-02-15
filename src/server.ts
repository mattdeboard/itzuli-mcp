import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';

function debug(message: string, ...args: unknown[]) {
  if (LOG_LEVEL === 'debug') {
    console.error(`[DEBUG] ${message}`, ...args);
  }
}

const ITZULI_BASE_URL = 'https://api.itzuli.vicomtech.org/';
const SUPPORTED_LANGUAGES = ['eu', 'es', 'en', 'fr'] as const;

export function createServer(apiKey: string) {
  const authHeaders = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const server = new McpServer({
    name: 'itzuli-mcp',
    version: '1.0.0',
  });

  server.registerTool(
    'translate',
    {
      description:
        'Translate text to or from Basque (eu). Basque must be either the source or target language. Supported pairs: eu<->es, eu<->en, eu<->fr.',
      inputSchema: {
        text: z.string().describe('The text to translate'),
        sourceLanguage: z
          .enum(SUPPORTED_LANGUAGES)
          .describe('Source language code'),
        targetLanguage: z
          .enum(SUPPORTED_LANGUAGES)
          .describe('Target language code'),
      },
      annotations: {
        title: 'Translate Text',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ text, sourceLanguage, targetLanguage }) => {
      if (sourceLanguage !== 'eu' && targetLanguage !== 'eu') {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Basque (eu) must be either the source or target language. Supported pairs: eu<->es, eu<->en, eu<->fr.',
            },
          ],
        };
      }

      const body = {
        sourcelanguage: sourceLanguage,
        targetlanguage: targetLanguage,
        text,
      };
      debug('translate request: %O', body);

      const response = await fetch(`${ITZULI_BASE_URL}translation/get`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        debug('translate error: HTTP %d', response.status);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Translation failed: HTTP ${response.status}`,
            },
          ],
        };
      }

      const data = await response.json();
      debug('translate response: %O', data);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get_quota',
    {
      description:
        'Check the current API usage quota for the Itzuli translation service',
      annotations: {
        title: 'Get API Quota',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      debug('get_quota request');

      const response = await fetch(`${ITZULI_BASE_URL}quota/get`, {
        headers: authHeaders,
      });

      if (!response.ok) {
        debug('get_quota error: HTTP %d', response.status);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Quota check failed: HTTP ${response.status}`,
            },
          ],
        };
      }

      const data = await response.json();
      debug('get_quota response: %O', data);
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
        translationId: z
          .string()
          .describe('The ID of the translation to provide feedback on'),
        correction: z.string().describe('The corrected translation text'),
        evaluation: z
          .number()
          .describe('Numeric evaluation score for the translation'),
      },
      annotations: {
        title: 'Send Translation Feedback',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ translationId, correction, evaluation }) => {
      const body = {
        id: translationId,
        correction,
        evaluation,
      };
      debug('send_feedback request:', body);

      const response = await fetch(`${ITZULI_BASE_URL}translation/feedback`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        debug('send_feedback error: HTTP', response.status);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Feedback submission failed: HTTP ${response.status}`,
            },
          ],
        };
      }

      const data = await response.json();
      debug('send_feedback response:', data);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  const LANGUAGE_NAMES: Record<(typeof SUPPORTED_LANGUAGES)[number], string> = {
    eu: 'Basque',
    es: 'Spanish',
    en: 'English',
    fr: 'French',
  };

  for (const other of SUPPORTED_LANGUAGES.filter((lang) => lang !== 'eu')) {
    // Register `<fromLang>@<toLang>` prompts. These prompts work like:
    // eu@es <text> -> translate from Euskara to Spanish
    // fr@eu <text> -> translate from French to Euskara
    // Reminder: `eu` must either be in the `fromLang` or `toLang` position.
    for (const [from, to] of [
      [`eu`, other],
      [other, `eu`],
    ] as const) {
      server.registerPrompt(
        `${from}@${to}`,
        {
          title: `${LANGUAGE_NAMES[from]} to ${LANGUAGE_NAMES[to]}`,
          description: `Translate text from ${LANGUAGE_NAMES[from]} to ${LANGUAGE_NAMES[to]}`,
          argsSchema: {
            text: z.string().describe('The text to translate'),
          },
        },
        ({ text }) => ({
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Translate the following ${LANGUAGE_NAMES[from]} text to ${LANGUAGE_NAMES[to]} using the translate tool, then return only the translated text.\n\n${text}`,
              },
            },
          ],
        }),
      );
    }
  }
  debug('itzuli-mcp server running on stdio');
  return server;
}
