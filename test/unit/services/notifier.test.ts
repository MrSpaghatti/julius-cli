import { jest, describe, it, expect } from '@jest/globals';

const mockOutputLog = jest.fn();
jest.unstable_mockModule('../../../src/output/manager.js', () => ({ Output: { log: mockOutputLog } }));

const { buildStateChangeEvent, buildNeedsApprovalEvent, buildNewMessageEvent, buildCompletedEvent, buildFailedEvent, sendNotification } = await import('../../../src/services/notifier.js');

const baseSession: any = {
  id: 'sess_abc123def456',
  title: 'Test Session',
  state: 'PLANNING',
  prompt: 'Create a login page',
  createTime: '2026-06-02T00:00:00Z',
  updateTime: '2026-06-02T01:00:00Z',
  sourceContext: { source: 'sources/github/owner/repo' },
  outputs: [],
};

describe('buildStateChangeEvent', () => {
  it('returns null when state unchanged', () => {
    expect(buildStateChangeEvent(baseSession, 'PLANNING')).toBeNull();
  });

  it('returns event on state change', () => {
    const r = buildStateChangeEvent(baseSession, 'PENDING');
    expect(r.type).toBe('state_change');
    expect(r.from).toBe('PENDING');
    expect(r.to).toBe('PLANNING');
  });

  it('handles undefined prior state', () => {
    const r = buildStateChangeEvent(baseSession, undefined);
    expect(r.from).toBeUndefined();
    expect(r.to).toBe('PLANNING');
  });
});

describe('buildNeedsApprovalEvent', () => {
  it('builds approval event', () => {
    const r = buildNeedsApprovalEvent({ ...baseSession, state: 'AWAITING_APPROVAL' });
    expect(r.type).toBe('needs_approval');
    expect(r.prompt).toContain('login');
  });
});

describe('buildNewMessageEvent', () => {
  it('builds message event', () => {
    const r = buildNewMessageEvent(baseSession, { id: 'a1', sessionId: 's1', type: 'MESSAGE', author: 'AGENT', content: 'hello', createTime: '2026-01-01T00:00:00Z' });
    expect(r.author).toBe('AGENT');
    expect(r.content).toBe('hello');
  });
});

describe('buildCompletedEvent', () => {
  it('builds completed event', () => {
    expect(buildCompletedEvent({ ...baseSession, state: 'COMPLETED' }).type).toBe('completed');
  });

  it('includes output URL', () => {
    const s = { ...baseSession, state: 'COMPLETED' as const, outputs: [{ pullRequest: { url: 'https://github.com/owner/repo/pull/42' } }] };
    expect(buildCompletedEvent(s).outputs).toContain('https://github.com/owner/repo/pull/42');
  });
});

describe('buildFailedEvent', () => {
  it('builds failed event', () => {
    expect(buildFailedEvent({ ...baseSession, state: 'FAILED' }).type).toBe('failed');
  });
});

describe('sendNotification', () => {
  it('logs agent event via Output.log', () => {
    sendNotification({ type: 'completed', sessionId: 's1', title: 'T', outputs: '' }, ['agent']);
    const parsed = JSON.parse(mockOutputLog.mock.calls[0][0]);
    expect(parsed.daemon).toBe(true);
    expect(parsed.type).toBe('completed');
  });
});
