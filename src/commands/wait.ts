import { JulesAPIClient } from '../api/client.js';
import { SessionsAPI } from '../api/sessions.js';
import { ActivitiesAPI } from '../api/activities.js';
import { Session, SessionState, OutputFormat } from '../api/types.js';
import { output } from '../output/formatter.js';
import { CLIError, ExitCode } from '../utils/errors.js';
import ora from 'ora';

export interface WaitCommandOptions {
  sessionId: string;
  timeout?: number; // seconds, default 600 (10 minutes)
  interval?: number; // seconds, default 5
  state?: SessionState; // wait for specific state, default COMPLETED|FAILED|CANCELLED
  format?: OutputFormat;
  verbose?: boolean;
  follow?: boolean;
}

const TERMINAL_STATES: SessionState[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

export async function waitCommand(client: JulesAPIClient, options: WaitCommandOptions): Promise<void> {
  const {
    sessionId,
    timeout = 600,
    interval = 5,
    state,
    format = 'json',
    verbose = false,
    follow = false,
  } = options;

  const sessionsAPI = new SessionsAPI(client);
  const activitiesAPI = new ActivitiesAPI(client);
  const startTime = Date.now();
  const timeoutMs = timeout * 1000;
  const intervalMs = interval * 1000;

  // Target states to wait for
  const targetStates = state ? [state] : TERMINAL_STATES;

  let spinner: any;
  if (format === 'pretty' && !verbose && !follow) {
    spinner = ora(`Waiting for session ${sessionId} to reach state: ${targetStates.join(' or ')}`).start();
  }

  let lastSession: Session | null = null;
  let attempts = 0;
  let lastActivityId: string | null = null;

  while (true) {
    attempts++;
    const elapsed = Date.now() - startTime;

    // Check timeout
    if (elapsed >= timeoutMs) {
      if (spinner) spinner.fail();
      throw new CLIError(
        `Timeout waiting for session ${sessionId} after ${timeout} seconds. Last state: ${lastSession?.state || 'UNKNOWN'}`,
        ExitCode.TIMEOUT
      );
    }

    try {
      // Poll session state
      const session = await sessionsAPI.get(sessionId);
      lastSession = session;

      if (verbose) {
        console.error(`[${attempts}] Session ${sessionId} state: ${session.state} (${elapsed / 1000}s elapsed)`);
      } else if (spinner) {
        spinner.text = `Waiting for session ${sessionId}... (state: ${session.state}, ${Math.floor(elapsed / 1000)}s elapsed)`;
      }

      // If follow mode is on, fetch and output new activities
      if (follow) {
        try {
          const activitiesResult = await activitiesAPI.list(sessionId, 100);
          const newActivities = [];
          
          if (lastActivityId === null) {
            newActivities.push(...activitiesResult.items);
          } else {
            const lastIndex = activitiesResult.items.findIndex(a => a.id === lastActivityId);
            if (lastIndex !== -1) {
              newActivities.push(...activitiesResult.items.slice(lastIndex + 1));
            } else {
              // If we can't find the last activity, just take all (might happen if many activities)
              newActivities.push(...activitiesResult.items);
            }
          }

          for (const activity of newActivities) {
            output(activity, format, 'activity');
            lastActivityId = activity.id;
          }
        } catch (actError) {
          if (verbose) {
            console.error('Error fetching activities:', actError);
          }
        }
      }

      // Check if we've reached target state
      if (session.state && targetStates.includes(session.state)) {
        if (spinner) spinner.succeed(`Session ${sessionId} reached state: ${session.state}`);

        // Output final session details if not in quiet mode
        if (format !== 'quiet') {
          console.log('\nFinal Session State:');
          output(session, format, 'session');
        }
        return;
      }

      // Wait before next poll
      await sleep(intervalMs);
    } catch (error) {
      if (spinner) spinner.fail();
      throw error;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
