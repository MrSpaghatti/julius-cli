import { Command } from 'commander';
import { config } from '../config/index.js';
import { JulesAPIClient } from '../api/client.js';
import { waitCommand } from './wait.js';
import { handleError, CLIError } from '../utils/errors.js';
import type { SessionState, OutputFormat } from '../api/types.js';

export function createWaitCommand(): Command {
  const wait = new Command('wait');

  wait
    .description('Wait for a session to reach a specific state (blocks until completion)')
    .argument('<session-id>', 'Session ID to wait for')
    .option('-t, --timeout <seconds>', 'Timeout in seconds (default: 600)', config.get('maxPollAttempts') ? (config.get('maxPollAttempts')! * (config.get('pollInterval')! / 1000)).toString() : '600')
    .option('-i, --interval <seconds>', 'Poll interval in seconds (default: 5)', (config.get('pollInterval')! / 1000).toString() || '5')
    .option('-s, --state <state>', 'Wait for specific state (default: COMPLETED, FAILED, or CANCELLED)')
    .option('-f, --format <format>', 'Output format: json, pretty, quiet', config.get('defaultFormat') || 'json')
    .option('--follow', 'Stream activity updates while waiting')
    .option('--verbose', 'Enable verbose logging')
    .action(async (sessionId: string, options: any) => {
      try {
        const apiKey = await config.getApiKey();
        const apiEndpoint = config.getApiEndpoint();

        if (!apiKey) {
          throw new CLIError('API key not set. Run: jules-cli auth set <api-key>', 3);
        }

        const client = new JulesAPIClient(apiKey, apiEndpoint);

        // Parse timeout and interval
        const timeout = parseInt(options.timeout, 10);
        const interval = parseInt(options.interval, 10);

        if (isNaN(timeout) || timeout <= 0) {
          throw new CLIError('Timeout must be a positive number', 2);
        }

        if (isNaN(interval) || interval <= 0) {
          throw new CLIError('Interval must be a positive number', 2);
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
            2
          );
        }

        await waitCommand(client, {
          sessionId,
          timeout,
          interval,
          state: options.state as SessionState | undefined,
          format: options.format as OutputFormat,
          verbose: !!options.verbose,
          follow: !!options.follow,
        });
      } catch (error) {
        handleError(error);
      }
    });

  return wait;
}
