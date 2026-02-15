import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer } from './server.js';

function mockFetch(response: object, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
  });
}

describe('itzuli-mcp', () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const server = createServer('test-api-key');
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client({ name: 'test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    cleanup = async () => {
      await client.close();
      await server.close();
    };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanup();
  });

  describe('translate', () => {
    it('returns translated text on success', async () => {
      const mockResponse = {
        translatedText: 'Hola!',
        id: 'translation-123',
      };
      vi.stubGlobal('fetch', mockFetch(mockResponse));

      const result = await client.callTool({
        name: 'translate',
        arguments: {
          text: 'Kaixo!',
          sourceLanguage: 'eu',
          targetLanguage: 'es',
        },
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.itzuli.vicomtech.org/translation/get',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourcelanguage: 'eu',
            targetlanguage: 'es',
            text: 'Kaixo!',
          }),
        },
      );

      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0]?.type).toBe('text');
      const parsed = JSON.parse(content[0]?.text || '');
      expect(parsed.translatedText).toBe('Hola!');
      expect(parsed.id).toBe('translation-123');
    });

    it('returns error on HTTP failure', async () => {
      vi.stubGlobal('fetch', mockFetch({}, 401));

      const result = await client.callTool({
        name: 'translate',
        arguments: {
          text: 'Kaixo!',
          sourceLanguage: 'eu',
          targetLanguage: 'es',
        },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0]?.text).toBe('Translation failed: HTTP 401');
    });
  });

  describe('get_quota', () => {
    it('returns quota info on success', async () => {
      const mockResponse = {
        remaining: 5000,
        total: 10000,
        used: 5000,
      };
      vi.stubGlobal('fetch', mockFetch(mockResponse));

      const result = await client.callTool({
        name: 'get_quota',
        arguments: {},
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.itzuli.vicomtech.org/quota/get',
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        },
      );

      const content = result.content as Array<{ type: string; text: string }>;
      const parsed = JSON.parse(content[0]?.text || '');
      expect(parsed.remaining).toBe(5000);
      expect(parsed.total).toBe(10000);
    });

    it('returns error on HTTP failure', async () => {
      vi.stubGlobal('fetch', mockFetch({}, 500));

      const result = await client.callTool({
        name: 'get_quota',
        arguments: {},
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0]?.text).toBe('Quota check failed: HTTP 500');
    });
  });

  describe('send_feedback', () => {
    it('returns confirmation on success', async () => {
      const mockResponse = { success: true };
      vi.stubGlobal('fetch', mockFetch(mockResponse));

      const result = await client.callTool({
        name: 'send_feedback',
        arguments: {
          translationId: 'translation-123',
          correction: 'Hola!',
          evaluation: 4,
        },
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.itzuli.vicomtech.org/translation/feedback',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: 'translation-123',
            correction: 'Hola!',
            evaluation: 4,
          }),
        },
      );

      const content = result.content as Array<{ type: string; text: string }>;
      const parsed = JSON.parse(content[0]?.text || '');
      expect(parsed.success).toBe(true);
    });

    it('returns error on HTTP failure', async () => {
      vi.stubGlobal('fetch', mockFetch({}, 403));

      const result = await client.callTool({
        name: 'send_feedback',
        arguments: {
          translationId: 'translation-123',
          correction: 'Hola!',
          evaluation: 4,
        },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0]?.text).toBe('Feedback submission failed: HTTP 403');
    });
  });
});
