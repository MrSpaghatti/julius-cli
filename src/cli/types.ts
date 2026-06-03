import type { SessionState } from '../api/types.js';

export type OutputFormat = 'json' | 'pretty' | 'quiet' | 'table';

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
