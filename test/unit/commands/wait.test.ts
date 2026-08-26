import { jest } from "@jest/globals";

// Mock SessionsAPI and ActivitiesAPI
const mockSessionsAPI = {
  get: jest.fn(),
};
const mockActivitiesAPI = {
  list: jest.fn(),
};

jest.unstable_mockModule("../../../src/api/sessions.js", () => ({
  SessionsAPI: jest.fn().mockImplementation(() => mockSessionsAPI),
}));

jest.unstable_mockModule("../../../src/api/activities.js", () => ({
  ActivitiesAPI: jest.fn().mockImplementation(() => mockActivitiesAPI),
}));

// Mock output
jest.unstable_mockModule("../../../src/output/formatter.js", () => ({
  output: jest.fn(),
  outputFormatted: jest.fn(),
}));

const mockSendNotification = jest.fn();
jest.unstable_mockModule("../../../src/services/notifier.js", () => ({
  sendNotification: mockSendNotification,
  buildStateChangeEvent: (session: any, from: any) => ({
    type: "state_change",
    sessionId: session.id,
    from,
    to: session.state,
  }),
  buildNeedsApprovalEvent: (session: any) => ({
    type: "needs_approval",
    sessionId: session.id,
  }),
  buildNewMessageEvent: (session: any, activity: any) => ({
    type: "new_message",
    sessionId: session.id,
    content: activity.content,
  }),
  buildCompletedEvent: (session: any) => ({
    type: "completed",
    sessionId: session.id,
  }),
  buildFailedEvent: (session: any) => ({
    type: "failed",
    sessionId: session.id,
  }),
}));

const { waitCommand } = await import("../../../src/commands/wait.js");
const { output, outputFormatted } =
  await import("../../../src/output/formatter.js");
const { sendNotification } = await import("../../../src/services/notifier.js");

