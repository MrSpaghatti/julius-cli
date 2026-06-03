// Core API Types from Jules REST API

export interface Source {
  name: string; // "sources/github/owner/repo"
  id: string; // "github/owner/repo"
  githubRepo?: {
    owner: string;
    repo: string;
  };
}

export type SessionProvider = 'github' | 'gitlab' | 'bitbucket';

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
  | 'PENDING'
  | 'PLANNING'
  | 'AWAITING_APPROVAL'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type AutomationMode = 'NONE' | 'AUTO_CREATE_PR';

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

export type ActivityType = 'PLAN' | 'MESSAGE' | 'PROGRESS' | 'ERROR';
export type ActivityAuthor = 'USER' | 'AGENT';

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
