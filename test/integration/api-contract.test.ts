import { jest } from '@jest/globals';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { cli } from '../../src/cli.js';
import { config } from '../../src/config/index.js';
import { getClient } from '../../src/utils/client.js';
import { SessionsAPI } from '../../src/api/sessions.js';
import { ActivitiesAPI } from '../../src/api/activities.js';
import { ApiKeyProvider } from '../../src/utils/token-provider.js';

const baseURL = 'https://jules.googleapis.com/v1alpha';
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  jest.restoreAllMocks();
});
afterAll(() => server.close());

// Mock cross-keychain to use memory
const keychain = new Map<string, string>();
jest.unstable_mockModule('cross-keychain', () => ({
  setPassword: jest.fn(async (s: string, a: string, p: string) => { keychain.set(`${s}:${a}`, p); }),
  getPassword: jest.fn(async (s: string, a: string) => keychain.get(`${s}:${a}`)),
  deletePassword: jest.fn(async (s: string, a: string) => { keychain.delete(`${s}:${a}`); }),
}));

describe('API Contract Validation', () => {
  beforeEach(() => {
    keychain.clear();
    jest.spyOn(config, 'getApiKey').mockImplementation(async () => keychain.get('jules-cli:api-key'));
  });

  describe('Sessions API - Invalid Response Structure', () => {
    it('should throw when response is missing sessions array', async () => {
      const apiKey = 'test-api-key';
      keychain.set('jules-cli:api-key', apiKey);

      server.use(
        http.get(`${baseURL}/sessions`, () => HttpResponse.json({ wrong: 'shape' }))
      );

      const client = new JulesAPIClient(new ApiKeyProvider(apiKey), baseURL);
      const api = new SessionsAPI(client);

      await expect(api.list()).rejects.toThrow('Expected sessions array in API response');
    });

    it('should throw when response is not an object', async () => {
      const apiKey = 'test-api-key';
      keychain.set('julius-cli:api-key', apiKey);

      server.use(
        http.get(`${baseURL}/sessions`, () => HttpResponse.json(null))
      );

      const client = new JulesAPIClient(new ApiKeyProvider(apiKey), baseURL);
      const api = new SessionsAPI(client);

      await expect(api.list()).rejects.toThrow();
    });

    it('should throw when sessions is not an array', async () => {
      const apiKey = 'test-api-key';
      keychain.set('julius-cli:api-key', apiKey);

      server.use(
        http.get(`${baseURL}/sessions`, () => HttpResponse.json({ sessions: 'not-an-array' }))
      );

      const client = new JulesAPIClient(new ApiKeyProvider(apiKey), baseURL);
      const api = new SessionsAPI(client);

      await expect(api.list()).rejects.toThrow('Expected sessions array in API response');
    });
  });

  describe('Activities API - Invalid Response Structure', () => {
    it('should throw when response is missing activities array', async () => {
      const apiKey = 'test-api-key';
      const sessionId = 'session-123';
      keychain.set('julius-cli:api-key', apiKey);

      server.use(
        http.get(`${baseURL}/sessions/${sessionId}/activities`, () => HttpResponse.json({ wrong: 'shape' }))
      );

      const client = new JulesAPIClient(new ApiKeyProvider(apiKey), baseURL);
      const api = new ActivitiesAPI(client);

      await expect(api.list(sessionId)).rejects.toThrow('Expected activities array in API response');
    });

    it('should throw when response is null', async () => {
      const apiKey = 'test-api-key';
      const sessionId = 'session-123';
      keychain.set('julius-cli:api-key', apiKey);

      server.use(
        http.get(`${baseURL}/sessions/${sessionId}/activities`, () => HttpResponse.json(null))
      );

      const client = new JulesAPIClient(new ApiKeyProvider(apiKey), baseURL);
      const api = new ActivitiesAPI(client);

      await expect(api.list(sessionId)).rejects.toThrow();
    });

    it('should throw when activities is not an array', async () => {
      const apiKey = 'test-api-key';
      const sessionId = 'session-123';
      keychain.set('julius-cli:api-key', apiKey);

      server.use(
        http.get(`${baseURL}/sessions/${sessionId}/activities`, () => HttpResponse.json({ activities: 'not-an-array' }))
      );

      const client = new JulesAPIClient(new ApiKeyProvider(apiKey), baseURL);
      const api = new ActivitiesAPI(client);

      await expect(api.list(sessionId)).rejects.toThrow('Expected activities array in API response');
    });
  });

  describe('Activities Pagination', () => {
    it('should correctly follow pagination with nextPageToken', async () => {
      const apiKey = 'test-api-key';
      const sessionId = 'session-123';
      keychain.set('julius-cli:api-key', apiKey);

      let callCount = 0;
      server.use(
        http.get(`${baseURL}/sessions/${sessionId}/activities`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get('pageToken');

          if (!pageToken) {
            // First page
            return HttpResponse.json({
              activities: [
                {
                  id: 'activity-1',
                  type: 'MESSAGE',
                  createTime: new Date().toISOString(),
                  content: 'First page',
                  author: { role: 'USER', name: 'test' }
                },
              ],
              nextPageToken: 'token-2',
            });
          } else if (pageToken === 'token-2') {
            // Second page
            return HttpResponse.json({
              activities: [
                {
                  id: 'activity-2',
                  type: 'MESSAGE',
                  createTime: new Date().toISOString(),
                  content: 'Second page',
                  author: { role: 'USER', name: 'test' }
                },
              ],
              nextPageToken: undefined,
            });
          }

          return HttpResponse.json({ activities: [] });
        })
      );

      const client = new JulesAPIClient(new ApiKeyProvider(apiKey), baseURL);
      const api = new ActivitiesAPI(client);

      // Manually paginate
      let allItems: any[] = [];
      let currentToken: string | undefined;

      while (true) {
        const result = await api.list(sessionId, 100, currentToken);
        allItems = allItems.concat(result.items);
        if (!result.nextPageToken) break;
        currentToken = result.nextPageToken;
      }

      expect(callCount).toBe(2);
      expect(allItems).toHaveLength(2);
      expect(allItems[0].id).toBe('activity-1');
      expect(allItems[1].id).toBe('activity-2');
    });
  });

  describe('Wait Command - Retry Limits', () => {
    it('should fail after MAX_CONSECUTIVE_ERRORS network errors', async () => {
      const apiKey = 'test-api-key';
      const sessionId = 'session-123';
      keychain.set('julius-cli:api-key', apiKey);

      let errorCount = 0;
      server.use(
        http.get(`${baseURL}/sessions/${sessionId}`, () => {
          errorCount++;
          return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
        })
      );

      const client = new JulesAPIClient(new ApiKeyProvider(apiKey), baseURL);
      const { waitCommand } = await import('../../src/commands/wait.js');

      await expect(
        waitCommand(client, {
          sessionId,
          timeout: 120, // Long enough to hit error limit
          interval: 0.01,
          format: 'quiet',
          noSpinner: true,
        })
      ).rejects.toThrow('Too many consecutive API errors');

      expect(errorCount).toBeGreaterThanOrEqual(10);
    }, 20000);

    it('should not fail on transient errors if within MAX_CONSECUTIVE_ERRORS', async () => {
      const apiKey = 'test-api-key';
      const sessionId = 'session-123';
      keychain.set('julius-cli:api-key', apiKey);

      let errorCount = 0;
      let successCount = 0;
      server.use(
        http.get(`${baseURL}/sessions/${sessionId}`, () => {
          errorCount++;
          // Fail twice, then succeed
          if (errorCount <= 2) {
            return HttpResponse.json({ error: 'Temporary error' }, { status: 500 });
          }
          successCount++;
          return HttpResponse.json({
            id: sessionId,
            name: `sessions/${sessionId}`,
            state: 'COMPLETED',
            sourceContext: { source: 'sources/github/owner/repo' }
          });
        })
      );

      const client = new JulesAPIClient(new ApiKeyProvider(apiKey), baseURL);
      const { waitCommand } = await import('../../src/commands/wait.js');

      // Should succeed despite transient errors
      await expect(
        waitCommand(client, {
          sessionId,
          timeout: 10,
          interval: 0.01,
          format: 'quiet',
          noSpinner: true,
        })
      ).resolves.not.toThrow();

      expect(successCount).toBeGreaterThan(0);
    }, 10000);

    it('should fail immediately on 404 (not found)', async () => {
      const apiKey = 'test-api-key';
      const sessionId = 'nonexistent-session';
      keychain.set('julius-cli:api-key', apiKey);

      server.use(
        http.get(`${baseURL}/sessions/${sessionId}`, () => {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      const client = new JulesAPIClient(new ApiKeyProvider(apiKey), baseURL);
      const { waitCommand } = await import('../../src/commands/wait.js');

      await expect(
        waitCommand(client, {
          sessionId,
          timeout: 10,
          interval: 0.01,
          format: 'quiet',
          noSpinner: true,
        })
      ).rejects.toThrow();
    }, 10000);
  });
});

// Import needed for tests
import { JulesAPIClient } from '../../src/api/client.js';
