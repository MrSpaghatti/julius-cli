import React from 'react';
import { describe, it, expect, jest } from '@jest/globals';
import { render } from 'ink-testing-library';
import type { Activity } from '../../../src/api/types.js';
import { ChatPanel } from '../../../src/tui/ChatPanel.js';

function makeMessage(overrides: Partial<Activity> = {}): Activity {
  return {
    name: 'activities/m1',
    id: 'm1',
    type: 'MESSAGE',
    content: 'Hello from test',
    author: 'AGENT',
    createTime: new Date().toISOString(),
    ...overrides,
  };
}

describe('ChatPanel', () => {
  const defaultProps = {
    sessionId: 'sess_test123',
    loading: false,
    onSendMessage: jest.fn(() => Promise.resolve()),
    onExit: jest.fn(),
  };

  it('shows empty state when no messages', () => {
    const { lastFrame } = render(
      React.createElement(ChatPanel, {
        ...defaultProps,
        activities: [],
      })
    );
    expect(lastFrame()).toContain('No messages yet');
  });

  it('renders user messages', () => {
    const activities = [
      makeMessage({ id: 'm1', author: 'USER', content: 'Fix the login bug' }),
    ];
    const { lastFrame } = render(
      React.createElement(ChatPanel, {
        ...defaultProps,
        activities,
      })
    );
    const frame = lastFrame()!;
    expect(frame).toContain('you');
    expect(frame).toContain('Fix the login bug');
  });

  it('renders agent messages', () => {
    const activities = [
      makeMessage({ id: 'm2', author: 'AGENT', content: 'I found the issue' }),
    ];
    const { lastFrame } = render(
      React.createElement(ChatPanel, {
        ...defaultProps,
        activities,
      })
    );
    const frame = lastFrame()!;
    expect(frame).toContain('agent');
    expect(frame).toContain('I found the issue');
  });

  it('renders multiple messages in order', () => {
    const activities = [
      makeMessage({ id: 'm1', author: 'USER', content: 'First message' }),
      makeMessage({ id: 'm2', author: 'AGENT', content: 'Response' }),
      makeMessage({ id: 'm3', author: 'USER', content: 'Follow up' }),
    ];
    const { lastFrame } = render(
      React.createElement(ChatPanel, {
        ...defaultProps,
        activities,
      })
    );
    const frame = lastFrame()!;
    expect(frame).toContain('First message');
    expect(frame).toContain('Response');
    expect(frame).toContain('Follow up');
  });

  it('filters out non-MESSAGE activity types', () => {
    const activities = [
      makeMessage({ id: 'm1', type: 'MESSAGE', content: 'A message' }),
      makeMessage({ id: 'm2', type: 'PLAN', content: 'A plan' }),
      makeMessage({ id: 'm3', type: 'PROGRESS', content: 'Progress update' }),
      makeMessage({ id: 'm4', type: 'ERROR', content: 'An error' }),
    ];
    const { lastFrame } = render(
      React.createElement(ChatPanel, {
        ...defaultProps,
        activities,
      })
    );
    const frame = lastFrame()!;
    expect(frame).toContain('A message');
    expect(frame).not.toContain('A plan');
    expect(frame).not.toContain('Progress update');
    expect(frame).not.toContain('An error');
  });

  it('shows error state', () => {
    const { lastFrame } = render(
      React.createElement(ChatPanel, {
        ...defaultProps,
        activities: [],
        error: 'Failed to load activities',
      })
    );
    expect(lastFrame()).toContain('Failed to load activities');
  });

  it('shows session state in header', () => {
    const activities = [
      makeMessage({ id: 'm1', content: 'Hello' }),
    ];
    const { lastFrame } = render(
      React.createElement(ChatPanel, {
        ...defaultProps,
        activities,
        sessionState: 'EXECUTING',
      })
    );
    expect(lastFrame()).toContain('EXECUTING');
  });

  it('shows text input placeholder', () => {
    const { lastFrame } = render(
      React.createElement(ChatPanel, {
        ...defaultProps,
        activities: [],
      })
    );
    expect(lastFrame()).toContain('Type a message');
  });
});
