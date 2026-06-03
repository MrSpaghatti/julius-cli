import React from 'react';
import { describe, it, expect } from '@jest/globals';
import type { Activity } from '../../../src/api/types.js';
import { ActivityPanel } from '../../../src/tui/ActivityPanel.js';
import { render } from 'ink-testing-library';

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    name: 'activities/a1',
    id: 'a1',
    type: 'MESSAGE',
    content: 'Hello world',
    author: 'AGENT',
    createTime: new Date().toISOString(),
    ...overrides,
  };
}

describe('ActivityPanel', () => {
  it('shows loading state when empty and loading', () => {
    const { lastFrame } = render(
      React.createElement(ActivityPanel, { activities: [], loading: true })
    );
    expect(lastFrame()).toContain('Loading activities');
  });

  it('shows empty state when no activities', () => {
    const { lastFrame } = render(
      React.createElement(ActivityPanel, { activities: [], loading: false })
    );
    expect(lastFrame()).toContain('No activities yet');
  });

  it('renders activities with type and content', () => {
    const activities = [
      makeActivity({
        id: 'a1',
        type: 'PLAN',
        content: 'Planning the solution',
        author: 'AGENT',
      }),
    ];
    const { lastFrame } = render(
      React.createElement(ActivityPanel, { activities, loading: false })
    );
    const frame = lastFrame()!;
    expect(frame).toContain('PLAN');
    expect(frame).toContain('Planning the solution');
    expect(frame).toContain('agent');
  });

  it('renders multiple activities', () => {
    const activities = [
      makeActivity({ id: 'a1', type: 'MESSAGE', content: 'First message' }),
      makeActivity({ id: 'a2', type: 'PROGRESS', content: 'Working...', author: 'AGENT' }),
      makeActivity({ id: 'a3', type: 'ERROR', content: 'Something broke', author: 'AGENT' }),
    ];
    const { lastFrame } = render(
      React.createElement(ActivityPanel, { activities, loading: false })
    );
    const frame = lastFrame()!;
    expect(frame).toContain('First message');
    expect(frame).toContain('Working...');
    expect(frame).toContain('Something broke');
  });

  it('truncates long content', () => {
    const longContent = 'x'.repeat(500);
    const activities = [
      makeActivity({ content: longContent }),
    ];
    const { lastFrame } = render(
      React.createElement(ActivityPanel, { activities, loading: false })
    );
    expect(lastFrame()).toContain('...');
  });
});
