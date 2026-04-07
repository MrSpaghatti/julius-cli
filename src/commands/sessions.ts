import { Command } from 'commander';
import ora from 'ora';
import { config } from '../config/index.js';
import { JulesAPIClient } from '../api/client.js';
import { SessionsAPI } from '../api/sessions.js';
import { output } from '../output/formatter.js';
import { AuthError, InvalidArgsError } from '../utils/errors.js';
import { inferGitHubRepo } from '../utils/git.js';
import { fetchAllPages } from '../utils/pagination.js';
import { waitCommand } from './wait.js';
import type { OutputFormat } from '../api/types.js';

async function getClient(): Promise<JulesAPIClient> {
  const apiKey = await config.getApiKey();
  if (!apiKey) {
    throw new AuthError(
      'No API key found.',
      'Set one with: jules-cli auth set <key>'
    );
  }
  return new JulesAPIClient(apiKey, config.getApiEndpoint());
}

export function createSessionsCommands(): Command {
  const sessions = new Command('sessions').description('Manage Jules sessions');

  sessions
    .command('create')
    .description('Create a new session')
    .option('-r, --repo <repo>', 'GitHub repository (owner/repo)')
    .requiredOption('-p, --prompt <prompt>', 'Task prompt for Jules')
    .option('-t, --title <title>', 'Session title')
    .option('-b, --branch <branch>', 'Starting branch (default: main)')
    .option('--auto-pr', 'Automatically create PR when done')
    .option('--require-approval', 'Require plan approval before execution')
    .option('-w, --wait', 'Block until session completes (implies --follow)')
    .option('--follow', 'Stream activity updates while waiting')
    .option('--format <format>', 'Output format (json|pretty|quiet|table)', config.get('defaultFormat') || 'json')
    .action(async (options: {
      repo?: string;
      prompt: string;
      title?: string;
      branch?: string;
      autoPr?: boolean;
      requireApproval?: boolean;
      wait?: boolean;
      follow?: boolean;
      format: OutputFormat;
    }) => {
      const client = await getClient();
      const api = new SessionsAPI(client);

      const repo = options.repo || inferGitHubRepo();

      if (options.prompt.length > 10000) {
        throw new InvalidArgsError('Prompt is too long (max 10,000 characters)');
      }

      // Parse repo into source format
      const repoParts = repo.split('/');
      if (repoParts.length !== 2) {
        throw new InvalidArgsError(
          'Repository must be in format: owner/repo'
        );
      }

      const sourceId = `github/${repo}`;
      const source = `sources/${sourceId}`;

      let spinner;
      if (options.format === 'pretty' && !options.wait && !options.follow) {
        spinner = ora(`Creating session for ${repo}...`).start();
      }

      const session = await api.create({
        prompt: options.prompt,
        title: options.title,
        sourceContext: {
          source,
          githubRepoContext: options.branch
            ? { startingBranch: options.branch }
            : undefined,
        },
        automationMode: options.autoPr ? 'AUTO_CREATE_PR' : 'NONE',
        requirePlanApproval: options.requireApproval || false,
      });

      if (spinner) {
        spinner.succeed(`Session created: ${session.id}`);
        console.log('');
      }

      output(session, options.format, 'session');

      if (options.wait || options.follow) {
        if (options.format === 'pretty') {
          console.log('\n--- Waiting for Session Completion ---\n');
        }
        await waitCommand(client, {
          sessionId: session.id,
          format: options.format,
          follow: true, // both --wait and --follow should follow
          interval: config.get('pollInterval') ? (config.get('pollInterval')! / 1000) : 5,
          timeout: config.get('maxPollAttempts') && config.get('pollInterval')
            ? (config.get('maxPollAttempts')! * config.get('pollInterval')! / 1000)
            : 600,
        });
      }
    });

  sessions
    .command('list')
    .description('List sessions')
    .option('--repo <repo>', 'Filter by repository (owner/repo)')
    .option('--state <states...>', 'Filter by state(s)')
    .option('--page-size <n>', 'Results per page (max 100)', config.get('defaultPageSize')?.toString() || '30')
    .option('--page-token <token>', 'Pagination token from previous response')
    .option('--all', 'Fetch all sessions (automatically follows nextPageToken)')
    .option('--format <format>', 'Output format (json|pretty|quiet|table)', config.get('defaultFormat') || 'json')
    .action(async (options: {
      repo?: string;
      state?: string[];
      pageSize: string;
      pageToken?: string;
      all?: boolean;
      format: OutputFormat;
    }) => {
      const client = await getClient();
      const api = new SessionsAPI(client);

      const pageSize = parseInt(options.pageSize, 10);
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new InvalidArgsError('Page size must be between 1 and 100');
      }

      let result;
      const hasFilters = !!options.repo || (options.state && options.state.length > 0);
      const shouldFetchAll = options.all || hasFilters;

      let spinner;
      if (options.format === 'pretty' && shouldFetchAll) {
        spinner = ora('Fetching all pages...').start();
      }

      if (shouldFetchAll) {
        result = await fetchAllPages((token, size) => api.list(size, token), 100);
      } else {
        result = await api.list(pageSize, options.pageToken);
      }

      if (spinner) {
        spinner.stop();
      }

      // Client-side filtering
      let filteredItems = result.items;

      if (options.repo) {
        const repoFilter = `github/${options.repo}`;
        filteredItems = filteredItems.filter((session) =>
          session.sourceContext.source.includes(repoFilter)
        );
      }

      if (options.state && options.state.length > 0) {
        const stateFilter = new Set(options.state);
        filteredItems = filteredItems.filter((session) =>
          session.state ? stateFilter.has(session.state) : false
        );
      }

      if (options.format === 'pretty') {
        console.log('Sessions:\n');
        for (const session of filteredItems) {
          output(session, 'pretty', 'session');
        }
        console.log(`Total: ${filteredItems.length} sessions`);
        if (!shouldFetchAll && result.nextPageToken) {
          console.log(`\nNext page: jules-cli sessions list --page-token ${result.nextPageToken}`);
        }
      } else {
        output(
          {
            sessions: filteredItems,
            nextPageToken: result.nextPageToken,
            totalSize: result.totalSize,
          },
          options.format,
          'session'
        );
      }
    });

  sessions
    .command('get')
    .description('Get session details')
    .argument('<session-id>', 'Session ID')
    .option('--format <format>', 'Output format (json|pretty|quiet|table)', config.get('defaultFormat') || 'json')
    .action(async (sessionId: string, options: { format: OutputFormat }) => {
      const client = await getClient();
      const api = new SessionsAPI(client);

      const session = await api.get(sessionId);

      output(session, options.format, 'session');
    });

  sessions
    .command('send')
    .description('Send a message to an active session')
    .argument('<session-id>', 'Session ID')
    .requiredOption('-m, --message <message>', 'Message to send')
    .option('--format <format>', 'Output format (json|pretty|quiet|table)', config.get('defaultFormat') || 'json')
    .action(async (
      sessionId: string,
      options: { message: string; format: OutputFormat }
    ) => {
      const client = await getClient();
      const api = new SessionsAPI(client);

      if (options.message.length > 10000) {
        throw new InvalidArgsError('Message is too long (max 10,000 characters)');
      }

      await api.sendMessage(sessionId, options.message);

      output(
        {
          status: 'success',
          message: 'Message sent successfully',
          sessionId,
        },
        options.format
      );
    });

  sessions
    .command('approve')
    .description('Approve the plan for a session')
    .argument('<session-id>', 'Session ID')
    .option('--format <format>', 'Output format (json|pretty|quiet|table)', config.get('defaultFormat') || 'json')
    .action(async (sessionId: string, options: { format: OutputFormat }) => {
      const client = await getClient();
      const api = new SessionsAPI(client);

      await api.approvePlan(sessionId);

      output(
        {
          status: 'success',
          message: 'Plan approved successfully',
          sessionId,
        },
        options.format
      );
    });

  sessions
    .command('cancel')
    .description('Cancel a running session')
    .argument('<session-id>', 'Session ID')
    .option('--format <format>', 'Output format (json|pretty|quiet|table)', config.get('defaultFormat') || 'json')
    .action(async (sessionId: string, options: { format: OutputFormat }) => {
      const client = await getClient();
      const api = new SessionsAPI(client);

      await api.cancel(sessionId);

      output(
        {
          status: 'success',
          message: 'Session cancelled successfully',
          sessionId,
        },
        options.format
      );
    });

  return sessions;
}
