import { Command } from 'commander';
import { config } from '../config/index.js';
import { JulesAPIClient } from '../api/client.js';
import { SessionsAPI } from '../api/sessions.js';
import { output } from '../output/formatter.js';
import { AuthError, InvalidArgsError } from '../utils/errors.js';
import { inferGitHubRepo } from '../utils/git.js';
import { fetchAllPages } from '../utils/pagination.js';
import type { OutputFormat, SessionState } from '../api/types.js';

async function getClient(): Promise<JulesAPIClient> {
  const apiKey = await config.getApiKey();
  if (!apiKey) {
    throw new AuthError(
      'No API key found. Set one with: jules-cli auth set <key>'
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
    .option('--format <format>', 'Output format (json|pretty|quiet)', config.get('defaultFormat') || 'json')
    .action(async (options: {
      repo?: string;
      prompt: string;
      title?: string;
      branch?: string;
      autoPr?: boolean;
      requireApproval?: boolean;
      format: OutputFormat;
    }) => {
      const client = await getClient();
      const api = new SessionsAPI(client);

      const repo = options.repo || inferGitHubRepo();

      // Parse repo into source format
      const repoParts = repo.split('/');
      if (repoParts.length !== 2) {
        throw new InvalidArgsError(
          'Repository must be in format: owner/repo'
        );
      }

      const sourceId = `github/${repo}`;
      const source = `sources/${sourceId}`;

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

      output(session, options.format, 'session');
    });

  sessions
    .command('list')
    .description('List sessions')
    .option('--repo <repo>', 'Filter by repository (owner/repo)')
    .option('--state <states...>', 'Filter by state(s)')
    .option('--page-size <n>', 'Results per page (max 100)', config.get('defaultPageSize')?.toString() || '30')
    .option('--page-token <token>', 'Pagination token from previous response')
    .option('--all', 'Fetch all sessions (automatically follows nextPageToken)')
    .option('--format <format>', 'Output format (json|pretty|quiet)', config.get('defaultFormat') || 'json')
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
      if (options.all) {
        result = await fetchAllPages((token, size) => api.list(size, token), 100);
      } else {
        result = await api.list(pageSize, options.pageToken);
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
        if (!options.all && result.nextPageToken) {
          console.log(`\nNext page: jules-cli sessions list --page-token ${result.nextPageToken}`);
        }
      } else {
        output(
          {
            sessions: filteredItems,
            nextPageToken: result.nextPageToken,
            totalSize: filteredItems.length,
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
    .option('--format <format>', 'Output format (json|pretty|quiet)', config.get('defaultFormat') || 'json')
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
    .option('--format <format>', 'Output format (json|pretty|quiet)', config.get('defaultFormat') || 'json')
    .action(async (
      sessionId: string,
      options: { message: string; format: OutputFormat }
    ) => {
      const client = await getClient();
      const api = new SessionsAPI(client);

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
    .option('--format <format>', 'Output format (json|pretty|quiet)', config.get('defaultFormat') || 'json')
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
    .option('--format <format>', 'Output format (json|pretty|quiet)', config.get('defaultFormat') || 'json')
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
