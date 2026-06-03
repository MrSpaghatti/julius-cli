import { jest } from '@jest/globals';

// Mock chalk
jest.unstable_mockModule('chalk', () => {
  const mockChalk = {
    bold: {
      cyan: (s: string) => `BOLD_CYAN(${s})`,
    },
    cyan: (s: string) => `CYAN(${s})`,
    gray: (s: string) => `GRAY(${s})`,
    yellow: (s: string) => `YELLOW(${s})`,
    magenta: (s: string) => `MAGENTA(${s})`,
    green: (s: string) => `GREEN(${s})`,
    red: (s: string) => `RED(${s})`,
    blue: (s: string) => `BLUE(${s})`,
  };
  return {
    default: mockChalk,
    ...mockChalk,
  };
});

const { formatJSON } = await import('../../../src/output/json.js');
const { formatPrettySession, formatPrettySource, formatPrettyActivity } = await import('../../../src/output/pretty.js');
const { formatTableSessions, formatTableSources, formatTableActivities } = await import('../../../src/output/table.js');
const { formatOutput } = await import('../../../src/output/formatter.js');

describe('Output Formatters', () => {
  describe('JSON Formatter', () => {
    it('should format data as JSON string', () => {
      const data = { id: '123', name: 'test' };
      const result = formatJSON(data);
      expect(result).toBe(JSON.stringify(data, null, 2));
    });
  });

  describe('Pretty Formatter', () => {
    it('should format a session', () => {
      const session = {
        id: '123',
        title: 'Test Session',
        state: 'COMPLETED',
        sourceContext: {
          source: 'sources/github/owner/repo',
          githubRepoContext: { startingBranch: 'main' }
        },
        createTime: '2026-04-06T20:00:00Z'
      } as any;

      const result = formatPrettySession(session);
      expect(result).toContain('BOLD_CYAN(Session: Test Session)');
      expect(result).toContain('GRAY(  ID: 123)');
      expect(result).toContain('GRAY(  State: GREEN(COMPLETED))');
      expect(result).toContain('GRAY(  Repository: owner/repo)');
      expect(result).toContain('GRAY(  Branch: main)');
    });

    it('should format a source', () => {
      const source = {
        id: 'github/owner/repo',
        name: 'sources/github/owner/repo',
        githubRepo: { owner: 'owner', repo: 'repo' }
      } as any;

      const result = formatPrettySource(source);
      expect(result).toContain('BOLD_CYAN(owner/repo)');
      expect(result).toContain('GRAY(  ID: github/owner/repo)');
      expect(result).toContain('GRAY(  Name: sources/github/owner/repo)');
    });

    it('should format an activity', () => {
      const activity = {
        id: 'a1',
        type: 'MESSAGE',
        author: 'AGENT',
        content: 'Hello world',
        createTime: '2026-04-06T20:01:00Z'
      } as any;

      const result = formatPrettyActivity(activity);
      expect(result).toContain('GREEN([AGENT])');
      expect(result).toContain('CYAN(MESSAGE)');
      expect(result).toContain('GRAY(a1)');
      expect(result).toContain('Hello world');
    });
  });

  describe('Table Formatter', () => {
    it('should format sessions as a table', () => {
      const sessions = [
        { id: '123', title: 'Test', state: 'COMPLETED', sourceContext: { source: 'sources/github/owner/repo' } }
      ] as any;
      const result = formatTableSessions(sessions);
      expect(result).toContain('123');
      expect(result).toContain('Test');
      expect(result).toContain('owner/repo');
    });

    it('should format sources as a table', () => {
      const sources = [
        { id: 's1', name: 'sources/github/owner/repo' }
      ] as any;
      const result = formatTableSources(sources);
      expect(result).toContain('s1');
      expect(result).toContain('sources/github/owner/repo');
    });

    it('should format activities as a table', () => {
      const activities = [
        { id: 'a1', type: 'MESSAGE', author: 'AGENT', content: 'Hello', createTime: '2026-04-06T20:00:00Z' }
      ] as any;
      const result = formatTableActivities(activities);
      expect(result).toContain('a1');
      expect(result).toContain('MESSAGE');
      expect(result).toContain('AGENT');
      expect(result).toContain('Hello');
    });
  });

  describe('Output Dispatcher', () => {
    it('should return empty string for quiet format', () => {
      expect(formatOutput({ kind: 'session', session: { id: '123', title: 'Test' } as any }, 'quiet')).toBe('');
    });

    it('should return JSON for json format', () => {
      expect(formatOutput({ kind: 'session', session: { id: '123', title: 'Test' } as any }, 'json')).toContain('"id": "123"');
    });

    it('should use pretty session formatter when kind is session', () => {
      const result = formatOutput({
        kind: 'session',
        session: {
          id: '123',
          title: 'Test',
          state: 'COMPLETED',
          sourceContext: { source: 's' },
          createTime: '2026-04-06T20:00:00Z'
        } as any
      }, 'pretty');
      expect(result).toContain('Session: Test');
    });

    it('should use table formatter when format is table', () => {
      const result = formatOutput({
        kind: 'sessions',
        sessions: [{
          id: '123',
          title: 'Test',
          sourceContext: { source: 'sources/github/owner/repo' }
        } as any]
      }, 'table');
      expect(result).toContain('123');
      expect(result).toContain('Test');
    });

    it('should format a minimal session without sourceContext gracefully', () => {
      const result = formatOutput({ kind: 'session', session: { id: '123' } as any }, 'pretty');
      expect(result).toContain('Session: 123');
    });
  });
});
