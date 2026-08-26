// Core API Types from Jules REST API

export interface Source {
  name: string; // "sources/github/owner/repo"
  id: string; // "github/owner/repo"
  githubRepo?: {
    owner: string;
    repo: string;
  };
}

export type SessionProvider = "github" | "gitlab" | "bitbucket";

export interface SessionRepoContext {
  startingBranch: string;
}

export interface SessionSourceContext {
  source: string;
  githubRepoContext?: SessionRepoContext;
  gitlabRepoContext?: SessionRepoContext;
  bitbucketRepoContext?: SessionRepoContext;
}

export type SessionState =
  | "PENDING"
  | "PLANNING"
  | "AWAITING_APPROVAL"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type AutomationMode = "NONE" | "AUTO_CREATE_PR";

export interface SessionOutput {
  pullRequest?: {
    url: string;
    title: string;
    description: string;
  };
  branch?: {
    name: string;
  };
}

export interface Session {
  name: string; // "sessions/123456789"
  id: string; // "123456789"
  title: string;
  sourceContext: SessionSourceContext;
  prompt: string;
  automationMode?: AutomationMode;
  requirePlanApproval?: boolean;
  state?: SessionState;
  outputs?: SessionOutput[];
  createTime?: string; // ISO 8601
  updateTime?: string; // ISO 8601
}

export type ActivityType =
  | "PLAN"
  | "MESSAGE"
  | "PROGRESS"
  | "ERROR"
  | "COMPLETED"
  | "FAILED";
export type ActivityAuthor = "USER" | "AGENT";

// Raw wire shape from the Jules API. The API returns a one-of object: exactly
// one of the event fields below is populated per activity, with the others
// absent (or null). `originator` designates who produced the activity.
export interface RawActivityEvent {
  name?: string; // "sessions/{session}/activities/{activity}"
  id?: string; // "{activity}"
  createTime?: string; // ISO 8601 with timezone
  originator?: "user" | "agent" | "system";
  agentMessaged?: { agentMessage?: string } | null;
  userMessaged?: { userMessage?: string } | null;
  planGenerated?: {
    plan: { id?: string; steps?: { title?: string; description?: string }[] };
  } | null;
  planApproved?: { planId?: string } | null;
  progressUpdated?: { title?: string; description?: string } | null;
  sessionCompleted?: object | null;
  sessionFailed?: { reason?: string } | null;
}

export interface Activity {
  name: string; // "sessions/123/activities/456"
  id: string; // "456"
  type: ActivityType;
  content: string;
  author: ActivityAuthor;
  createTime: string; // ISO 8601
}

export interface PaginatedResponse<T> {
  items: T[];
  nextPageToken?: string;
  totalSize?: number;
}

export interface WebhookConfig {
  url: string;
  secret?: string;
}
