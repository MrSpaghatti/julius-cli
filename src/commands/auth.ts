import { Command } from 'commander';
import { config } from '../config/index.js';
import { output } from '../output/formatter.js';
import { AuthError } from '../utils/errors.js';
import { JulesAPIClient } from '../api/client.js';
import type { OutputFormat } from '../api/types.js';

export function createAuthCommands(): Command {
  const auth = new Command('auth').description('Manage authentication and API keys');

  auth
    .command('set')
    .description('Store API key for future use')
    .argument('<api-key>', 'Jules API key')
    .action((apiKey: string) => {
      if (!apiKey || apiKey.trim().length === 0) {
        throw new AuthError('API key cannot be empty');
      }

      config.set('apiKey', apiKey.trim());

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
      const apiKey = config.getApiKey();
      const source = config.getApiKeySource();
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

      output(
        {
          authenticated: true,
          source,
          endpoint,
          note: 'Run "jules-cli sources list" to verify API key connectivity.',
        },
        options.format
      );
    });

  auth
    .command('clear')
    .description('Remove stored API key')
    .action(() => {
      config.delete('apiKey');

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
