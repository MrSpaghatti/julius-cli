import Conf from 'conf';
import { setPassword, getPassword, deletePassword } from 'cross-keychain';
import type { CLIConfig } from '../api/types.js';
import { CLIError, ExitCode } from '../utils/errors.js';

const SERVICE_NAME = 'jules-cli';
const ACCOUNT_NAME = 'api-key';

const schema = {
  apiEndpoint: {
    type: 'string',
    default: 'https://jules.googleapis.com/v1alpha',
  },
  defaultFormat: {
    type: 'string',
    enum: ['json', 'pretty', 'quiet', 'table'],
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

  getRequired<K extends keyof CLIConfig>(key: K): NonNullable<CLIConfig[K]> {
    const val = this.conf.get(key);
    if (val === undefined || val === null) {
      throw new CLIError(
        `Configuration key '${key}' is not set`,
        ExitCode.INVALID_ARGS
      );
    }
    return val as NonNullable<CLIConfig[K]>;
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

  async clearApiKey(): Promise<void> {
    try {
      await deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch (error) {
      // Ignore if it doesn't exist
    }
  }

  has(key: keyof CLIConfig): boolean {
    return this.conf.has(key);
  }

  getAll(): CLIConfig {
    return this.conf.store;
  }

  async getApiKey(): Promise<string | undefined> {
    // Check environment variable first
    const envKey = process.env.JULES_API_KEY;
    if (envKey) {
      return envKey;
    }
    // Fall back to keychain
    try {
      return await getPassword(SERVICE_NAME, ACCOUNT_NAME) || undefined;
    } catch (error) {
      return undefined;
    }
  }

  async setApiKey(key: string): Promise<void> {
    await setPassword(SERVICE_NAME, ACCOUNT_NAME, key);
  }

  getApiEndpoint(): string {
    const envEndpoint = process.env.JULES_API_ENDPOINT;
    if (envEndpoint) {
      return envEndpoint;
    }
    return this.conf.get('apiEndpoint') || 'https://jules.googleapis.com/v1alpha';
  }

  async getApiKeySource(): Promise<'environment' | 'keychain' | 'none'> {
    if (process.env.JULES_API_KEY) {
      return 'environment';
    }
    const key = await this.getApiKey();
    if (key) {
      return 'keychain';
    }
    return 'none';
  }
}

export const config = new ConfigManager();
