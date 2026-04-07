import { jest } from '@jest/globals';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { cli } from '../../src/cli.js';
import { config } from '../../src/config/index.js';

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

describe('Integration Flows', () => {
  beforeEach(() => {
    keychain.clear();
    // We should also redirect 'conf' but for now we'll just mock the config methods if needed
    // or rely on the fact that we are mocking keychain.
    jest.spyOn(config, 'getApiKey').mockImplementation(async () => keychain.get('julius-cli:api-key'));
    jest.spyOn(config, 'setApiKey').mockImplementation(async (key) => { keychain.set('julius-cli:api-key', key); });
  });

  it('should create a session and wait for it', async () => {
    const apiKey = 'test-api-key';
    const sessionId = '12345';

    // 1. Set API key
    await cli.parseAsync(['node', 'test', 'auth', 'set', apiKey]);
    expect(keychain.get('julius-cli:api-key')).toBe(apiKey);

    // 2. Mock session creation
    server.use(
      http.post(`${baseURL}/sessions`, async () => {
        return HttpResponse.json({
          id: sessionId,
          name: `sessions/${sessionId}`,
          state: 'PENDING',
          sourceContext: { source: 'sources/github/owner/repo' }
        });
      })
    );

    const outputSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    await cli.parseAsync(['node', 'test', 'sessions', 'create', '--repo', 'owner/repo', '--prompt', 'test prompt']);
    
    expect(outputSpy).toHaveBeenCalledWith(expect.stringContaining(sessionId));

    // 3. Mock polling for wait command
    let pollCount = 0;
    server.use(
      http.get(`${baseURL}/sessions/${sessionId}`, () => {
        pollCount++;
        if (pollCount === 1) {
          return HttpResponse.json({ id: sessionId, state: 'EXECUTING' });
        }
        return HttpResponse.json({ id: sessionId, state: 'COMPLETED' });
      })
    );

    // Use fake timers for wait command
    jest.useFakeTimers();
    const waitPromise = cli.parseAsync(['node', 'test', 'wait', sessionId, '--interval', '1']);
    
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(1000);
    
    await waitPromise;
    
    expect(pollCount).toBeGreaterThanOrEqual(2);
    expect(outputSpy).toHaveBeenCalledWith(expect.stringContaining('COMPLETED'));

    jest.useRealTimers();
    outputSpy.mockRestore();
  });
});
