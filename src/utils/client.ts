import { config } from '../config/index.js';
import { JulesAPIClient } from '../api/client.js';
import { AuthError } from './errors.js';
import { ApiKeyProvider, OAuthProvider, TokenProvider } from './token-provider.js';
import { refreshAccessToken } from './oauth.js';

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

  // 1. Env OAuth token (static)
  if (process.env.JULES_OAUTH_TOKEN) {
    baseProvider = new OAuthProvider(
      {
        accessToken: process.env.JULES_OAUTH_TOKEN,
        refreshToken: '',
        expiresAt: Infinity,
      },
      async () => {
        throw new Error('Static OAuth token from environment cannot be refreshed.');
      }
    );
  }

  // 2. Env API key
  if (!baseProvider && process.env.JULES_API_KEY) {
    baseProvider = new ApiKeyProvider(process.env.JULES_API_KEY);
  }

  // 3. Stored OAuth tokens
  if (!baseProvider) {
    const oauthTokens = await config.getOAuthTokens();
    if (oauthTokens && config.getAuthMethod() === 'oauth') {
      baseProvider = new OAuthProvider(oauthTokens, async () => {
        const stored = await config.getOAuthClientCredentials();
        const clientId =
          process.env.JULES_GOOGLE_CLIENT_ID || stored.clientId;
        const clientSecret =
          process.env.JULES_GOOGLE_CLIENT_SECRET || stored.clientSecret;

        if (!clientId || !clientSecret) {
          throw new AuthError(
            'OAuth client ID and secret are required for token refresh.',
            'Set them via JULES_GOOGLE_CLIENT_ID and JULES_GOOGLE_CLIENT_SECRET environment variables or run "julius-cli auth login".'
          );
        }

        const refreshed = await refreshAccessToken(clientId, clientSecret, oauthTokens.refreshToken);
        const newTokens = { ...oauthTokens, ...refreshed };
        await config.setOAuthTokens(newTokens);
        return newTokens;
      });
    }
  }

  // 4. Stored API key
  if (!baseProvider) {
    const apiKey = await config.getApiKey();
    if (apiKey) {
      baseProvider = new ApiKeyProvider(apiKey);
    }
  }

  if (!baseProvider) {
    throw new AuthError(
      'No credentials found.',
      'Run "julius-cli auth login" or "julius-cli auth set <key>" to configure.'
    );
  }

  return new JulesAPIClient(new ProviderTokenWrapper(baseProvider), endpoint);
}
