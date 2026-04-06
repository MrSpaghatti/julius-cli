import { Command } from 'commander';
import { config } from '../config/index.js';
import { output } from '../output/formatter.js';
import { AuthError } from '../utils/errors.js';
import { JulesAPIClient } from '../api/client.js';
import { SourcesAPI } from '../api/sources.js';
import type { OutputFormat } from '../api/types.js';

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
      const apiKey = await config.getApiKey();
      const source = await config.getApiKeySource();
      const endpoint = config.getApiEndpoint();

      if (!apiKey) {
        output(
          {
            authenticated: false,
            source: 'none',
            endpoint,
          },
          options.format
        );
        return;
      }

      // Ping the API to ensure the key is valid
      let valid = false;
      let error = null;
      try {
        const client = new JulesAPIClient(apiKey, endpoint);
        const api = new SourcesAPI(client);
        await api.list(1); // Fetch just 1 item to verify authentication
        valid = true;
      } catch (err: any) {
        error = err.message;
      }

      output(
        {
          authenticated: valid,
          source,
          endpoint,
          error,
          note: valid ? 'API key is valid.' : 'API key is present but invalid or API is unreachable.',
        },
        options.format
      );
    });

  auth
    .command('clear')
    .description('Remove stored API key')
    .action(async () => {
      await config.clearApiKey();

      output(
        {
          status: 'success',
          message: 'API key removed',
        },
        'json'
      );
    });

  return auth;
}
