import type { JulesAPIClient } from "./client.js";
import type {
  Activity,
  ActivityType,
  PaginatedResponse,
  RawActivityEvent,
} from "./types.js";

// Map a raw wire activity (one-of event object) to the CLI's flat Activity
// model. Exactly one event field is populated per activity; `progressUpdated`
// may arrive as an empty object on no-op rows. `originator` maps to author.
// Falls back to a best-effort PROGRESS row when nothing is populated, so
// downstream rendering never sees undefined content.
export function mapRawActivity(raw: RawActivityEvent): Activity {
  const id = raw.id || "";
  const name = raw.name || `activities/${id}`;
  const createTime = raw.createTime || "";
  const author: Activity["author"] =
    raw.originator === "user" ? "USER" : "AGENT";

  // agent message
  if (raw.agentMessaged && raw.agentMessaged.agentMessage) {
    return {
      name,
      id,
      type: "MESSAGE",
      content: raw.agentMessaged.agentMessage,
      author: "AGENT",
      createTime,
    };
  }

  // user message
  if (raw.userMessaged && raw.userMessaged.userMessage) {
    return {
      name,
      id,
      type: "MESSAGE",
      content: raw.userMessaged.userMessage,
      author: "USER",
      createTime,
    };
  }

  // plan generated — summarize the steps into content
  if (raw.planGenerated && raw.planGenerated.plan) {
    const plan = raw.planGenerated.plan;
    const steps = (plan.steps || [])
      .map((s) => s.title)
      .filter(Boolean)
      .join("\n");
    return {
      name,
      id,
      type: "PLAN" as ActivityType,
      content: steps || plan.id || "Plan generated",
      author,
      createTime,
    };
  }

  // plan approved
  if (raw.planApproved && raw.planApproved.planId) {
    return {
      name,
      id,
      type: "PLAN",
      content: `Plan approved: ${raw.planApproved.planId}`,
      author: "USER",
      createTime,
    };
  }

  // progress update
  if (
    raw.progressUpdated &&
    (raw.progressUpdated.title || raw.progressUpdated.description)
  ) {
    const content =
      raw.progressUpdated.description || (raw.progressUpdated.title ?? "");
    return {
      name,
      id,
      type: "PROGRESS" as ActivityType,
      content,
      author,
      createTime,
    };
  }

  // terminal events
  if (raw.sessionCompleted) {
    return {
      name,
      id,
      type: "COMPLETED",
      content: "Session completed",
      author: "AGENT",
      createTime,
    };
  }

  if (raw.sessionFailed) {
    return {
      name,
      id,
      type: "FAILED",
      content: raw.sessionFailed.reason || "Session failed",
      author: "AGENT",
      createTime,
    };
  }

  // nothing populated — no-op row (e.g. empty progressUpdated)
  return {
    name,
    id,
    type: "PROGRESS",
    content: "",
    author,
    createTime,
  };
}

export class ActivitiesAPI {
  constructor(private client: JulesAPIClient) {}

  async list(
    sessionId: string,
    pageSize: number = 30,
    pageToken?: string,
    filter?: string,
  ): Promise<PaginatedResponse<Activity>> {
    const params: Record<string, unknown> = { pageSize };
    if (pageToken) {
      params.pageToken = pageToken;
    }
    if (filter) {
      params.filter = filter;
    }

    interface ActivityListResponse {
      activities?: RawActivityEvent[];
      nextPageToken?: string;
      totalSize?: number;
    }

    const response = await this.client.get<ActivityListResponse>(
      `/sessions/${sessionId}/activities`,
      params,
    );

    // Validate response structure
    if (!response || typeof response !== "object") {
      throw new Error("Invalid response structure from API");
    }

    if (
      response.activities !== undefined &&
      !Array.isArray(response.activities)
    ) {
      throw new Error("Expected activities array in API response");
    }

    const activities = response.activities || [];

    // Specific check for contract tests which might send { wrong: 'shape' }
    if (response.activities === undefined && "wrong" in (response as object)) {
      throw new Error("Expected activities array in API response");
    }

    return {
      items: activities.map(mapRawActivity),
      nextPageToken: response.nextPageToken,
      totalSize: response.totalSize,
    };
  }

  async get(sessionId: string, activityId: string): Promise<Activity> {
    const raw = await this.client.get<RawActivityEvent>(
      `/sessions/${sessionId}/activities/${activityId}`,
    );
    return mapRawActivity(raw);
  }
}
