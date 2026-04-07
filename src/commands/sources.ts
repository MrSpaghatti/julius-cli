import { Command } from 'commander';
import ora from 'ora';
import { config } from '../config/index.js';
import { SourcesAPI } from '../api/sources.js';
import { output } from '../output/formatter.js';
import { InvalidArgsError } from '../utils/errors.js';
import { fetchAllPages } from '../utils/pagination.js';
import { getClient } from '../utils/client.js';
import type { OutputFormat } from '../api/types.js';

export function createSourcesCommands(): Command {
  const sources = new Command('sources').description('Manage GitHub repositories');

  sources
    .command('list')
    .description('List all connected repositories')
    .option('--page-size <n>', 'Results per page (max 100)', config.get('defaultPageSize')?.toString() || '30')
    .option('--page-token <token>', 'Pagination token from previous response')
    .option('--all', 'Fetch all repositories (automatically follows nextPageToken)')
    .option('--format <format>', 'Output format (json|pretty|quiet|table)', config.get('defaultFormat') || 'json')
    .action(async (options: {
      pageSize: string;
      pageToken?: string;
      all?: boolean;
      format: OutputFormat;
    }) => {
      const client = await getClient();
      const api = new SourcesAPI(client);

      const pageSize = parseInt(options.pageSize, 10);
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new InvalidArgsError('Page size must be between 1 and 100');
      }

      let spinner;
      if (options.format === 'pretty' && options.all) {
        spinner = ora('Fetching all repositories...').start();
      }

      let result;
      if (options.all) {
        result = await fetchAllPages((token, size) => api.list(size, token), 100);
      } else {
        result = await api.list(pageSize, options.pageToken);
      }

      if (spinner) {
        spinner.stop();
      }

      if (options.format === 'pretty') {
        console.log('Connected Repositories:\n');
        for (const source of result.items) {
          output(source, 'pretty', 'source');
        }
        if (result.totalSize) {
          console.log(`Total: ${result.totalSize} repositories`);
        }
        if (!options.all && result.nextPageToken) {
          console.log(`\nNext page: jules-cli sources list --page-token ${result.nextPageToken}`);
        }
      } else {
        output(
          {
            sources: result.items,
            nextPageToken: result.nextPageToken,
            totalSize: result.totalSize,
          },
          options.format,
          'source'
        );
      }
    });

  sources
    .command('get')
    .description('Get details for a specific source')
    .argument('<source-id>', 'Source ID (e.g., github/owner/repo)')
    .option('--format <format>', 'Output format (json|pretty|quiet|table)', config.get('defaultFormat') || 'json')
    .action(async (sourceId: string, options: { format: OutputFormat }) => {
      const client = await getClient();
      const api = new SourcesAPI(client);

      const source = await api.get(sourceId);

      output(source, options.format, 'source');
    });

  return sources;
}
