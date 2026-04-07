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

// Mock pagination
jest.unstable_mockModule('../../../src/utils/pagination.js', () => ({
  fetchAllPages: jest.fn(),
}));

const { waitCommand } = await import('../../../src/commands/wait.js');
const { output } = await import('../../../src/output/formatter.js');
const { fetchAllPages } = await import('../../../src/utils/pagination.js');

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
    expect(output).toHaveBeenCalledWith(expect.objectContaining({ state: 'COMPLETED' }), 'json', 'session');
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

    (fetchAllPages as any).mockResolvedValueOnce({
      items: [{ id: 'a1', type: 'MESSAGE', content: 'hello' }]
    });
    (fetchAllPages as any).mockResolvedValueOnce({
      items: [
        { id: 'a1', type: 'MESSAGE', content: 'hello' },
        { id: 'a2', type: 'PROGRESS', content: 'done' }
      ]
    });

    const waitPromise = waitCommand(client, { sessionId: '123', interval: 1, follow: true });

    await jest.advanceTimersByTimeAsync(1000);
    expect(output).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }), 'json', 'activity');

    await jest.advanceTimersByTimeAsync(1000);
    expect(output).toHaveBeenCalledWith(expect.objectContaining({ id: 'a2' }), 'json', 'activity');

    await waitPromise;
  });

  it('should filter activities by type', async () => {
    (mockSessionsAPI.get as any).mockResolvedValueOnce({ id: '123', state: 'COMPLETED' });

    (fetchAllPages as any).mockResolvedValueOnce({
      items: [
        { id: 'a1', type: 'PLAN', content: 'plan' },
        { id: 'a2', type: 'PROGRESS', content: 'progress' }
      ]
    });

    const waitPromise = waitCommand(client, { 
      sessionId: '123', 
      interval: 1, 
      follow: true, 
      activityTypes: ['PLAN'] 
    });

    await jest.advanceTimersByTimeAsync(1000);

    expect(output).toHaveBeenCalledWith(expect.objectContaining({ type: 'PLAN' }), 'json', 'activity');
    expect(output).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'PROGRESS' }), 'json', 'activity');

    await waitPromise;
  });
});