describe("waitCommand", () => {
  const client = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should complete when session reaches terminal state", async () => {
    (mockSessionsAPI.get as any)
      .mockResolvedValueOnce({ id: "123", state: "PLANNING" })
      .mockResolvedValueOnce({ id: "123", state: "COMPLETED" });

    const waitPromise = waitCommand(client, { sessionId: "123", interval: 1 });

    // Fast-forward
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(1000);

    await waitPromise;

    expect(mockSessionsAPI.get).toHaveBeenCalledTimes(2);
    expect(outputFormatted).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "session",
        session: expect.objectContaining({ state: "COMPLETED" }),
      }),
      "json",
      expect.any(Object),
    );
  });

  it("should throw error on timeout", async () => {
    (mockSessionsAPI.get as any).mockResolvedValue({
      id: "123",
      state: "EXECUTING",
    });

    const waitPromise = waitCommand(client, {
      sessionId: "123",
      timeout: 2,
      interval: 1,
    });

    await jest.advanceTimersByTimeAsync(1000);

    await Promise.all([
      jest.advanceTimersByTimeAsync(1000),
      expect(waitPromise).rejects.toThrow(/Timeout/),
    ]);
  });

  it("should follow activities", async () => {
    (mockSessionsAPI.get as any)
      .mockResolvedValueOnce({ id: "123", state: "EXECUTING" })
      .mockResolvedValueOnce({ id: "123", state: "COMPLETED" });

    (mockActivitiesAPI.list as any)
      .mockResolvedValueOnce({
        items: [
          {
            id: "a1",
            type: "MESSAGE",
            content: "hello",
            createTime: "2026-04-06T20:00:00Z",
          },
        ],
        nextPageToken: "token1",
      })
      .mockResolvedValueOnce({
        items: [],
        nextPageToken: undefined,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "a2",
            type: "PROGRESS",
            content: "done",
            createTime: "2026-04-06T20:05:00Z",
          },
        ],
        nextPageToken: undefined,
      });

    const waitPromise = waitCommand(client, {
      sessionId: "123",
      interval: 1,
      follow: true,
    });

    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();

    // a1 is seen on the first pass (isFirstPass=true) and not output
    // a2 is new on the second pass and IS output
    expect(outputFormatted).not.toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "activity",
        activity: expect.objectContaining({ id: "a1" }),
      }),
      "json",
      expect.any(Object),
    );

    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();

    expect(outputFormatted).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "activity",
        activity: expect.objectContaining({ id: "a2" }),
      }),
      "json",
      expect.any(Object),
    );

    await waitPromise;
  });

  it("should filter activities by type", async () => {
    (mockSessionsAPI.get as any).mockResolvedValueOnce({
      id: "123",
      state: "COMPLETED",
    });

    (mockActivitiesAPI.list as any).mockResolvedValueOnce({
      items: [
        {
          id: "a1",
          type: "PLAN",
          content: "plan",
          createTime: "2026-04-06T20:00:00Z",
        },
        {
          id: "a2",
          type: "PROGRESS",
          content: "progress",
          createTime: "2026-04-06T20:05:00Z",
        },
      ],
    });

    const waitPromise = waitCommand(client, {
      sessionId: "123",
      interval: 1,
      follow: true,
      activityTypes: ["PLAN"],
    });

    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();

    // All activities are seen on the first pass (isFirstPass=true) and not output
    // Only the session terminal state output appears
    expect(outputFormatted).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "session",
        session: expect.objectContaining({ state: "COMPLETED" }),
      }),
      "json",
      expect.any(Object),
    );

    await waitPromise;
  });

  it("should send a completed notification when notify is enabled", async () => {
    (mockSessionsAPI.get as any)
      .mockResolvedValueOnce({ id: "123", state: "PLANNING", title: "Test" })
      .mockResolvedValueOnce({
        id: "123",
        state: "COMPLETED",
        title: "Test",
        outputs: [],
      });

    const waitPromise = waitCommand(client, {
      sessionId: "123",
      interval: 1,
      notify: true,
    });

    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();

    await waitPromise;

    expect(sendNotification).toHaveBeenCalledWith(
      [expect.objectContaining({ type: "completed", sessionId: "123" })],
      ["system"],
    );
  });

  it("should not send any notification when notify is disabled", async () => {
    (mockSessionsAPI.get as any)
      .mockResolvedValueOnce({ id: "123", state: "PLANNING", title: "Test" })
      .mockResolvedValueOnce({
        id: "123",
        state: "COMPLETED",
        title: "Test",
        outputs: [],
      });

    const waitPromise = waitCommand(client, {
      sessionId: "123",
      interval: 1,
      notify: false,
    });

    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();

    await waitPromise;

    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("should send a failed notification on failure", async () => {
    (mockSessionsAPI.get as any)
      .mockResolvedValueOnce({ id: "123", state: "EXECUTING", title: "Test" })
      .mockResolvedValueOnce({ id: "123", state: "FAILED", title: "Test" });

    const waitPromise = waitCommand(client, {
      sessionId: "123",
      interval: 1,
      notify: true,
    });

    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();

    await waitPromise;

    expect(sendNotification).toHaveBeenCalledWith(
      [expect.objectContaining({ type: "failed", sessionId: "123" })],
      ["system"],
    );
  });

  it("should send a needs-approval notification when waiting on approval", async () => {
    (mockSessionsAPI.get as any)
      .mockResolvedValueOnce({ id: "123", state: "PLANNING", title: "Test" })
      .mockResolvedValueOnce({
        id: "123",
        state: "AWAITING_APPROVAL",
        title: "Test",
      });

    const waitPromise = waitCommand(client, {
      sessionId: "123",
      interval: 1,
      state: "AWAITING_APPROVAL" as any,
      notify: true,
    });

    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();

    await waitPromise;

    expect(sendNotification).toHaveBeenCalledWith(
      [expect.objectContaining({ type: "needs_approval", sessionId: "123" })],
      ["system"],
    );
  });

  it("should notify on new agent messages in follow mode", async () => {
    (mockSessionsAPI.get as any)
      .mockResolvedValueOnce({ id: "123", state: "EXECUTING", title: "Test" })
      .mockResolvedValueOnce({
        id: "123",
        state: "COMPLETED",
        title: "Test",
        outputs: [],
      });

    (mockActivitiesAPI.list as any)
      .mockResolvedValueOnce({
        items: [
          {
            id: "a1",
            type: "MESSAGE",
            author: "AGENT",
            content: "old",
            createTime: "2026-04-06T20:00:00Z",
          },
        ],
        nextPageToken: undefined,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "a2",
            type: "MESSAGE",
            author: "AGENT",
            content: "new message",
            createTime: "2026-04-06T20:05:00Z",
          },
        ],
        nextPageToken: undefined,
      });

    const waitPromise = waitCommand(client, {
      sessionId: "123",
      interval: 1,
      follow: true,
      notify: true,
    });

    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();

    await waitPromise;

    // a1 is baseline (first pass), a2 is new and should notify
    expect(sendNotification).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: "new_message",
          sessionId: "123",
          content: "new message",
        }),
      ]),
      ["system"],
    );
  });

  it("should not notify baseline state on first poll", async () => {
    // session is already COMPLETED on the very first poll
    (mockSessionsAPI.get as any).mockResolvedValueOnce({
      id: "123",
      state: "COMPLETED",
      title: "Test",
      outputs: [],
    });

    const waitPromise = waitCommand(client, {
      sessionId: "123",
      interval: 1,
      notify: true,
    });

    await jest.advanceTimersByTimeAsync(1000);
    await Promise.resolve();

    await waitPromise;

    expect(sendNotification).not.toHaveBeenCalled();
  });
});
