import { jest } from '@jest/globals';

// Mock SessionsAPI and ActivitiesAPI
const mockSessionsAPI = {
  get: jest.fn(),
};
const mockActivitiesAPI = {
  list: jest.fn(),
};

jest.unstable_mockModule('../../../src/api/sessions.js', () => ({
  SessionsAPI: jest.fn().mockImplementation(() => mockSessionsAPI),
}));

jest.unstable_mockModule('../../../src/api/activities.js', () => ({
  ActivitiesAPI: jest.fn().mockImplementation(() => mockActivitiesAPI),
}));

// Mock output
jest.unstable_mockModule('../../../src/output/formatter.js', () => ({
  output: jest.fn(),
}));

const { waitCommand } = await import('../../../src/commands/wait.js');
const { output } = await import('../../../src/output/formatter.js');

describe('waitCommand', () => {
  const client = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should complete when session reaches terminal state', async () => {
    (mockSessionsAPI.get as any)
      .mockResolvedValueOnce({ id: '123', state: 'PLANNING' })
      .mockResolvedValueOnce({ id: '123', state: 'COMPLETED' });

    const waitPromise = waitCommand(client, { sessionId: '123', interval: 1 });
    
    // Fast-forward
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(1000);

    await waitPromise;

    expect(mockSessionsAPI.get).toHaveBeenCalledTimes(2);
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'COMPLETED' }), 
      'json', 
      'session',
      false,
      undefined
    );
  });

  it('should throw error on timeout', async () => {
    (mockSessionsAPI.get as any).mockResolvedValue({ id: '123', state: 'EXECUTING' });

    const waitPromise = waitCommand(client, { sessionId: '123', timeout: 2, interval: 1 });

    await jest.advanceTimersByTimeAsync(1000);

    // The next one triggers the rejection
    await Promise.all([
      jest.advanceTimersByTimeAsync(1000),
      expect(waitPromise).rejects.toThrow(/Timeout/)
    ]);
  });

  it('should follow activities', async () => {
    (mockSessionsAPI.get as any)
      .mockResolvedValueOnce({ id: '123', state: 'EXECUTING' })
      .mockResolvedValueOnce({ id: '123', state: 'COMPLETED' });

    (mockActivitiesAPI.list as any).mockResolvedValueOnce({
      items: [{ id: 'a1', type: 'MESSAGE', content: 'hello', createTime: '2026-04-06T20:00:00Z' }],
      nextPageToken: 'token1'
    }).mockResolvedValueOnce({
      items: [],
      nextPageToken: undefined
    });
    
    (mockActivitiesAPI.list as any).mockResolvedValueOnce({
      items: [{ id: 'a2', type: 'PROGRESS', content: 'done', createTime: '2026-04-06T20:05:00Z' }],
      nextPageToken: undefined
    });

    const waitPromise = waitCommand(client, { sessionId: '123', interval: 1, follow: true });

    // First interval
    await jest.advanceTimersByTimeAsync(1000);
    // Allow promises to resolve
    await Promise.resolve();
    
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a1' }), 
      'json', 
      'activity', 
      true, 
      undefined
    );

    // Second interval
    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a2' }), 
      'json', 
      'activity', 
      true, 
      undefined
    );

    await waitPromise;
  });

  it('should filter activities by type', async () => {
    (mockSessionsAPI.get as any).mockResolvedValueOnce({ id: '123', state: 'COMPLETED' });

    (mockActivitiesAPI.list as any).mockResolvedValueOnce({
      items: [
        { id: 'a1', type: 'PLAN', content: 'plan', createTime: '2026-04-06T20:00:00Z' },
        { id: 'a2', type: 'PROGRESS', content: 'progress', createTime: '2026-04-06T20:05:00Z' }
      ]
    });

    const waitPromise = waitCommand(client, { 
      sessionId: '123', 
      interval: 1, 
      follow: true, 
      activityTypes: ['PLAN'] 
    });

    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();

    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'PLAN' }), 
      'json', 
      'activity', 
      true, 
      undefined
    );
    expect(output).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'PROGRESS' }), 'json', 'activity');

    await waitPromise;
  });
});
