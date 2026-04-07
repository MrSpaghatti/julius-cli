import { jest } from '@jest/globals';
import { Command } from 'commander';

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
}));

// Mock API
const mockActivitiesAPIInstance = {
  list: jest.fn(),
  get: jest.fn(),
};
jest.unstable_mockModule('../../../src/api/activities.js', () => {
  return {
    ActivitiesAPI: jest.fn().mockImplementation(() => mockActivitiesAPIInstance),
  };
});

// Mock pagination
jest.unstable_mockModule('../../../src/utils/pagination.js', () => ({
  fetchAllPages: jest.fn(),
}));

const { createActivitiesCommands } = await import('../../../src/commands/activities.js');
const { config } = await import('../../../src/config/index.js');
const { output } = await import('../../../src/output/formatter.js');
const { fetchAllPages } = await import('../../../src/utils/pagination.js');

describe('Activities Commands', () => {
  let activitiesCmd: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    activitiesCmd = createActivitiesCommands();
    (config.getApiKey as any).mockResolvedValue('test-key');
    (config.getApiEndpoint as any).mockReturnValue('https://api.test');
    (config.getOAuthTokens as any).mockResolvedValue(undefined);
    (config.getAuthMethod as any).mockReturnValue('apikey');
  });

  describe('list command', () => {
    it('should list activities', async () => {
      const mockResult = { items: [{ id: 'a1' }], totalSize: 1 };
      (mockActivitiesAPIInstance.list as any).mockResolvedValue(mockResult);

      const root = new Command().addCommand(activitiesCmd);
      await root.parseAsync(['node', 'test', 'activities', 'list', '123']);

      expect(mockActivitiesAPIInstance.list).toHaveBeenCalledWith('123', 30, undefined, undefined);
      expect(output).toHaveBeenCalled();
    });

    it('should filter by type', async () => {
      const mockResult = {
        items: [
          { id: '1', type: 'PLAN' },
        ]
      };
      (fetchAllPages as any).mockResolvedValue(mockResult);

      const root = new Command().addCommand(activitiesCmd);
      await root.parseAsync(['node', 'test', 'activities', 'list', '123', '--type', 'PLAN']);

      expect(fetchAllPages).toHaveBeenCalled();
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ activities: mockResult.items }),
        'json',
        'activity'
      );
    });

    it('should filter by author', async () => {
      const mockResult = {
        items: [
          { id: '2', author: 'AGENT' },
        ]
      };
      (fetchAllPages as any).mockResolvedValue(mockResult);

      const root = new Command().addCommand(activitiesCmd);
      await root.parseAsync(['node', 'test', 'activities', 'list', '123', '--author', 'AGENT']);

      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ activities: mockResult.items }),
        'json',
        'activity'
      );
    });
  });

  describe('get command', () => {
    it('should get activity details', async () => {
      const mockActivity = { id: 'a1', content: 'hello' };
      (mockActivitiesAPIInstance.get as any).mockResolvedValue(mockActivity);

      const root = new Command().addCommand(activitiesCmd);
      await root.parseAsync(['node', 'test', 'activities', 'get', '123', 'a1']);

      expect(mockActivitiesAPIInstance.get).toHaveBeenCalledWith('123', 'a1');
      expect(output).toHaveBeenCalledWith(mockActivity, 'json', 'activity');
    });
  });
});
