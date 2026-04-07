// Core API Types from Jules REST API

export interface Source {
  name: string; // "sources/github/owner/repo"
  id: string; // "github/owner/repo"
  githubRepo?: {
    owner: string;
    repo: string;
  };
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
  sourceContext: {
    source: string;
    githubRepoContext?: {
      startingBranch: string;
    };
  };
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

// CLI Configuration
export interface CLIConfig {
  apiKey?: string;
  apiEndpoint?: string; // Default: https://jules.googleapis.com/v1alpha
  authMethod?: 'apikey' | 'oauth';
  googleClientId?: string;
  googleClientSecret?: string;
  defaultFormat?: OutputFormat;
  defaultPageSize?: number; // Default: 30, max: 100
  pollInterval?: number; // Default: 5000ms
  maxPollAttempts?: number; // Default: 120
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  variables?: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
}

export type OutputFormat = 'json' | 'pretty' | 'quiet' | 'table';

// Command Options
export interface CreateSessionOptions {
  repo: string;
  prompt: string;
  title?: string;
  branch?: string;
  autoCreatePr?: boolean;
  requireApproval?: boolean;
  format?: OutputFormat;
}

export interface ListSessionsOptions {
  repo?: string;
  state?: SessionState[];
  since?: string;
  pageSize?: number;
  pageToken?: string;
  format?: OutputFormat;
}

export interface SendMessageOptions {
  sessionId: string;
  message: string;
  format?: OutputFormat;
}

export interface GetSessionOptions {
  sessionId: string;
  format?: OutputFormat;
}

export interface ListSourcesOptions {
  pageSize?: number;
  pageToken?: string;
  format?: OutputFormat;
}

export interface GetSourceOptions {
  sourceId: string;
  format?: OutputFormat;
}
