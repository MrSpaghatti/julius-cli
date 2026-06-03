import { Command } from 'commander';
import { config } from '../config/index.js';
import { ActivitiesAPI } from '../api/activities.js';
import { outputFormatted } from '../output/formatter.js';
import { InvalidArgsError } from '../utils/errors.js';
import { fetchAllPages } from '../utils/pagination.js';
import { getClient } from '../utils/client.js';
import type { OutputFormat } from '../cli/types.js';
import { Output } from '../output/manager.js';

export function createActivitiesCommands(): Command {
  const activities = new Command('activities').description('View session activities');

  activities
    .command('list')
    .description('List activities for a session')
    .argument('<session-id>', 'Session ID')
    .option('--page-size <n>', 'Results per page (max 100)', config.get('defaultPageSize')?.toString() || '30')
    .option('--page-token <token>', 'Pagination token from previous response')
    .option('--all', 'Fetch all activities (automatically follows nextPageToken)')
    .option('--type <types...>', 'Filter by activity type(s)')
    .option('--author <author>', 'Filter by author (USER|AGENT)')
    .option('--format <format>', 'Output format (json|pretty|quiet)', config.get('defaultFormat') || 'json')
    .action(async (
      sessionId: string,
      options: {
        pageSize: string;
        pageToken?: string;
        all?: boolean;
        type?: string[];
        author?: string;
        format: OutputFormat;
      }
    ) => {
      const client = await getClient();
      const api = new ActivitiesAPI(client);

      const pageSize = parseInt(options.pageSize, 10);
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new InvalidArgsError('Page size must be between 1 and 100');
      }

      const filters: string[] = [];
      if (options.type && options.type.length > 0) {
        const typeFilters = options.type
          .map((t) => `type = "${t}"`)
          .join(' OR ');
        filters.push(`(${typeFilters})`);
      }
      if (options.author) {
        filters.push(`author = "${options.author}"`);
      }
      const filter = filters.length > 0 ? filters.join(' AND ') : undefined;

      let result;
      const shouldFetchAll = options.all || (options.type && options.type.length > 0) || options.author;

      if (shouldFetchAll) {
        result = await fetchAllPages(
          (token, size) => api.list(sessionId, size, token, filter),
          100
        );
      } else {
        result = await api.list(sessionId, pageSize, options.pageToken, filter);
      }

      const items = result.items;

      if (options.format === 'pretty') {
        Output.info(`Activities for session ${sessionId}:\n`);
        for (const activity of items) {
          outputFormatted({ kind: 'activity', activity }, 'pretty');
        }
        Output.info(`Total: ${items.length} activities`);
        if (!shouldFetchAll && result.nextPageToken) {
          Output.info(
            `\nNext page: julius-cli activities list ${sessionId} --page-token ${result.nextPageToken}`
          );
        }
      } else {
        outputFormatted(
          {
            kind: 'activities',
            sessionId,
            activities: items,
            nextPageToken: result.nextPageToken,
            totalSize: result.totalSize,
          },
          options.format
        );
      }
    });

  activities
    .command('get')
    .description('Get details for a specific activity')
    .argument('<session-id>', 'Session ID')
    .argument('<activity-id>', 'Activity ID')
    .option('--format <format>', 'Output format (json|pretty|quiet)', 'json')
    .action(async (
      sessionId: string,
      activityId: string,
      options: { format: OutputFormat }
    ) => {
      const client = await getClient();
      const api = new ActivitiesAPI(client);

      const activity = await api.get(sessionId, activityId);

      outputFormatted({ kind: 'activity', activity }, options.format);
    });

  return activities;
}
