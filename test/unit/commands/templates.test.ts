import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Command } from 'commander';

// Mock templates config
jest.unstable_mockModule('../../../src/config/templates.js', () => ({
  templates: {
    getAll: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock sessions handler
jest.unstable_mockModule('../../../src/services/sessionService.js', () => ({
  createSession: jest.fn(),
}));


jest.unstable_mockModule('../../../src/output/formatter.js', () => ({
  formatOutput: jest.fn((data: any) => JSON.stringify(data)),
  output: jest.fn(),
  outputFormatted: jest.fn(),
  createFormatterContext: jest.fn(() => ({ headerShown: false })),
}));

// Mock output formatter
jest.unstable_mockModule('../../../src/output/formatter.js', () => ({
  formatOutput: jest.fn((data: any) => JSON.stringify(data)),
  output: jest.fn(),
  outputFormatted: jest.fn(),
  createFormatterContext: jest.fn(() => ({ headerShown: false })),
}));

// Mock getClient
jest.unstable_mockModule('../../../src/utils/client.js', () => ({
  getClient: jest.fn(),
}));

// Mock fs
jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
  constants: { O_RDONLY: 0, O_WRONLY: 1, O_RDWR: 2 },
  default: {
    readFileSync: jest.fn(),
    promises: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      mkdir: jest.fn(),
    },
    constants: { O_RDONLY: 0, O_WRONLY: 1, O_RDWR: 2 },
  },
}));

const { createTemplatesCommands } = await import('../../../src/commands/templates.js');
const { templates } = await import('../../../src/config/templates.js');
const { createSession } = await import('../../../src/services/sessionService.js');
const { NotFoundError, InvalidArgsError } = await import('../../../src/utils/errors.js');

describe('Templates Commands', () => {
  let program: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    program = new Command();
    program.exitOverride();
    program.addCommand(createTemplatesCommands());
  });

  describe('list', () => {
    it('should list all templates', async () => {
      const mockTemplates = [
        { id: 't1', name: 'T1', prompt: 'P1' },
        { id: 't2', name: 'T2', prompt: 'P2' },
      ];
      (templates.getAll as jest.Mock).mockReturnValue(mockTemplates);

      await program.parseAsync(['node', 'test', 'templates', 'list']);

      expect(templates.getAll).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should get a specific template', async () => {
      const mockTemplate = { id: 't1', name: 'T1', prompt: 'P1' };
      (templates.get as jest.Mock).mockReturnValue(mockTemplate);

      await program.parseAsync(['node', 'test', 'templates', 'get', 't1']);

      expect(templates.get).toHaveBeenCalledWith('t1');
    });

    it('should throw if template not found', async () => {
      (templates.get as jest.Mock).mockReturnValue(undefined);

      await expect(program.parseAsync(['node', 'test', 'templates', 'get', 'none']))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('use', () => {
    it('should fill template and call createSession', async () => {
      const mockTemplate = {
        id: 'bugfix',
        name: 'Bug Fix',
        prompt: 'Fix {{bug}} in {{area}}',
        variables: [
          { name: 'bug', required: true },
          { name: 'area', required: false },
        ],
      };
      (templates.get as jest.Mock).mockReturnValue(mockTemplate);
      (createSession as any).mockResolvedValue({
        client: {},
        session: { id: '123', title: 'Bug Fix' },
      });

      await program.parseAsync([
        'node', 'test', 'templates', 'use', 'bugfix',
        'bug=login', 'area=auth'
      ]);

      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Fix login in auth',
          title: 'Bug Fix',
        })
      );
    });

    it('should use default values for variables', async () => {
        const mockTemplate = {
          id: 't1',
          name: 'T1',
          prompt: 'Hello {{name}}',
          variables: [
            { name: 'name', defaultValue: 'World' },
          ],
        };
        (templates.get as jest.Mock).mockReturnValue(mockTemplate);
        (createSession as any).mockResolvedValue({
          client: {},
          session: { id: '123', title: 'T1' },
        });
  
        await program.parseAsync(['node', 'test', 'templates', 'use', 't1']);
  
        expect(createSession).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: 'Hello World',
          })
        );
      });

    it('should fail if required variable is missing', async () => {
      const mockTemplate = {
        id: 't1',
        name: 'T1',
        prompt: '{{missing}}',
        variables: [
          { name: 'missing', required: true },
        ],
      };
      (templates.get as jest.Mock).mockReturnValue(mockTemplate);

      await expect(program.parseAsync(['node', 'test', 'templates', 'use', 't1']))
        .rejects.toThrow(InvalidArgsError);
    });
  });

  describe('edit', () => {
    it('should update an existing template', async () => {
      const mockTemplate = { id: 't1', name: 'T1', prompt: 'P1' };
      (templates.get as jest.Mock).mockReturnValue(mockTemplate);

      await program.parseAsync(['node', 'test', 'templates', 'edit', 't1', '--name', 'New Name']);

      expect(templates.set).toHaveBeenCalledWith(expect.objectContaining({
        id: 't1',
        name: 'New Name',
      }));
    });

    it('should throw if template not found', async () => {
      (templates.get as jest.Mock).mockReturnValue(undefined);

      await expect(program.parseAsync(['node', 'test', 'templates', 'edit', 'none', '--name', 'New Name']))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete an existing template', async () => {
      (templates.get as jest.Mock).mockReturnValue({ id: 't1' });

      await program.parseAsync(['node', 'test', 'templates', 'delete', 't1']);

      expect(templates.delete).toHaveBeenCalledWith('t1');
    });

    it('should throw if template not found', async () => {
      (templates.get as jest.Mock).mockReturnValue(undefined);

      await expect(program.parseAsync(['node', 'test', 'templates', 'delete', 'none']))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('import', () => {
    it('should import templates from a file', async () => {
      const fs = await import('fs');
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([
        { id: 'i1', name: 'I1', prompt: 'P1' },
        { id: 'i2', name: 'I2', prompt: 'P2' },
      ]));

      await program.parseAsync(['node', 'test', 'templates', 'import', 'test.json']);

      expect(templates.set).toHaveBeenCalledTimes(2);
      expect(templates.set).toHaveBeenCalledWith({ id: 'i1', name: 'I1', prompt: 'P1' });
      expect(templates.set).toHaveBeenCalledWith({ id: 'i2', name: 'I2', prompt: 'P2' });
    });
  });
});
