import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Command } from 'commander';

// Mock templates config
jest.unstable_mockModule('../../../src/config/templates.js', () => ({
  templates: {
    getAll: jest.fn(),
    get: jest.fn(),
  },
}));

// Mock sessions handler
jest.unstable_mockModule('../../../src/commands/sessions.js', () => ({
  handleCreateSession: jest.fn(),
  createSessionsCommands: jest.fn(),
}));

// Mock output formatter
jest.unstable_mockModule('../../../src/output/formatter.js', () => ({
  formatOutput: jest.fn((data: any) => JSON.stringify(data)),
  output: jest.fn(),
}));

// Mock getClient
jest.unstable_mockModule('../../../src/utils/client.js', () => ({
  getClient: jest.fn(),
}));

const { createTemplatesCommands } = await import('../../../src/commands/templates.js');
const { templates } = await import('../../../src/config/templates.js');
const { handleCreateSession } = await import('../../../src/commands/sessions.js');

describe('Templates Commands', () => {
  let program: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    program = new Command();
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

    it('should exit if template not found', async () => {
      (templates.get as jest.Mock).mockReturnValue(undefined);
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
        throw new Error('exit ' + code);
      });

      await expect(program.parseAsync(['node', 'test', 'templates', 'get', 'none']))
        .rejects.toThrow('exit 1');

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });
  });

  describe('use', () => {
    it('should fill template and call handleCreateSession', async () => {
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

      await program.parseAsync([
        'node', 'test', 'templates', 'use', 'bugfix',
        'bug=login', 'area=auth'
      ]);

      expect(handleCreateSession).toHaveBeenCalledWith(
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
  
        await program.parseAsync(['node', 'test', 'templates', 'use', 't1']);
  
        expect(handleCreateSession).toHaveBeenCalledWith(
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
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
        throw new Error('exit ' + code);
      });

      await expect(program.parseAsync(['node', 'test', 'templates', 'use', 't1']))
        .rejects.toThrow('exit 1');

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });
  });
});
