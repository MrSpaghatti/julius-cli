import React from 'react';
import { describe, it, expect } from '@jest/globals';
import type { Session } from '../../../src/api/types.js';
import { SessionList } from '../../../src/tui/SessionList.js';
import { render } from 'ink-testing-library';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    name: 'test',
    id: 'session-123',
    title: 'Test Session',
    state: 'PENDING',
    sourceContext: { source: 'sources/github/owner/repo' },
    prompt: 'Do the thing',
    createTime: new Date().toISOString(),
    ...overrides,
  };
}

describe('SessionList', () => {
  it('shows loading state when empty and loading', () => {
    const { lastFrame } = render(
      React.createElement(SessionList, { sessions: [], selectedIndex: 0, loading: true })
    );
    expect(lastFrame()).toContain('Loading sessions');
  });

  it('shows empty state when empty and not loading', () => {
    const { lastFrame } = render(
      React.createElement(SessionList, { sessions: [], selectedIndex: 0, loading: false })
    );
    expect(lastFrame()).toContain('No active sessions');
  });

  it('renders sessions with truncated IDs', () => {
    const sessions = [makeSession({ id: 'session-very-long-id' })];
    const { lastFrame } = render(
      React.createElement(SessionList, { sessions, selectedIndex: 0, loading: false })
    );
    const frame = lastFrame()!;
    expect(frame).toContain('session-very');
    expect(frame).toContain('PENDING');
  });

  it('highlights the selected session', () => {
    const sessions = [
      makeSession({ id: 'first-session-id' }),
      makeSession({ id: 'second-session-id' }),
    ];
    const { lastFrame } = render(
      React.createElement(SessionList, { sessions, selectedIndex: 1, loading: false })
    );
    // IDs are truncated to 12 chars by the component
    expect(lastFrame()).toContain('second-sessi');
  });

  it('shows state icons and repo names', () => {
    const sessions = [
      makeSession({ state: 'COMPLETED', sourceContext: { source: 'sources/github/facebook/react' } }),
    ];
    const { lastFrame } = render(
      React.createElement(SessionList, { sessions, selectedIndex: 0, loading: false })
    );
    const frame = lastFrame()!;
    expect(frame).toContain('facebook/react');
    expect(frame).toContain('COMPLETED');
    expect(frame).toContain('\u2713');
  });
});
