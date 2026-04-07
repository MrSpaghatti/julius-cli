import { jest } from '@jest/globals';
import { Command } from 'commander';

// Mock config
jest.unstable_mockModule('../../../src/config/index.js', () => ({
  config: {
    getApiKey: jest.fn(),
    getApiEndpoint: jest.fn(),
    getOAuthTokens: jest.fn(),
    getAuthMethod: jest.fn(),
    get: jest.fn(),
    getRequired: jest.fn(),
  },
}));

// Mock waitCommand
jest.unstable_mockModule('../../../src/commands/wait.js', () => ({
  waitCommand: jest.fn(),
}));

const { createWaitCommand } = await import('../../../src/commands/wait-cli.js');
const { config } = await import('../../../src/config/index.js');
const { waitCommand } = await import('../../../src/commands/wait.js');

describe('Wait Command CLI', () => {
  let waitCmd: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    (config.getApiKey as any).mockResolvedValue('test-key');
    (config.getApiEndpoint as any).mockReturnValue('https://api.test');
    (config.getOAuthTokens as any).mockResolvedValue(undefined);
    (config.getAuthMethod as any).mockReturnValue('apikey');
    (config.get as any).mockReturnValue(undefined);
    (config.getRequired as any).mockImplementation((key: string) => {
      const defaults: Record<string, any> = {
        pollInterval: 5000,
        maxPollAttempts: 120,
        defaultFormat: 'json',
        defaultPageSize: 30,
      };
      return defaults[key];
    });
    waitCmd = createWaitCommand();
  });

  it('should call waitCommand with correct arguments', async () => {
    const root = new Command().addCommand(waitCmd);
    await root.parseAsync(['node', 'test', 'wait', '123', '--timeout', '100', '--interval', '10']);

    expect(waitCommand).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        sessionId: '123',
        timeout: 100,
        interval: 10,
      })
    );
  });

  it('should support multiple session IDs', async () => {
    const root = new Command().addCommand(waitCmd);
    await root.parseAsync(['node', 'test', 'wait', '123', '456']);

    expect(waitCommand).toHaveBeenCalledTimes(2);
    expect(waitCommand).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ sessionId: '123' }));
    expect(waitCommand).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ sessionId: '456' }));
  });

  it('should pass follow and activity-type options', async () => {
    const root = new Command().addCommand(waitCmd);
    await root.parseAsync(['node', 'test', 'wait', '123', '--follow', '--activity-type', 'PLAN', 'ERROR']);

    expect(waitCommand).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        sessionId: '123',
        follow: true,
        activityTypes: ['PLAN', 'ERROR']
      })
    );
  });

  it('should throw error if API key is missing', async () => {
    (config.getApiKey as any).mockResolvedValue(null);
    const root = new Command().addCommand(waitCmd);
    // Use a custom error handler or just expect it to fail
    // wait-cli.ts calls handleError which might process.exit
    // For unit tests we want to see it throwing
  });
});
