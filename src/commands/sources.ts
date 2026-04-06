import { Command } from 'commander';
import { config } from '../config/index.js';
import { JulesAPIClient } from '../api/client.js';
import { SourcesAPI } from '../api/sources.js';
import { output } from '../output/formatter.js';
import { AuthError } from '../utils/errors.js';
import type { OutputFormat } from '../api/types.js';

function getClient(): JulesAPIClient {
  const apiKey = config.getApiKey();
  if (!apiKey) {
    throw new AuthError(
      'No API key found. Set one with: jules-cli auth set <key>'
    );
  }
  return new JulesAPIClient(apiKey, config.getApiEndpoint());
}

export function createSourcesCommands(): Command {
  const sources = new Command('sources').description('Manage GitHub repositories');

  sources
    .command('list')
    .description('List all connected repositories')
    .option('--page-size <n>', 'Results per page (max 100)', '30')
    .option('--page-token <token>', 'Pagination token from previous response')
    .option('--format <format>', 'Output format (json|pretty|quiet)', 'json')
    .action(async (options: {
      pageSize: string;
      pageToken?: string;
      format: OutputFormat;
    }) => {
      const client = getClient();
      const api = new SourcesAPI(client);

      const pageSize = parseInt(options.pageSize, 10);
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new Error('Page size must be between 1 and 100');
      }

      const result = await api.list(pageSize, options.pageToken);

      if (options.format === 'pretty') {
        console.log('Connected Repositories:\n');
        for (const source of result.items) {
          const formatted = output(source, 'pretty', 'source');
          console.log(formatted);
        }
        if (result.totalSize) {
          console.log(`Total: ${result.totalSize} repositories`);
        }
        if (result.nextPageToken) {
          console.log(`\nNext page: jules-cli sources list --page-token ${result.nextPageToken}`);
        }
      } else {
        output(
          {
            sources: result.items,
            nextPageToken: result.nextPageToken,
            totalSize: result.totalSize,
          },
          options.format
        );
      }
    });

  sources
    .command('get')
    .description('Get details for a specific source')
    .argument('<source-id>', 'Source ID (e.g., github/owner/repo)')
    .option('--format <format>', 'Output format (json|pretty|quiet)', 'json')
    .action(async (sourceId: string, options: { format: OutputFormat }) => {
      const client = getClient();
      const api = new SourcesAPI(client);

      const source = await api.get(sourceId);

      output(source, options.format, 'source');
    });

  return sources;
}
