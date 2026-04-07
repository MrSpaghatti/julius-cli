import { jest } from '@jest/globals';
import { Command } from 'commander';

// Mock config
jest.unstable_mockModule('../../../src/config/index.js', () => ({
  config: {
    setApiKey: jest.fn(),
    getApiKey: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    clear: jest.fn(),
    getOAuthTokens: jest.fn(),
    getAuthMethod: jest.fn(),
    setAuthMethod: jest.fn(),
    clearOAuthTokens: jest.fn(),
    setOAuthTokens: jest.fn(),
  },
}));

// Mock output
jest.unstable_mockModule('../../../src/output/formatter.js', () => ({
  output: jest.fn(),
}));

const { createConfigCommands } = await import('../../../src/commands/config.js');
const { config } = await import('../../../src/config/index.js');
const { output } = await import('../../../src/output/formatter.js');

describe('Config Commands', () => {
  let configCmd: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    configCmd = createConfigCommands();
    (config.getOAuthTokens as any).mockResolvedValue(undefined);
    (config.getAuthMethod as any).mockReturnValue('apikey');
  });

  it('should set a config value', async () => {
    const root = new Command().addCommand(configCmd);
    await root.parseAsync(['node', 'test', 'config', 'set', 'defaultFormat', 'pretty']);

    expect(config.set).toHaveBeenCalledWith('defaultFormat', 'pretty');
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success', key: 'defaultFormat', value: 'pretty' }),
      'json'
    );
  });

  it('should set apiKey separately', async () => {
    const root = new Command().addCommand(configCmd);
    await root.parseAsync(['node', 'test', 'config', 'set', 'apiKey', 'secret-key']);

    expect(config.setApiKey).toHaveBeenCalledWith('secret-key');
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'apiKey' }),
      'json'
    );
  });

  it('should parse numeric values', async () => {
    const root = new Command().addCommand(configCmd);
    await root.parseAsync(['node', 'test', 'config', 'set', 'defaultPageSize', '50']);

    expect(config.set).toHaveBeenCalledWith('defaultPageSize', 50);
  });

  it('should throw on invalid key', async () => {
    const root = new Command().addCommand(configCmd);
    configCmd.exitOverride();
    await expect(root.parseAsync(['node', 'test', 'config', 'set', 'invalidKey', 'value']))
      .rejects.toThrow();
  });

  it('should get a config value', async () => {
    (config.get as any).mockReturnValue('pretty');
    const root = new Command().addCommand(configCmd);
    await root.parseAsync(['node', 'test', 'config', 'get', 'defaultFormat']);

    expect(config.get).toHaveBeenCalledWith('defaultFormat');
    expect(output).toHaveBeenCalledWith({ key: 'defaultFormat', value: 'pretty' }, 'json');
  });

  it('should mask apiKey in get if not --show', async () => {
    (config.getApiKey as any).mockResolvedValue('1234567890');
    const root = new Command().addCommand(configCmd);
    await root.parseAsync(['node', 'test', 'config', 'get', 'apiKey']);

    expect(output).toHaveBeenCalledWith({ key: 'apiKey', value: '1234...7890' }, 'json');
  });

  it('should list all config values with masked apiKey', async () => {
    (config.getAll as any).mockReturnValue({ defaultFormat: 'json' });
    (config.getApiKey as any).mockResolvedValue('1234567890');
    const root = new Command().addCommand(configCmd);
    await root.parseAsync(['node', 'test', 'config', 'list']);

    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ defaultFormat: 'json', apiKey: '1234...7890' })
      }),
      'json'
    );
  });

  it('should reset config', async () => {
    (config.getApiKey as any).mockResolvedValue('secret-key');
    const root = new Command().addCommand(configCmd);
    await root.parseAsync(['node', 'test', 'config', 'reset']);

    expect(config.clear).toHaveBeenCalled();
    expect(config.setApiKey).toHaveBeenCalledWith('secret-key');
  });
});
