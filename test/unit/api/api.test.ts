import { jest } from '@jest/globals';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { JulesAPIClient } from '../../../src/api/client.js';
import { SessionsAPI } from '../../../src/api/sessions.js';
import { ActivitiesAPI } from '../../../src/api/activities.js';
import { SourcesAPI } from '../../../src/api/sources.js';
import { ApiKeyProvider } from '../../../src/utils/token-provider.js';

const baseURL = 'https://jules.googleapis.com/v1alpha';
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  jest.restoreAllMocks();
});
afterAll(() => server.close());

describe('API classes', () => {
  const apiKey = 'test-api-key';
  const provider = new ApiKeyProvider(apiKey);
  const client = new JulesAPIClient(provider, baseURL);

  describe('SessionsAPI', () => {
    const sessionsAPI = new SessionsAPI(client);

    it('should create a session', async () => {
      const mockSession = { id: '123', state: 'PENDING' };
      const createParams = {
        prompt: 'test prompt',
        sourceContext: { source: 'sources/github/owner/repo' }
      };

      server.use(
        http.post(`${baseURL}/sessions`, async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual(createParams);
          return HttpResponse.json(mockSession);
        })
      );

      const result = await sessionsAPI.create(createParams);
      expect(result).toEqual(mockSession);
    });

    it('should list sessions', async () => {
      const mockResponse = {
        sessions: [{ id: '123' }, { id: '456' }],
        nextPageToken: 'token',
        totalSize: 2
      };

      server.use(
        http.get(`${baseURL}/sessions`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('pageSize')).toBe('10');
          expect(url.searchParams.get('pageToken')).toBe('prev-token');
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await sessionsAPI.list(10, 'prev-token');
      expect(result).toEqual({
        items: mockResponse.sessions,
        nextPageToken: mockResponse.nextPageToken,
        totalSize: mockResponse.totalSize
      });
    });

    it('should get a session', async () => {
      const mockSession = { id: '123', state: 'PENDING' };

      server.use(
        http.get(`${baseURL}/sessions/123`, () => {
          return HttpResponse.json(mockSession);
        })
      );

      const result = await sessionsAPI.get('123');
      expect(result).toEqual(mockSession);
    });

    it('should send a message', async () => {
      server.use(
        http.post(`${baseURL}/sessions/123:sendMessage`, async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual({ prompt: 'test message' });
          return new HttpResponse(null, { status: 200 });
        })
      );

      await sessionsAPI.sendMessage('123', 'test message');
    });

    it('should approve a plan', async () => {
      server.use(
        http.post(`${baseURL}/sessions/123:approvePlan`, () => {
          return new HttpResponse(null, { status: 200 });
        })
      );

      await sessionsAPI.approvePlan('123');
    });

    it('should cancel a session', async () => {
      server.use(
        http.delete(`${baseURL}/sessions/123`, () => {
          return new HttpResponse(null, { status: 200 });
        })
      );

      await sessionsAPI.cancel('123');
    });
  });

  describe('ActivitiesAPI', () => {
    const activitiesAPI = new ActivitiesAPI(client);

    it('should list activities', async () => {
      const mockResponse = {
        activities: [{ id: 'a1' }, { id: 'a2' }],
        nextPageToken: 'token',
        totalSize: 2
      };

      server.use(
        http.get(`${baseURL}/sessions/123/activities`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await activitiesAPI.list('123');
      expect(result).toEqual({
        items: mockResponse.activities,
        nextPageToken: mockResponse.nextPageToken,
        totalSize: mockResponse.totalSize
      });
    });

    it('should get an activity', async () => {
      const mockActivity = { id: 'a1', content: 'content' };

      server.use(
        http.get(`${baseURL}/sessions/123/activities/a1`, () => {
          return HttpResponse.json(mockActivity);
        })
      );

      const result = await activitiesAPI.get('123', 'a1');
      expect(result).toEqual(mockActivity);
    });
  });

  describe('SourcesAPI', () => {
    const sourcesAPI = new SourcesAPI(client);

    it('should list sources', async () => {
      const mockResponse = {
        sources: [{ id: 's1' }, { id: 's2' }],
        nextPageToken: 'token',
        totalSize: 2
      };

      server.use(
        http.get(`${baseURL}/sources`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await sourcesAPI.list();
      expect(result).toEqual({
        items: mockResponse.sources,
        nextPageToken: mockResponse.nextPageToken,
        totalSize: mockResponse.totalSize
      });
    });

    it('should get a source', async () => {
      const mockSource = { id: 's1', name: 'sources/github/owner/repo' };

      server.use(
        http.get(`${baseURL}/sources/s1`, () => {
          return HttpResponse.json(mockSource);
        })
      );

      const result = await sourcesAPI.get('s1');
      expect(result).toEqual(mockSource);
    });
  });
});
