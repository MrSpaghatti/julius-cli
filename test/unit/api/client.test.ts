import { jest } from '@jest/globals';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { JulesAPIClient } from '../../../src/api/client.js';
import { APIError, AuthError, NetworkError, NotFoundError } from '../../../src/utils/errors.js';
import { ApiKeyProvider } from '../../../src/utils/token-provider.js';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  jest.restoreAllMocks();
});
afterAll(() => server.close());

describe('JulesAPIClient', () => {
  const apiKey = 'test-api-key';
  const baseURL = 'https://jules.googleapis.com/v1alpha';
  const provider = new ApiKeyProvider(apiKey);
  const client = new JulesAPIClient(provider, baseURL);

  describe('GET requests', () => {
    it('should perform a successful GET request', async () => {
      const mockData = { id: '123', name: 'test-source' };
      
      server.use(
        http.get(`${baseURL}/sources/123`, () => {
          return HttpResponse.json(mockData);
        })
      );

      const result = await client.get<typeof mockData>('/sources/123');
      expect(result).toEqual(mockData);
    });

    it('should throw AuthError on 401 response', async () => {
      server.use(
        http.get(`${baseURL}/sources/123`, () => {
          return new HttpResponse(null, { status: 401 });
        })
      );

      await expect(client.get('/sources/123')).rejects.toThrow(AuthError);
    });

    it('should throw AuthError on 403 response', async () => {
      server.use(
        http.get(`${baseURL}/sources/123`, () => {
          return new HttpResponse(null, { status: 403 });
        })
      );

      await expect(client.get('/sources/123')).rejects.toThrow(AuthError);
    });

    it('should throw NotFoundError on 404 response', async () => {
      server.use(
        http.get(`${baseURL}/sources/invalid`, () => {
          return HttpResponse.json(
            { error: { message: 'Source not found' } },
            { status: 404 }
          );
        })
      );

      await expect(client.get('/sources/invalid')).rejects.toThrow(NotFoundError);
    });

    it('should throw APIError on 500 response', async () => {
      server.use(
        http.get(`${baseURL}/sources/123`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      // Note: JulesAPIClient has retry logic for 500s, but we'll check the final error
      // In tests, we might want to disable retries or just wait for them to finish
      await expect(client.get('/sources/123')).rejects.toThrow(APIError);
    });

    it('should throw NetworkError on network failure', async () => {
      server.use(
        http.get(`${baseURL}/sources/123`, () => {
          return HttpResponse.error();
        })
      );

      await expect(client.get('/sources/123')).rejects.toThrow(NetworkError);
    });
  });

  describe('POST requests', () => {
    it('should perform a successful POST request', async () => {
      const mockData = { id: 'session-123', state: 'ACTIVE' };
      const postBody = { repository: 'owner/repo' };

      server.use(
        http.post(`${baseURL}/sessions`, async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual(postBody);
          return HttpResponse.json(mockData);
        })
      );

      const result = await client.post<typeof mockData>('/sessions', postBody);
      expect(result).toEqual(mockData);
    });
  });

  describe('PUT requests', () => {
    it('should perform a successful PUT request', async () => {
      const mockData = { id: 'session-123', state: 'CANCELLED' };
      
      server.use(
        http.put(`${baseURL}/sessions/123`, () => {
          return HttpResponse.json(mockData);
        })
      );

      const result = await client.put<typeof mockData>('/sessions/123', {});
      expect(result).toEqual(mockData);
    });
  });

  describe('DELETE requests', () => {
    it('should perform a successful DELETE request', async () => {
      server.use(
        http.delete(`${baseURL}/sessions/123`, () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await client.delete('/sessions/123');
      expect(result).toBe(''); // Axios returns empty string for 204 by default if no data
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 429 and respect Retry-After header', async () => {
      let callCount = 0;
      
      server.use(
        http.get(`${baseURL}/retry-test`, () => {
          callCount++;
          if (callCount === 1) {
            return new HttpResponse(null, {
              status: 429,
              headers: { 'Retry-After': '1' }
            });
          }
          return HttpResponse.json({ success: true });
        })
      );

      // This might take a second due to Retry-After: 1
      const result = await client.get('/retry-test');
      expect(result).toEqual({ success: true });
      expect(callCount).toBe(2);
    }, 10000);

    it('should retry on 500 errors', async () => {
      let callCount = 0;
      
      server.use(
        http.get(`${baseURL}/retry-500`, () => {
          callCount++;
          if (callCount < 3) {
            return new HttpResponse(null, { status: 500 });
          }
          return HttpResponse.json({ success: true });
        })
      );

      const result = await client.get('/retry-500');
      expect(result).toEqual({ success: true });
      expect(callCount).toBe(3);
    });
  });
});
