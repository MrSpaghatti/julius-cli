import Conf from 'conf';
import type { CLIConfig } from '../api/types.js';

const schema = {
  apiKey: {
    type: 'string',
  },
  apiEndpoint: {
    type: 'string',
    default: 'https://jules.googleapis.com/v1alpha',
  },
  defaultFormat: {
    type: 'string',
    enum: ['json', 'pretty', 'quiet'],
    default: 'json',
  },
  defaultPageSize: {
    type: 'number',
    default: 30,
    minimum: 1,
    maximum: 100,
  },
  pollInterval: {
    type: 'number',
    default: 5000,
    minimum: 1000,
  },
  maxPollAttempts: {
    type: 'number',
    default: 120,
    minimum: 1,
  },
} as const;

class ConfigManager {
  private conf: Conf<CLIConfig>;

  constructor() {
    this.conf = new Conf<CLIConfig>({
      projectName: 'jules-cli',
      schema: schema as any,
    });
  }

  get<K extends keyof CLIConfig>(key: K): CLIConfig[K] | undefined {
    return this.conf.get(key);
  }

  set<K extends keyof CLIConfig>(key: K, value: CLIConfig[K]): void {
    this.conf.set(key, value);
  }

  delete(key: keyof CLIConfig): void {
    this.conf.delete(key);
  }

  clear(): void {
    this.conf.clear();
  }

  has(key: keyof CLIConfig): boolean {
    return this.conf.has(key);
  }

  getAll(): CLIConfig {
    return this.conf.store;
  }

  getApiKey(): string | undefined {
    // Check environment variable first
    const envKey = process.env.JULES_API_KEY;
    if (envKey) {
      return envKey;
    }
    // Fall back to config
    return this.conf.get('apiKey');
  }

  getApiEndpoint(): string {
    const envEndpoint = process.env.JULES_API_ENDPOINT;
    if (envEndpoint) {
      return envEndpoint;
    }
    return this.conf.get('apiEndpoint') || 'https://jules.googleapis.com/v1alpha';
  }

  getApiKeySource(): 'environment' | 'config' | 'none' {
    if (process.env.JULES_API_KEY) {
      return 'environment';
    }
    if (this.conf.has('apiKey')) {
      return 'config';
    }
    return 'none';
  }
}

export const config = new ConfigManager();
