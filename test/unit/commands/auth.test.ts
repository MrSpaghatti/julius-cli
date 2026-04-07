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

const { createAuthCommands } = await import('../../../src/commands/auth.js');
const { config } = await import('../../../src/config/index.js');
const { output } = await import('../../../src/output/formatter.js');

describe('Auth Commands', () => {
  let authCmd: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    authCmd = createAuthCommands();
    // Default mock behavior
    (mockSourcesAPIInstance.list as any).mockResolvedValue({ items: [] });
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
    it('should show unauthenticated status if no API key', async () => {
      (config.getApiKey as any).mockResolvedValue(null);
      (config.getApiEndpoint as any).mockReturnValue('https://api.test');

      const root = new Command().addCommand(authCmd);
      await root.parseAsync(['node', 'test', 'auth', 'status']);

      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ authenticated: false, endpoint: 'https://api.test' }),
        'json'
      );
    });

    it('should show valid status if API key is valid', async () => {
      (config.getApiKey as any).mockResolvedValue('test-key');
      (config.getApiKeySource as any).mockResolvedValue('keychain');
      (config.getApiEndpoint as any).mockReturnValue('https://api.test');

      const root = new Command().addCommand(authCmd);
      await root.parseAsync(['node', 'test', 'auth', 'status']);

      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ authenticated: true, source: 'keychain' }),
        'json'
      );
    });

    it('should show invalid status if API call fails', async () => {
      (config.getApiKey as any).mockResolvedValue('test-key');
      (config.getApiKeySource as any).mockResolvedValue('keychain');
      
      (mockSourcesAPIInstance.list as any).mockRejectedValue(new Error('Invalid key'));

      const root = new Command().addCommand(authCmd);
      await root.parseAsync(['node', 'test', 'auth', 'status']);

      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ authenticated: false, error: 'Invalid key' }),
        'json'
      );
    });
  });
});
