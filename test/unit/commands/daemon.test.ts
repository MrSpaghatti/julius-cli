import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Command } from 'commander';

jest.unstable_mockModule('../../../src/output/manager.js', () => ({
  Output: {
    info: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../src/utils/client.js', () => ({
  getClient: jest.fn().mockResolvedValue({}),
}));

jest.unstable_mockModule('../../../src/config/index.js', () => ({
  config: { get: jest.fn() },
}));

jest.unstable_mockModule('../../../src/api/sessions.js', () => ({
  SessionsAPI: jest.fn().mockImplementation(() => ({
    list: jest.fn().mockResolvedValue({ items: [] }),
    get: jest.fn(),
  })),
}));

jest.unstable_mockModule('../../../src/api/activities.js', () => ({
  ActivitiesAPI: jest.fn().mockImplementation(() => ({
    list: jest.fn().mockResolvedValue({ items: [] }),
  })),
}));

const { createDaemonCommand } = await import('../../../src/commands/daemon.js');

describe('Daemon Command', () => {
  let cmd: Command;

  beforeEach(() => {
    cmd = createDaemonCommand();
  });

  it('registers daemon command with correct name', () => {
    expect(cmd.name()).toBe('daemon');
  });

  it('accepts bare invocation (foreground mode)', async () => {
    const root = new Command().addCommand(cmd);
    await expect(root.parseAsync(['node', 'test', 'daemon'])).rejects.toThrow(); // SIGINT triggers exit
  });

  it('accepts status action', async () => {
    const root = new Command().addCommand(cmd);
    await root.parseAsync(['node', 'test', 'daemon', 'status']);
  });

  it('accepts stop action', async () => {
    const root = new Command().addCommand(cmd);
    await root.parseAsync(['node', 'test', 'daemon', 'stop']);
  });

  it('recognizes --json flag', () => {
    const opts = cmd.options;
    expect(opts.some(o => o.long === '--json')).toBe(true);
  });

  it('recognizes --interval flag', () => {
    const opts = cmd.options;
    expect(opts.some(o => o.long === '--interval')).toBe(true);
  });
});
