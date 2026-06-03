import type { OutputFormat } from '../cli/types.js';

export interface CLIConfig {
  apiKey?: string;
  apiEndpoint?: string; // Default: https://jules.googleapis.com/v1alpha
  authMethod?: 'apikey' | 'oauth';
  defaultFormat?: OutputFormat;
  defaultPageSize?: number; // Default: 30, max: 100
  pollInterval?: number; // Default: 5000ms
  maxPollAttempts?: number; // Default: 120
}
