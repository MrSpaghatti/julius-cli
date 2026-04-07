import { Command } from 'commander';
import { config } from '../config/index.js';
import { output } from '../output/formatter.js';
import { AuthError, CLIError, ExitCode } from '../utils/errors.js';
import { JulesAPIClient } from '../api/client.js';
import { SourcesAPI } from '../api/sources.js';
import type { OutputFormat } from '../api/types.js';
import { getClient } from '../utils/client.js';
import { runBrowserOAuthFlow, runDeviceCodeFlow } from '../utils/oauth.js';

const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

export function createAuthCommands(): Command {
  const auth = new Command('auth').description('Manage authentication and API keys');

  auth
    .command('set')
    .description('Store API key for future use')
    .argument('<api-key>', 'Jules API key')
    .action(async (apiKey: string) => {
      if (!apiKey || apiKey.trim().length === 0) {
        throw new AuthError('API key cannot be empty');
      }

      await config.setApiKey(apiKey.trim());
      config.setAuthMethod('apikey');

      output(
        {
          status: 'success',
          message: 'API key stored successfully',
        },
        'json'
      );
    });

  auth
    .command('login')
    .description('Login via Google OAuth 2.0')
    .option('--client-id <id>', 'OAuth client ID')
    .option('--client-secret <secret>', 'OAuth client secret')
    .option('--device-code', 'Use device code flow instead of browser flow')
    .option('--scopes <scopes...>', 'OAuth scopes', DEFAULT_SCOPES)
    .action(async (options: {
      clientId?: string;
      clientSecret?: string;
      deviceCode?: boolean;
      scopes: string[];
    }) => {
      const clientId =
        options.clientId ||
        process.env.JULES_GOOGLE_CLIENT_ID ||
        (config.get('googleClientId') as string);
      const clientSecret =
        options.clientSecret ||
        process.env.JULES_GOOGLE_CLIENT_SECRET ||
        (config.get('googleClientSecret') as string);

      if (!clientId) {
        throw new CLIError(
          'OAuth client ID is required. Provide it via --client-id, JULES_GOOGLE_CLIENT_ID env var, or "config set googleClientId <id>".',
          ExitCode.INVALID_ARGS
        );
      }

      let tokens;
      if (options.deviceCode) {
        tokens = await runDeviceCodeFlow(clientId, options.scopes);
      } else {
        if (!clientSecret) {
          throw new CLIError(
            'OAuth client secret is required for browser flow. Provide it via --client-secret, JULES_GOOGLE_CLIENT_SECRET env var, or "config set googleClientSecret <secret>".',
            ExitCode.INVALID_ARGS
          );
        }
        tokens = await runBrowserOAuthFlow(clientId, clientSecret, options.scopes);
      }

      await config.setOAuthTokens(tokens);
      config.setAuthMethod('oauth');
      
      // Store client credentials if provided, for future refreshes
      if (options.clientId) config.set('googleClientId', options.clientId);
      if (options.clientSecret) config.set('googleClientSecret', options.clientSecret);

      output(
        {
          status: 'success',
          message: 'OAuth login successful',
          method: 'oauth',
        },
        'json'
      );
    });

  auth
    .command('status')
    .description('Check if API key is configured and valid')
    .option('--format <format>', 'Output format (json|pretty|quiet)', 'json')
    .action(async (options: { format: OutputFormat }) => {
      const authMethod = config.getAuthMethod();
      const endpoint = config.getApiEndpoint();

      let client;
      let authenticated = false;
      let error = null;
      let methodInfo: any = { method: authMethod };

      try {
        client = await getClient();
        const api = new SourcesAPI(client);
        await api.list(1); // Fetch just 1 item to verify authentication
        authenticated = true;
      } catch (err: any) {
        error = err.message;
      }

      if (authMethod === 'oauth') {
        const tokens = await config.getOAuthTokens();
        if (tokens) {
          methodInfo.expiresAt = new Date(tokens.expiresAt).toISOString();
        }
      }

      output(
        {
          authenticated,
          method: authMethod,
          endpoint,
          error,
          ...methodInfo,
          note: authenticated ? 'Credentials are valid.' : 'Credentials are present but invalid or API is unreachable.',
        },
        options.format
      );
    });

  auth
    .command('clear')
    .description('Remove stored credentials')
    .action(async () => {
      await config.clearApiKey();
      await config.clearOAuthTokens();
      config.setAuthMethod('apikey');

      output(
        {
          status: 'success',
          message: 'Credentials removed',
        },
        'json'
      );
    });

  auth
    .command('logout')
    .description('Remove stored credentials (alias for clear)')
    .action(async () => {
      await config.clearApiKey();
      await config.clearOAuthTokens();
      config.setAuthMethod('apikey');

      output(
        {
          status: 'success',
          message: 'Logged out successfully',
        },
        'json'
      );
    });

  return auth;
}
