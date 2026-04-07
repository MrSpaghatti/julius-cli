import { Command } from 'commander';
import { config } from '../config/index.js';
import { waitCommand } from './wait.js';
import { handleError, CLIError, ExitCode } from '../utils/errors.js';
import type { SessionState, OutputFormat } from '../api/types.js';
import { getClient } from '../utils/client.js';

export function createWaitCommand(): Command {
  const wait = new Command('wait');

  const defaultPollInterval = config.getRequired('pollInterval');
  const defaultMaxPollAttempts = config.getRequired('maxPollAttempts');
  const defaultTimeout = (defaultMaxPollAttempts * (defaultPollInterval / 1000)).toString();

  wait
    .description('Wait for one or more sessions to reach a specific state (blocks until completion)')
    .argument('<session-ids...>', 'Session IDs to wait for')
    .option('-t, --timeout <seconds>', 'Timeout in seconds (default: 600)', defaultTimeout)
    .option('-i, --interval <seconds>', 'Poll interval in seconds (default: 5)', (defaultPollInterval / 1000).toString())
    .option('-s, --state <state>', 'Wait for specific state (default: COMPLETED, FAILED, or CANCELLED)')
    .option('-f, --format <format>', 'Output format: json, pretty, quiet, table', config.get('defaultFormat') || 'json')
    .option('--follow', 'Stream activity updates while waiting')
    .option('--activity-type <types...>', 'Filter streamed activities by type (PLAN, MESSAGE, PROGRESS, ERROR)')
    .option('--verbose', 'Enable verbose logging')
    .action(async (sessionIds: string[], options: any) => {
      const client = await getClient();

      // Parse timeout and interval
      const timeout = parseInt(options.timeout, 10);
      const interval = parseInt(options.interval, 10);

      if (isNaN(timeout) || timeout <= 0) {
        throw new CLIError('Timeout must be a positive number', ExitCode.INVALID_ARGS);
      }

      if (isNaN(interval) || interval <= 0) {
        throw new CLIError('Interval must be a positive number', ExitCode.INVALID_ARGS);
      }

      // Validate state if provided
      const validStates: SessionState[] = [
        'PENDING',
        'PLANNING',
        'AWAITING_APPROVAL',
        'EXECUTING',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
      ];

      if (options.state && !validStates.includes(options.state as SessionState)) {
        throw new CLIError(
          `Invalid state: ${options.state}. Valid states: ${validStates.join(', ')}`,
          ExitCode.INVALID_ARGS
        );
      }

      // If multiple sessions, we run them in parallel
      const waitPromises = sessionIds.map(sessionId => 
        waitCommand(client, {
          sessionId,
          timeout,
          interval,
          state: options.state as SessionState | undefined,
          format: options.format as OutputFormat,
          verbose: !!options.verbose,
          follow: !!options.follow,
          activityTypes: options.activityType,
          noSpinner: sessionIds.length > 1,
        })
      );

      await Promise.all(waitPromises);
    });

  return wait;
}
