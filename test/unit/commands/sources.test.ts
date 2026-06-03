import { jest } from '@jest/globals';
import { Command } from 'commander';
import { AuthError } from '../../../src/utils/errors.js';
import { Output } from '../../../src/output/manager.js';

// Mock config
jest.unstable_mockModule('../../../src/config/index.js', () => ({
  config: {
    getApiKey: jest.fn(),
    getApiEndpoint: jest.fn(),
    get: jest.fn(),
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
  outputFormatted: jest.fn(),
}));

// Mock API
const mockSourcesAPIInstance = {
  list: jest.fn(),
  get: jest.fn(),
};
jest.unstable_mockModule('../../../src/api/sources.js', () => {
  return {
    SourcesAPI: jest.fn().mockImplementation(() => mockSourcesAPIInstance),
  };
});

// Mock pagination
jest.unstable_mockModule('../../../src/utils/pagination.js', () => ({
  fetchAllPages: jest.fn(),
}));

// Mock client utility
jest.unstable_mockModule('../../../src/utils/client.js', () => ({
  getClient: jest.fn(),
}));

const { createSourcesCommands } = await import('../../../src/commands/sources.js');
const { config } = await import('../../../src/config/index.js');
const { output, outputFormatted } = await import('../../../src/output/formatter.js');
const { fetchAllPages } = await import('../../../src/utils/pagination.js');
const { getClient } = await import('../../../src/utils/client.js');

describe('Sources Commands', () => {
  let sourcesCmd: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    sourcesCmd = createSourcesCommands();
    (config.getApiKey as any).mockResolvedValue('test-key');
    (config.getApiEndpoint as any).mockReturnValue('https://api.test');
    (config.getOAuthTokens as any).mockResolvedValue(undefined);
    (config.getAuthMethod as any).mockReturnValue('apikey');
    (getClient as any).mockResolvedValue({});
  });

  describe('list command', () => {
    it('should list sources', async () => {
      const mockResult = { items: [{ id: 's1' }], totalSize: 1 };
      (mockSourcesAPIInstance.list as any).mockResolvedValue(mockResult);

      const root = new Command().addCommand(sourcesCmd);
      await root.parseAsync(['node', 'test', 'sources', 'list']);

      expect(mockSourcesAPIInstance.list).toHaveBeenCalled();
      expect(outputFormatted).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'sources', sources: mockResult.items }),
        'json'
      );
    });

    it('should fetch all pages when --all is used', async () => {
      const mockResult = { items: [{ id: 's1' }, { id: 's2' }] };
      (fetchAllPages as any).mockResolvedValue(mockResult);

      const root = new Command().addCommand(sourcesCmd);
      await root.parseAsync(['node', 'test', 'sources', 'list', '--all']);

      expect(fetchAllPages).toHaveBeenCalled();
      expect(outputFormatted).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'sources', sources: mockResult.items }),
        'json'
      );
    });

    it('should throw error if API key is missing', async () => {
      (getClient as any).mockRejectedValue(new AuthError('No credentials found.'));
      const root = new Command().addCommand(sourcesCmd);
      sourcesCmd.exitOverride();
      await expect(root.parseAsync(['node', 'test', 'sources', 'list']))
        .rejects.toThrow(/No credentials found/);
    });

    it('should use pretty output format', async () => {
      const mockResult = { items: [{ id: 's1' }], totalSize: 1 };
      (mockSourcesAPIInstance.list as any).mockResolvedValue(mockResult);

      const root = new Command().addCommand(sourcesCmd);
      const spy = jest.spyOn(Output, 'info').mockImplementation(() => {});
      await root.parseAsync(['node', 'test', 'sources', 'list', '--format', 'pretty']);

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Connected Repositories'));
      expect(outputFormatted).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'source', source: mockResult.items[0] }),
        'pretty'
      );
      spy.mockRestore();
    });
  });

  describe('get command', () => {
    it('should get source details', async () => {
      const mockSource = { id: 's1', name: 'sources/github/owner/repo' };
      (mockSourcesAPIInstance.get as any).mockResolvedValue(mockSource);

      const root = new Command().addCommand(sourcesCmd);
      await root.parseAsync(['node', 'test', 'sources', 'get', 's1']);

      expect(mockSourcesAPIInstance.get).toHaveBeenCalledWith('s1');
      expect(outputFormatted).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'source', source: mockSource }),
        'json'
      );
    });
  });
});
