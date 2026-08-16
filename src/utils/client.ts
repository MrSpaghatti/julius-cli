import { config } from '../config/index.js';
import { JulesAPIClient } from '../api/client.js';
import { AuthError } from './errors.js';
import { ApiKeyProvider, TokenProvider } from './token-provider.js';

class ProviderTokenWrapper implements TokenProvider {
  constructor(private baseProvider: TokenProvider) {}

  async getAuthHeader(): Promise<Record<string, string>> {
    const headers = await this.baseProvider.getAuthHeader();

    // Add provider-specific tokens if present
    if (process.env.JULES_GITHUB_API_KEY) {
      headers['X-Github-Token'] = process.env.JULES_GITHUB_API_KEY;
    }
    if (process.env.JULES_GITLAB_API_KEY) {
      headers['X-Gitlab-Token'] = process.env.JULES_GITLAB_API_KEY;
    }
    if (process.env.JULES_BITBUCKET_API_KEY) {
      headers['X-Bitbucket-Token'] = process.env.JULES_BITBUCKET_API_KEY;
    }

    return headers;
  }
}

export async function getClient(): Promise<JulesAPIClient> {
  const endpoint = config.getApiEndpoint();
  let baseProvider: TokenProvider | undefined;

  // 1. Env API key
  if (process.env.JULES_API_KEY) {
    baseProvider = new ApiKeyProvider(process.env.JULES_API_KEY);
  }

  // 2. Stored API key
  if (!baseProvider) {
    const apiKey = await config.getApiKey();
    if (apiKey) {
      baseProvider = new ApiKeyProvider(apiKey);
    }
  }

  if (!baseProvider) {
    throw new AuthError(
      'No credentials found.',
      'Run "julius-cli auth set <key>" to configure your Jules API key.'
    );
  }

  return new JulesAPIClient(new ProviderTokenWrapper(baseProvider), endpoint);
}