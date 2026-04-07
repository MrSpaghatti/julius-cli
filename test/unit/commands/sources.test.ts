import { jest } from '@jest/globals';
import { Command } from 'commander';

// Mock config
jest.unstable_mockModule('../../../src/config/index.js', () => ({
  config: {
    getApiKey: jest.fn(),
    getApiEndpoint: jest.fn(),
    get: jest.fn(),
  },
}));

// Mock output
jest.unstable_mockModule('../../../src/output/formatter.js', () => ({
  output: jest.fn(),
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

const { createSourcesCommands } = await import('../../../src/commands/sources.js');
const { config } = await import('../../../src/config/index.js');
const { output } = await import('../../../src/output/formatter.js');
const { fetchAllPages } = await import('../../../src/utils/pagination.js');

describe('Sources Commands', () => {
  let sourcesCmd: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    sourcesCmd = createSourcesCommands();
    (config.getApiKey as any).mockResolvedValue('test-key');
    (config.getApiEndpoint as any).mockReturnValue('https://api.test');
  });

  describe('list command', () => {
    it('should list sources', async () => {
      const mockResult = { items: [{ id: 's1' }], totalSize: 1 };
      (mockSourcesAPIInstance.list as any).mockResolvedValue(mockResult);

      const root = new Command().addCommand(sourcesCmd);
      await root.parseAsync(['node', 'test', 'sources', 'list']);

      expect(mockSourcesAPIInstance.list).toHaveBeenCalled();
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ sources: mockResult.items }),
        'json',
        'source'
      );
    });

    it('should fetch all pages when --all is used', async () => {
      const mockResult = { items: [{ id: 's1' }, { id: 's2' }] };
      (fetchAllPages as any).mockResolvedValue(mockResult);

      const root = new Command().addCommand(sourcesCmd);
      await root.parseAsync(['node', 'test', 'sources', 'list', '--all']);

      expect(fetchAllPages).toHaveBeenCalled();
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ sources: mockResult.items }),
        'json',
        'source'
      );
    });

    it('should throw error if API key is missing', async () => {
      (config.getApiKey as any).mockResolvedValue(null);
      const root = new Command().addCommand(sourcesCmd);
      sourcesCmd.exitOverride();
      await expect(root.parseAsync(['node', 'test', 'sources', 'list']))
        .rejects.toThrow(/No API key found/);
    });

    it('should use pretty output format', async () => {
      const mockResult = { items: [{ id: 's1' }], totalSize: 1 };
      (mockSourcesAPIInstance.list as any).mockResolvedValue(mockResult);

      const root = new Command().addCommand(sourcesCmd);
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await root.parseAsync(['node', 'test', 'sources', 'list', '--format', 'pretty']);

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Connected Repositories'));
      expect(output).toHaveBeenCalledWith(mockResult.items[0], 'pretty', 'source');
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
      expect(output).toHaveBeenCalledWith(mockSource, 'json', 'source');
    });
  });
});
