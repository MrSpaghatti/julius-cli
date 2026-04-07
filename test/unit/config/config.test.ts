import { jest } from '@jest/globals';

// Mock Conf
const mockConfInstance = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  has: jest.fn(),
  store: {},
};

jest.unstable_mockModule('conf', () => {
  return {
    default: jest.fn().mockImplementation(() => mockConfInstance),
  };
});

// Mock cross-keychain
jest.unstable_mockModule('cross-keychain', () => {
  return {
    setPassword: jest.fn(),
    getPassword: jest.fn(),
    deletePassword: jest.fn(),
  };
});

const { config } = await import('../../../src/config/index.js');
const { setPassword, getPassword, deletePassword } = await import('cross-keychain');

describe('ConfigManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.JULES_API_KEY;
    delete process.env.JULES_API_ENDPOINT;
    mockConfInstance.store = {};
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should get a config value', () => {
    mockConfInstance.get.mockReturnValue('pretty');
    
    expect(config.get('defaultFormat')).toBe('pretty');
    expect(mockConfInstance.get).toHaveBeenCalledWith('defaultFormat');
  });

  it('should set a config value', () => {
    config.set('defaultFormat', 'json');
    expect(mockConfInstance.set).toHaveBeenCalledWith('defaultFormat', 'json');
  });

  it('should delete a config value', () => {
    config.delete('defaultFormat');
    expect(mockConfInstance.delete).toHaveBeenCalledWith('defaultFormat');
  });

  it('should clear all config values', () => {
    config.clear();
    expect(mockConfInstance.clear).toHaveBeenCalled();
  });

  it('should check if a key exists', () => {
    mockConfInstance.has.mockReturnValue(true);
    expect(config.has('defaultFormat')).toBe(true);
  });

  it('should get all config values', () => {
    const mockStore = { defaultFormat: 'json' };
    mockConfInstance.store = mockStore;
    expect(config.getAll()).toBe(mockStore);
  });

  describe('API Key', () => {
    it('should get API key from environment variable', async () => {
      process.env.JULES_API_KEY = 'env-key';
      const key = await config.getApiKey();
      expect(key).toBe('env-key');
      expect(getPassword).not.toHaveBeenCalled();
    });

    it('should get API key from keychain if not in environment', async () => {
      (getPassword as any).mockResolvedValue('keychain-key');
      const key = await config.getApiKey();
      expect(key).toBe('keychain-key');
      expect(getPassword).toHaveBeenCalled();
    });

    it('should return undefined if API key not found anywhere', async () => {
      (getPassword as any).mockResolvedValue(null);
      const key = await config.getApiKey();
      expect(key).toBeUndefined();
    });

    it('should set API key in keychain', async () => {
      await config.setApiKey('new-key');
      expect(setPassword).toHaveBeenCalledWith('jules-cli', 'api-key', 'new-key');
    });

    it('should clear API key from keychain', async () => {
      await config.clearApiKey();
      expect(deletePassword).toHaveBeenCalledWith('jules-cli', 'api-key');
    });

    it('should get API key source as environment', async () => {
      process.env.JULES_API_KEY = 'env-key';
      expect(await config.getApiKeySource()).toBe('environment');
    });

    it('should get API key source as keychain', async () => {
      (getPassword as any).mockResolvedValue('keychain-key');
      expect(await config.getApiKeySource()).toBe('keychain');
    });

    it('should get API key source as none', async () => {
      (getPassword as any).mockResolvedValue(null);
      expect(await config.getApiKeySource()).toBe('none');
    });
  });

  describe('API Endpoint', () => {
    it('should get API endpoint from environment variable', () => {
      process.env.JULES_API_ENDPOINT = 'https://env.api.com';
      expect(config.getApiEndpoint()).toBe('https://env.api.com');
    });

    it('should get API endpoint from config if not in environment', () => {
      mockConfInstance.get.mockReturnValue('https://config.api.com');
      expect(config.getApiEndpoint()).toBe('https://config.api.com');
    });

    it('should return default endpoint if not found anywhere', () => {
      mockConfInstance.get.mockReturnValue(undefined);
      expect(config.getApiEndpoint()).toBe('https://jules.googleapis.com/v1alpha');
    });
  });
});
