import { config } from '../config/index.js';
import { JulesAPIClient } from '../api/client.js';
import { AuthError } from './errors.js';
import { ApiKeyProvider, OAuthProvider } from './token-provider.js';
import { refreshAccessToken } from './oauth.js';

export async function getClient(): Promise<JulesAPIClient> {
  const endpoint = config.getApiEndpoint();

  // 1. Env OAuth token (static)
  if (process.env.JULES_OAUTH_TOKEN) {
    const provider = new OAuthProvider(
      {
        accessToken: process.env.JULES_OAUTH_TOKEN,
        refreshToken: '',
        expiresAt: Infinity,
      },
      async () => {
        throw new Error('Static OAuth token from environment cannot be refreshed.');
      }
    );
    return new JulesAPIClient(provider, endpoint);
  }

  // 2. Env API key
  if (process.env.JULES_API_KEY) {
    return new JulesAPIClient(new ApiKeyProvider(process.env.JULES_API_KEY), endpoint);
  }

  // 3. Stored OAuth tokens
  const oauthTokens = await config.getOAuthTokens();
  if (oauthTokens && config.getAuthMethod() === 'oauth') {
    const provider = new OAuthProvider(oauthTokens, async () => {
      const clientId =
        process.env.JULES_GOOGLE_CLIENT_ID || (config.get('googleClientId') as string);
      const clientSecret =
        process.env.JULES_GOOGLE_CLIENT_SECRET || (config.get('googleClientSecret') as string);

      if (!clientId || !clientSecret) {
        throw new AuthError(
          'OAuth client ID and secret are required for token refresh.',
          'Set them via JULES_GOOGLE_CLIENT_ID and JULES_GOOGLE_CLIENT_SECRET environment variables.'
        );
      }

      const refreshed = await refreshAccessToken(clientId, clientSecret, oauthTokens.refreshToken);
      const newTokens = { ...oauthTokens, ...refreshed };
      await config.setOAuthTokens(newTokens);
      return newTokens;
    });
    return new JulesAPIClient(provider, endpoint);
  }

  // 4. Stored API key
  const apiKey = await config.getApiKey();
  if (apiKey) {
    return new JulesAPIClient(new ApiKeyProvider(apiKey), endpoint);
  }

  throw new AuthError(
    'No credentials found.',
    'Run "jules-cli auth login" or "jules-cli auth set <key>" to configure.'
  );
}
