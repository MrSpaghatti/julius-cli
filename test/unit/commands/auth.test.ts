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
    getOAuthTokens: jest.fn(),
    getAuthMethod: jest.fn(),
    setAuthMethod: jest.fn(),
    clearOAuthTokens: jest.fn(),
    setOAuthTokens: jest.fn(),
    getOAuthClientCredentials: jest.fn(),
    setOAuthClientCredentials: jest.fn(),
    clearOAuthClientCredentials: jest.fn(),
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

// Mock oauth utils
jest.unstable_mockModule('../../../src/utils/oauth.js', () => ({
  runBrowserOAuthFlow: jest.fn(),
  runDeviceCodeFlow: jest.fn(),
}));

// Mock client utility
jest.unstable_mockModule('../../../src/utils/client.js', () => ({
  getClient: jest.fn(),
}));

import { AuthError, CLIError, ExitCode } from '../../../src/utils/errors.js';
const { createAuthCommands } = await import('../../../src/commands/auth.js');
const { config } = await import('../../../src/config/index.js');
const { output } = await import('../../../src/output/formatter.js');
const { getClient } = await import('../../../src/utils/client.js');
const { runBrowserOAuthFlow, runDeviceCodeFlow } = await import(
  '../../../src/utils/oauth.js'
);

describe('Auth Commands', () => {
  let authCmd: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    authCmd = createAuthCommands();
    // Default mock behavior
    (mockSourcesAPIInstance.list as any).mockResolvedValue({ items: [] });
    (config.getOAuthTokens as any).mockResolvedValue(undefined);
    (config.getOAuthClientCredentials as any).mockResolvedValue({});
    (config.getAuthMethod as any).mockReturnValue('apikey');
    (getClient as any).mockResolvedValue({});
  });

  it('should set API key', async () => {
    const root = new Command().addCommand(authCmd);
    await root.parseAsync(['node', 'test', 'auth', 'set', 'test-key']);

    expect(config.setApiKey).toHaveBeenCalledWith('test-key');
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

    it('should show oauth status with expiration', async () => {
      (config.getAuthMethod as any).mockReturnValue('oauth');
      (config.getApiEndpoint as any).mockReturnValue('https://api.test');
      const expiresAt = Date.now() + 3600000;
      (config.getOAuthTokens as any).mockResolvedValue({ 
        accessToken: 'token', 
        expiresAt 
      });

      const root = new Command().addCommand(authCmd);
      await root.parseAsync(['node', 'test', 'auth', 'status']);

      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ 
          authenticated: true, 
          method: 'oauth',
          expiresAt: new Date(expiresAt).toISOString()
        }),
        'json'
      );
    });
  });

  describe('login command', () => {
    it('should login via browser flow', async () => {
      const mockTokens = { accessToken: 'abc', expiresAt: Date.now() + 1000 };
      (config.get as any).mockReturnValue('test-client-id');
      (config.get as any).mockReturnValue('test-client-secret');
      (runBrowserOAuthFlow as any).mockResolvedValue(mockTokens);

      const root = new Command().addCommand(authCmd);
      await root.parseAsync(['node', 'test', 'auth', 'login', '--client-id', 'id', '--client-secret', 'secret']);

      expect(runBrowserOAuthFlow).toHaveBeenCalledWith('id', 'secret', expect.any(Array));
      expect(config.setOAuthTokens).toHaveBeenCalledWith(mockTokens);
      expect(config.setAuthMethod).toHaveBeenCalledWith('oauth');
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success', method: 'oauth' }),
        'json'
      );
    });

    it('should login via device flow', async () => {
      const mockTokens = { accessToken: 'abc', expiresAt: Date.now() + 1000 };
      (runDeviceCodeFlow as any).mockResolvedValue(mockTokens);

      const root = new Command().addCommand(authCmd);
      await root.parseAsync(['node', 'test', 'auth', 'login', '--client-id', 'id', '--device-code']);

      expect(runDeviceCodeFlow).toHaveBeenCalledWith('id', expect.any(Array));
      expect(config.setOAuthTokens).toHaveBeenCalledWith(mockTokens);
      expect(config.setAuthMethod).toHaveBeenCalledWith('oauth');
    });

    it('should throw error if clientId is missing', async () => {
      (config.get as any).mockReturnValue(undefined);
      const root = new Command().addCommand(authCmd);
      authCmd.exitOverride();

      await expect(root.parseAsync(['node', 'test', 'auth', 'login']))
        .rejects.toThrow(/OAuth client ID is required/);
    });
  });

  describe('logout command', () => {
    it('should clear all credentials', async () => {
      const root = new Command().addCommand(authCmd);
      await root.parseAsync(['node', 'test', 'auth', 'logout']);

      expect(config.clearApiKey).toHaveBeenCalled();
      expect(config.clearOAuthTokens).toHaveBeenCalled();
      expect(config.setAuthMethod).toHaveBeenCalledWith('apikey');
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success', message: 'Logged out successfully' }),
        'json'
      );
    });
  });
});
