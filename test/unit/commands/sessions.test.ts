import { jest, describe, it, expect, beforeEach } from '@jest/globals';
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
const mockSessionsAPIInstance = {
  create: jest.fn(),
  list: jest.fn(),
  get: jest.fn(),
  sendMessage: jest.fn(),
  approvePlan: jest.fn(),
  cancel: jest.fn(),
};
jest.unstable_mockModule('../../../src/api/sessions.js', () => {
  return {
    SessionsAPI: jest.fn().mockImplementation(() => mockSessionsAPIInstance),
  };
});

// Mock pagination
jest.unstable_mockModule('../../../src/utils/pagination.js', () => ({
  fetchAllPages: jest.fn(),
}));

// Mock git
jest.unstable_mockModule('../../../src/utils/git.js', () => ({
  inferRepo: jest.fn(),
  pullSessionChanges: jest.fn(),
  diffSessionChanges: jest.fn(),
}));

// Mock client utility
jest.unstable_mockModule('../../../src/utils/client.js', () => ({
  getClient: jest.fn(),
}));

const { createSessionsCommands } = await import(
  '../../../src/commands/sessions.js'
);
const { config } = await import('../../../src/config/index.js');
const { output } = await import('../../../src/output/formatter.js');
const { fetchAllPages } = await import('../../../src/utils/pagination.js');
const {
  inferRepo,
  pullSessionChanges,
  diffSessionChanges,
} = await import('../../../src/utils/git.js');
const { getClient } = await import('../../../src/utils/client.js');

describe('Sessions Commands', () => {
  let sessionsCmd: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionsCmd = createSessionsCommands();
    (config.getApiKey as any).mockResolvedValue('test-key');
    (config.getApiEndpoint as any).mockReturnValue('https://api.test');
    (getClient as any).mockResolvedValue({});
    (inferRepo as any).mockReturnValue({ provider: 'github', repo: 'owner/repo' });
  });

  describe('create command', () => {
    it('should create a session with explicit repo', async () => {
      const mockSession = { id: '123' };
      (mockSessionsAPIInstance.create as any).mockResolvedValue(mockSession);

      const root = new Command().addCommand(sessionsCmd);
      await root.parseAsync([
        'node',
        'test',
        'sessions',
        'create',
        '--repo',
        'owner/repo',
        '--prompt',
        'test-prompt',
      ]);

      expect(mockSessionsAPIInstance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'test-prompt',
          sourceContext: expect.objectContaining({
            source: 'sources/github/owner/repo',
          }),
        })
      );
      expect(output).toHaveBeenCalledWith(mockSession, 'json', 'session');
    });

    it('should throw error if repo format is invalid', async () => {
      const root = new Command().addCommand(sessionsCmd);
      sessionsCmd.exitOverride();
      await expect(
        root.parseAsync([
          'node',
          'test',
          'sessions',
          'create',
          '--repo',
          'invalid-repo',
          '--prompt',
          'p',
        ])
      ).rejects.toThrow(/Repository must be in format/);
    });

    it('should use pretty output format', async () => {
      const mockSession = { id: '123' };
      (mockSessionsAPIInstance.create as any).mockResolvedValue(mockSession);

      const root = new Command().addCommand(sessionsCmd);
      await root.parseAsync([
        'node',
        'test',
        'sessions',
        'create',
        '--repo',
        'o/r',
        '--prompt',
        'p',
        '--format',
        'pretty',
      ]);

      expect(output).toHaveBeenCalledWith(mockSession, 'pretty', 'session');
    });
  });

  describe('list command', () => {
    it('should list sessions', async () => {
      const mockResult = {
        items: [{ id: '123', sourceContext: { source: 's' } }],
      };
      (mockSessionsAPIInstance.list as any).mockResolvedValue(mockResult);

      const root = new Command().addCommand(sessionsCmd);
      await root.parseAsync(['node', 'test', 'sessions', 'list']);

      expect(mockSessionsAPIInstance.list).toHaveBeenCalled();
      expect(output).toHaveBeenCalled();
    });

    it('should filter by repo', async () => {
      const mockResult = {
        items: [
          { id: '1', sourceContext: { source: 'sources/github/owner/repo1' } },
        ],
      };
      (fetchAllPages as any).mockResolvedValue(mockResult);

      const root = new Command().addCommand(sessionsCmd);
      await root.parseAsync([
        'node',
        'test',
        'sessions',
        'list',
        '--repo',
        'owner/repo1',
      ]);

      // Filtering by repo triggers fetchAllPages
      expect(fetchAllPages).toHaveBeenCalled();
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ sessions: mockResult.items }),
        'json',
        'session'
      );
    });
  });

  describe('interaction commands', () => {
    it('should send a message', async () => {
      const root = new Command().addCommand(sessionsCmd);
      await root.parseAsync([
        'node',
        'test',
        'sessions',
        'send',
        '123',
        '--message',
        'hello',
      ]);

      expect(mockSessionsAPIInstance.sendMessage).toHaveBeenCalledWith(
        '123',
        'hello'
      );
    });

    it('should approve a plan', async () => {
      const root = new Command().addCommand(sessionsCmd);
      await root.parseAsync(['node', 'test', 'sessions', 'approve', '123']);

      expect(mockSessionsAPIInstance.approvePlan).toHaveBeenCalledWith('123');
    });

    it('should cancel a session', async () => {
      const root = new Command().addCommand(sessionsCmd);
      await root.parseAsync(['node', 'test', 'sessions', 'cancel', '123']);

      expect(mockSessionsAPIInstance.cancel).toHaveBeenCalledWith('123');
    });

    it('should pull changes', async () => {
      const mockSession = {
        id: '123',
        state: 'COMPLETED',
        sourceContext: { source: 'sources/github/owner/repo' },
        outputs: [{ branch: { name: 'session-branch' } }],
      };
      (mockSessionsAPIInstance.get as any).mockResolvedValue(mockSession);

      const root = new Command().addCommand(sessionsCmd);
      await root.parseAsync(['node', 'test', 'sessions', 'pull', '123']);

      expect(pullSessionChanges).toHaveBeenCalledWith(
        'owner/repo',
        'session-branch'
      );
    });

    it('should diff changes', async () => {
      const mockSession = {
        id: '123',
        outputs: [{ branch: { name: 'session-branch' } }],
      };
      (mockSessionsAPIInstance.get as any).mockResolvedValue(mockSession);

      const root = new Command().addCommand(sessionsCmd);
      await root.parseAsync(['node', 'test', 'sessions', 'diff', '123']);

      expect(diffSessionChanges).toHaveBeenCalledWith('session-branch');
    });
  });
});
