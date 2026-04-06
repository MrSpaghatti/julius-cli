import { Command } from 'commander';
import { config } from '../config/index.js';
import { JulesAPIClient } from '../api/client.js';
import { ActivitiesAPI } from '../api/activities.js';
import { output } from '../output/formatter.js';
import { AuthError, InvalidArgsError } from '../utils/errors.js';
import { fetchAllPages } from '../utils/pagination.js';
import type { OutputFormat } from '../api/types.js';

async function getClient(): Promise<JulesAPIClient> {
  const apiKey = await config.getApiKey();
  if (!apiKey) {
    throw new AuthError(
      'No API key found. Set one with: jules-cli auth set <key>'
    );
  }
  return new JulesAPIClient(apiKey, config.getApiEndpoint());
}

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

      let result;
      const hasFilters = !!options.author || (options.type && options.type.length > 0);
      const shouldFetchAll = options.all || hasFilters;

      if (shouldFetchAll) {
        if (hasFilters && !options.all && options.format === 'pretty') {
          console.log('Fetching all pages for accurate filtering...');
        }
        result = await fetchAllPages((token, size) => api.list(sessionId, size, token), 100);
      } else {
        result = await api.list(sessionId, pageSize, options.pageToken);
      }

      // Client-side filtering
      let filteredItems = result.items;

      if (options.type && options.type.length > 0) {
        const typeFilter = new Set(options.type);
        filteredItems = filteredItems.filter((activity) =>
          typeFilter.has(activity.type)
        );
      }

      if (options.author) {
        filteredItems = filteredItems.filter(
          (activity) => activity.author === options.author
        );
      }

      if (options.format === 'pretty') {
        console.log(`Activities for session ${sessionId}:\n`);
        for (const activity of filteredItems) {
          output(activity, 'pretty', 'activity');
        }
        console.log(`Total: ${filteredItems.length} activities`);
        if (!shouldFetchAll && result.nextPageToken) {
          console.log(
            `\nNext page: jules-cli activities list ${sessionId} --page-token ${result.nextPageToken}`
          );
        }
      } else {
        output(
          {
            sessionId,
            activities: filteredItems,
            nextPageToken: result.nextPageToken,
            totalSize: filteredItems.length,
          },
          options.format,
          'activity'
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

      output(activity, options.format, 'activity');
    });

  return activities;
}
