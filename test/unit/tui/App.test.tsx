import React from 'react';
import { jest, describe, it, expect } from '@jest/globals';
import { render } from 'ink-testing-library';

jest.unstable_mockModule('../../../src/utils/client.js', () => ({
  getClient: jest.fn(() => Promise.resolve({
    get: jest.fn(),
    post: jest.fn(),
  })),
}));

jest.unstable_mockModule('../../../src/api/sessions.js', () => ({
  SessionsAPI: jest.fn().mockImplementation(() => ({
    list: jest.fn(() => Promise.resolve({ items: [], nextPageToken: undefined })),
    get: jest.fn(),
    create: jest.fn(),
  })),
}));

jest.unstable_mockModule('../../../src/api/activities.js', () => ({
  ActivitiesAPI: jest.fn().mockImplementation(() => ({
    list: jest.fn(() => Promise.resolve({ items: [], nextPageToken: undefined })),
    get: jest.fn(),
  })),
}));

describe('App', () => {
  it('renders the dashboard header', async () => {
    const { App } = await import('../../../src/tui/App.js') as any;
    const { lastFrame } = render(React.createElement(App));
    expect(lastFrame()).toContain('Julius CLI Dashboard');
  });

  it('shows keyboard shortcuts in status bar', async () => {
    const { App } = await import('../../../src/tui/App.js') as any;
    const { lastFrame } = render(React.createElement(App));
    const frame = lastFrame()!;
    expect(frame).toContain('Navigate');
    expect(frame).toContain('Create');
    expect(frame).toContain('Quit');
  });

  it('renders session panels', async () => {
    const { App } = await import('../../../src/tui/App.js') as any;
    const { lastFrame } = render(React.createElement(App));
    const frame = lastFrame()!;
    expect(frame).toContain('Sessions');
    expect(frame).toContain('Filter:');
    expect(frame).toContain('Navigate');
  });
});
