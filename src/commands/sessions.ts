import { Command } from 'commander';
import ora from 'ora';
import { config } from '../config/index.js';
import { SessionsAPI } from '../api/sessions.js';
import { output } from '../output/formatter.js';
import { InvalidArgsError } from '../utils/errors.js';
import {
  inferRepo,
  pullSessionChanges,
  diffSessionChanges,
} from '../utils/git.js';
import { fetchAllPages } from '../utils/pagination.js';
import { getClient } from '../utils/client.js';
import { waitCommand } from './wait.js';
import type { Session, OutputFormat } from '../api/types.js';

export interface CreateSessionParams {
  repo?: string;
  prompt: string;
  title?: string;
  branch?: string;
  autoPr?: boolean;
  requireApproval?: boolean;
  wait?: boolean;
  follow?: boolean;
  format: OutputFormat;
}

export async function handleCreateSession(options: CreateSessionParams) {
  const client = await getClient();
  const api = new SessionsAPI(client);

  if (options.prompt.length > 10000) {
    throw new InvalidArgsError('Prompt is too long (max 10,000 characters)');
  }

  let provider = 'github';
  let repo = '';

  if (options.repo) {
    const parts = options.repo.split('/');
    if (parts.length === 3) {
      provider = parts[0];
      repo = `${parts[1]}/${parts[2]}`;
    } else if (parts.length === 2) {
      repo = options.repo;
    } else {
      throw new InvalidArgsError('Repository must be in format: [provider/]owner/repo');
    }
  } else {
    const inferred = inferRepo();
    provider = inferred.provider;
    repo = inferred.repo;
  }

  const sourceId = `${provider}/${repo}`;
  const source = `sources/${sourceId}`;

  let spinner;
  if (options.format === 'pretty' && !options.wait && !options.follow) {
    spinner = ora(`Creating session for ${sourceId}...`).start();
  }

  const sourceContext: Session['sourceContext'] = { source };
  if (options.branch) {
    if (provider === 'gitlab') {
      sourceContext.gitlabRepoContext = { startingBranch: options.branch };
    } else if (provider === 'bitbucket') {
      sourceContext.bitbucketRepoContext = { startingBranch: options.branch };
    } else {
      sourceContext.githubRepoContext = { startingBranch: options.branch };
    }
  }

  const session = await api.create({
    prompt: options.prompt,
    title: options.title,
    sourceContext,
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
      interval: config.getRequired('pollInterval') / 1000,
      timeout: (config.getRequired('maxPollAttempts') * config.getRequired('pollInterval')) / 1000,
    });
  }
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
    .option(
      '--format <format>',
      'Output format (json|pretty|quiet|table)',
      config.get('defaultFormat') || 'json'
    )
    .action(handleCreateSession);

  sessions
    .command('list')
    .description('List sessions')
    .option('--repo <repo>', 'Filter by repository (owner/repo)')
    .option('--state <states...>', 'Filter by state(s)')
    .option(
      '--page-size <n>',
      'Results per page (max 100)',
      config.get('defaultPageSize')?.toString() || '30'
    )
    .option('--page-token <token>', 'Pagination token from previous response')
    .option(
      '--all',
      'Fetch all sessions (automatically follows nextPageToken)'
    )
    .option(
      '--format <format>',
      'Output format (json|pretty|quiet|table)',
      config.get('defaultFormat') || 'json'
    )
    .action(
      async (options: {
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

        const filters: string[] = [];
        if (options.repo) {
          if (options.repo.includes('/')) {
            const parts = options.repo.split('/');
            if (parts.length === 3) {
              // provider/owner/repo
              filters.push(`source = "sources/${options.repo}"`);
            } else if (parts.length === 2) {
              // owner/repo
              let provider = 'github';
              try {
                const inferred = inferRepo();
                if (inferred.repo === options.repo) {
                  provider = inferred.provider;
                }
              } catch {
                // Ignore
              }
              filters.push(`source = "sources/${provider}/${options.repo}"`);
            }
          } else {
             filters.push(`source = "sources/${options.repo}"`);
          }
        }
        if (options.state && options.state.length > 0) {
          const stateFilters = options.state
            .map((s) => `state = "${s}"`)
            .join(' OR ');
          filters.push(`(${stateFilters})`);
        }
        const filter = filters.length > 0 ? filters.join(' AND ') : undefined;

        let result;
        const shouldFetchAll = !!options.all;

        let spinner;
        if (options.format === 'pretty' && shouldFetchAll) {
          spinner = ora('Fetching all pages...').start();
        }

        if (shouldFetchAll) {
          result = await fetchAllPages(
            (token, size) => api.list(size, token, filter),
            100
          );
        } else {
          result = await api.list(pageSize, options.pageToken, filter);
        }

        if (spinner) {
          spinner.stop();
        }

        const items = result.items;

        if (options.format === 'pretty') {
          console.log('Sessions:\n');
          for (const session of items) {
            output(session, 'pretty', 'session');
          }
          console.log(`Total: ${items.length} sessions`);
          if (!shouldFetchAll && result.nextPageToken) {
            console.log(
              `\nNext page: julius-cli sessions list --page-token ${result.nextPageToken}`
            );
          }
        } else {
          output(
            {
              sessions: items,
              nextPageToken: result.nextPageToken,
              totalSize: result.totalSize,
            },
            options.format,
            'session'
          );
        }
      }
    );

  sessions
    .command('get')
    .description('Get session details')
    .argument('<session-id>', 'Session ID')
    .option(
      '--format <format>',
      'Output format (json|pretty|quiet|table)',
      config.get('defaultFormat') || 'json'
    )
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
    .option(
      '--format <format>',
      'Output format (json|pretty|quiet|table)',
      config.get('defaultFormat') || 'json'
    )
    .action(
      async (
        sessionId: string,
        options: { message: string; format: OutputFormat }
      ) => {
        const client = await getClient();
        const api = new SessionsAPI(client);

        if (options.message.length > 10000) {
          throw new InvalidArgsError(
            'Message is too long (max 10,000 characters)'
          );
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
      }
    );

  sessions
    .command('approve')
    .description('Approve the plan for a session')
    .argument('<session-id>', 'Session ID')
    .option(
      '--format <format>',
      'Output format (json|pretty|quiet|table)',
      config.get('defaultFormat') || 'json'
    )
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
    .option(
      '--format <format>',
      'Output format (json|pretty|quiet|table)',
      config.get('defaultFormat') || 'json'
    )
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

  sessions
    .command('pull')
    .description('Fetch and checkout the branch/PR created by a session')
    .argument('<session-id>', 'Session ID')
    .action(async (sessionId: string) => {
      const client = await getClient();
      const api = new SessionsAPI(client);

      const session = await api.get(sessionId);

      if (session.state !== 'COMPLETED') {
        throw new Error(
          `Session ${sessionId} is not in COMPLETED state (Current: ${session.state})`
        );
      }

      const output = session.outputs?.[0];
      const branchName = output?.branch?.name;

      if (!branchName) {
        throw new Error(`No branch output found for session ${sessionId}`);
      }

      // Validate and parse source format
      const sourceMatch = session.sourceContext.source.match(/^sources\/(.+)$/);
      if (!sourceMatch || !sourceMatch[1]) {
        throw new InvalidArgsError(`Invalid source format: ${session.sourceContext.source}`);
      }
      const repo = sourceMatch[1];

      pullSessionChanges(repo, branchName);
    });

  sessions
    .command('diff')
    .description('Show local diff of the changes proposed in a session')
    .argument('<session-id>', 'Session ID')
    .action(async (sessionId: string) => {
      const client = await getClient();
      const api = new SessionsAPI(client);

      const session = await api.get(sessionId);

      if (session.state !== 'COMPLETED') {
        throw new Error(
          `Session ${sessionId} is not in COMPLETED state (Current: ${session.state}). Can only diff completed sessions.`
        );
      }

      const output = session.outputs?.[0];
      const branchName = output?.branch?.name;

      if (!branchName) {
        throw new Error(`No branch output found for session ${sessionId}`);
      }

      diffSessionChanges(branchName);
    });

  return sessions;
}
