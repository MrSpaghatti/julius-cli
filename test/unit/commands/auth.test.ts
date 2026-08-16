import { jest } from '@jest/globals';
import { Command } from 'commander';

// Mock config
jest.unstable_mockModule('../../../src/config/index.js', () => ({
  config: {
    setApiKey: jest.fn(),
    getApiKey: jest.fn(),
    getApiKeySource: jest.fn(),
    getApiEndpoint: jest.fn(),
    clearApiKey: jest.fn(),
    getAuthMethod: jest.fn(),
    setAuthMethod: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Mock output
jest.unstable_mockModule('../../../src/output/formatter.js', () => ({
  output: jest.fn(),
}));

// Mock API
const mockSourcesAPIInstance = {
  list: jest.fn(),
};
jest.unstable_mockModule('../../../src/api/sources.js', () => {
  return {
    SourcesAPI: jest.fn().mockImplementation(() => mockSourcesAPIInstance),
  };
});

// Mock client utility
jest.unstable_mockModule('../../../src/utils/client.js', () => ({
  getClient: jest.fn(),
}));

import { AuthError } from '../../../src/utils/errors.js';
const { createAuthCommands } = await import('../../../src/commands/auth.js');
const { config } = await import('../../../src/config/index.js');
const { output } = await import('../../../src/output/formatter.js');
const { getClient } = await import('../../../src/utils/client.js');

describe('Auth Commands', () => {
  let authCmd: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    authCmd = createAuthCommands();
    // Default mock behavior
    (mockSourcesAPIInstance.list as any).mockResolvedValue({ items: [] });
    (config.getAuthMethod as any).mockReturnValue('apikey');
    (getClient as any).mockResolvedValue({});
  });

  it('should set API key', async () => {
    const root = new Command().addCommand(authCmd);
    await root.parseAsync(['node', 'test', 'auth', 'set', 'test-key']);

    expect(config.setApiKey).toHaveBeenCalledWith('test-key');
    expect(config.setAuthMethod).toHaveBeenCalledWith('apikey');
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success' }),
      'json'
    );
  });

  it('should clear API key', async () => {
    const root = new Command().addCommand(authCmd);
    await root.parseAsync(['node', 'test', 'auth', 'clear']);

    expect(config.clearApiKey).toHaveBeenCalled();
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success' }),
      'json'
    );
  });

  describe('status command', () => {
    it('should show unauthenticated status if getClient fails', async () => {
      (config.getApiEndpoint as any).mockReturnValue('https://api.test');
      (getClient as any).mockRejectedValue(new AuthError('No credentials'));

      const root = new Command().addCommand(authCmd);
      await root.parseAsync(['node', 'test', 'auth', 'status']);

      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ authenticated: false, endpoint: 'https://api.test' }),
        'json'
      );
    });

    it('should show valid status if getClient succeeds', async () => {
      (config.getAuthMethod as any).mockReturnValue('apikey');
      (config.getApiEndpoint as any).mockReturnValue('https://api.test');
      (getClient as any).mockResolvedValue({});

      const root = new Command().addCommand(authCmd);
      await root.parseAsync(['node', 'test', 'auth', 'status']);

      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ authenticated: true, method: 'apikey' }),
        'json'
      );
    });

    it('should show invalid status if API call fails', async () => {
      (getClient as any).mockResolvedValue({});
      (mockSourcesAPIInstance.list as any).mockRejectedValue(new Error('Invalid key'));

      const root = new Command().addCommand(authCmd);
      await root.parseAsync(['node', 'test', 'auth', 'status']);

      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ authenticated: false, error: 'Invalid key' }),
        'json'
      );
    });
  });

  describe('logout command', () => {
    it('should clear all credentials', async () => {
      const root = new Command().addCommand(authCmd);
      await root.parseAsync(['node', 'test', 'auth', 'logout']);

      expect(config.clearApiKey).toHaveBeenCalled();
      expect(config.setAuthMethod).toHaveBeenCalledWith('apikey');
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success', message: 'Logged out successfully' }),
        'json'
      );
    });
  });
});