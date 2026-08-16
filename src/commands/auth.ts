import { Command } from 'commander';
import { config } from '../config/index.js';
import { output } from '../output/formatter.js';
import { AuthError } from '../utils/errors.js';
import { SourcesAPI } from '../api/sources.js';
import type { OutputFormat } from '../cli/types.js';
import { getClient } from '../utils/client.js';

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
    .command('status')
    .description('Check if API key is configured and valid')
    .option('--format <format>', 'Output format (json|pretty|quiet)', 'json')
    .action(async (options: { format: OutputFormat }) => {
      const authMethod = config.getAuthMethod();
      const endpoint = config.getApiEndpoint();

      let authenticated = false;
      let error = null;
      const methodInfo: { method: string } = { method: authMethod };

      try {
        const client = await getClient();
        const api = new SourcesAPI(client);
        await api.list(1); // Fetch just 1 item to verify authentication
        authenticated = true;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }

      output(
        {
          authenticated,
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