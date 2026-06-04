import type { OutputFormat } from '../cli/types.js';

export interface CLIConfig {
  apiKey?: string;
  apiEndpoint?: string;
  authMethod?: 'apikey' | 'oauth';
  defaultFormat?: OutputFormat;
  defaultPageSize?: number;
  pollInterval?: number;
  maxPollAttempts?: number;
  daemon?: {
    pollInterval?: number;
    notifications?: ('system' | 'agent')[];
    pidFile?: string;
  };
}
