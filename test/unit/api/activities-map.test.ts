import { describe, it, expect } from "@jest/globals";
import { mapRawActivity } from "../../../src/api/activities.js";
import type { RawActivityEvent } from "../../../src/api/types.js";

// Fixtures captured from the real Jules API (v1alpha) — session
// 8069486286309362531 (2026-08-26). The wire format is a one-of event
// object: exactly one of agentMessaged/userMessaged/planGenerated/
// planApproved/progressUpdated/sessionCompleted/sessionFailed is populated.

const agentMessage: RawActivityEvent = {
  name: "sessions/8069486286309362531/activities/abc123",
  id: "abc123",
  createTime: "2026-08-26T18:24:22.518912Z",
  originator: "agent",
  agentMessaged: { agentMessage: "should I continue with the refactor?" },
};

const userMessage: RawActivityEvent = {
  name: "sessions/8069486286309362531/activities/def456",
  id: "def456",
  createTime: "2026-08-26T18:25:00.000000Z",
  originator: "user",
  userMessaged: { userMessage: "yes, continue" },
};

const planGenerated: RawActivityEvent = {
  name: "sessions/8069486286309362531/activities/e092f218",
  id: "e092f218",
  createTime: "2026-08-26T17:55:29.393819Z",
  originator: "agent",
  planGenerated: {
    plan: {
      id: "288d098ffdf04d22a7d71f54e1cf225a",
      steps: [
        { title: "Create `src/misaki_g2p.nim`:", description: "..." },
        { title: "Create `src/voiceforge.nim`:", description: "..." },
      ],
    },
  },
};

const planApproved: RawActivityEvent = {
  name: "sessions/8069486286309362531/activities/044d310a",
  id: "044d310a",
  createTime: "2026-08-26T17:55:44.791638Z",
  originator: "user",
  planApproved: { planId: "288d098ffdf04d22a7d71f54e1cf225a" },
};

const progressUpdate: RawActivityEvent = {
  name: "sessions/8069486286309362531/activities/4ebdc108",
  id: "4ebdc108",
  createTime: "2026-08-26T18:17:41.199645Z",
  originator: "agent",
  progressUpdated: {
    title: "Created `src/misaki_g2p.nim`",
    description: "writes the misaki dictionary into a runtime table",
  },
};

// No-op row: progressUpdated present but empty (real API emits these)
const emptyProgress: RawActivityEvent = {
  name: "sessions/8069486286309362531/activities/e568659d",
  id: "e568659d",
  createTime: "2026-08-26T17:56:51.759150Z",
  originator: "agent",
  progressUpdated: {},
};

const sessionCompleted: RawActivityEvent = {
  name: "sessions/8069486286309362531/activities/999999",
  id: "999999",
  createTime: "2026-08-26T19:00:00.000000Z",
  originator: "system",
  sessionCompleted: {},
};

const sessionFailed: RawActivityEvent = {
  name: "sessions/8069486286309362531/activities/888888",
  id: "888888",
  createTime: "2026-08-26T19:01:00.000000Z",
  originator: "system",
  sessionFailed: { reason: "Build failed: missing import" },
};

describe("mapRawActivity", () => {
  it("maps agent message with author AGENT and type MESSAGE", () => {
    const mapped = mapRawActivity(agentMessage);
    expect(mapped).toMatchObject({
      id: "abc123",
      type: "MESSAGE",
      author: "AGENT",
      content: "should I continue with the refactor?",
    });
  });

  it("maps user message with author USER", () => {
    const mapped = mapRawActivity(userMessage);
    expect(mapped).toMatchObject({
      type: "MESSAGE",
      author: "USER",
      content: "yes, continue",
    });
  });

  it("maps plan generated to PLAN with step titles as content", () => {
    const mapped = mapRawActivity(planGenerated);
    expect(mapped.type).toBe("PLAN");
    expect(mapped.content).toContain("Create `src/misaki_g2p.nim`");
    expect(mapped.content).toContain("Create `src/voiceforge.nim`");
    expect(mapped.author).toBe("AGENT");
  });

  it("maps plan approved to PLAN with plan id", () => {
    const mapped = mapRawActivity(planApproved);
    expect(mapped.type).toBe("PLAN");
    expect(mapped.content).toContain("288d098ffdf04d22a7d71f54e1cf225a");
    expect(mapped.author).toBe("USER");
  });

  it("maps progress update with description", () => {
    const mapped = mapRawActivity(progressUpdate);
    expect(mapped.type).toBe("PROGRESS");
    expect(mapped.content).toContain("runtime table");
    expect(mapped.author).toBe("AGENT");
  });

  it("maps empty progressUpdated to a harmless empty PROGRESS row", () => {
    const mapped = mapRawActivity(emptyProgress);
    expect(mapped.type).toBe("PROGRESS");
    expect(mapped.content).toBe("");
  });

  it("maps session completed to COMPLETED", () => {
    const mapped = mapRawActivity(sessionCompleted);
    expect(mapped.type).toBe("COMPLETED");
    expect(mapped.author).toBe("AGENT");
  });

  it("maps session failed to FAILED with reason", () => {
    const mapped = mapRawActivity(sessionFailed);
    expect(mapped.type).toBe("FAILED");
    expect(mapped.content).toContain("missing import");
  });

  it("always produces a string content (never undefined)", () => {
    const mapped = mapRawActivity({});
    expect(typeof mapped.content).toBe("string");
    expect(mapped.type).toBe("PROGRESS");
  });
});
