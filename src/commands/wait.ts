import { JulesAPIClient } from '../api/client.js';
import { SessionsAPI } from '../api/sessions.js';
import { ActivitiesAPI } from '../api/activities.js';
import { Session, SessionState, OutputFormat } from '../api/types.js';
import { output } from '../output/formatter.js';
import { CLIError, ExitCode } from '../utils/errors.js';
import { fetchAllPages } from '../utils/pagination.js';
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
        console.error(`[${attempts}] Session ${sessionId} state: ${session.state} (${Math.floor(elapsed / 1000)}s elapsed)`);
      } else if (spinner) {
        spinner.text = `Waiting for session ${sessionId}... (state: ${session.state}, ${Math.floor(elapsed / 1000)}s elapsed)`;
      }

      // If follow mode is on, fetch and output new activities
      if (follow) {
        try {
          // Fetch all activities across all pages
          const result = await fetchAllPages((token, size) => activitiesAPI.list(sessionId, size, token), 100);
          const allActivities = result.items;

          // Determine which ones are new
          let newActivities = [];
          if (lastActivityId === null) {
            newActivities = allActivities;
          } else {
            const lastIndex = allActivities.findIndex(a => a.id === lastActivityId);
            if (lastIndex !== -1) {
              newActivities = allActivities.slice(lastIndex + 1);
            } else {
              // If we somehow missed the last activity, just show everything current.
              newActivities = allActivities;
            }
          }

          // Output new activities in chronological order
          for (const activity of newActivities) {
            output(activity, format, 'activity');
            lastActivityId = activity.id;
          }
        } catch (actError) {
          if (verbose) {
            console.error('Error fetching activities:', actError);
          }
          // Don't fail the whole wait command just because activity fetch failed once
        }
      }

      // Check if we've reached target state
      if (session.state && targetStates.includes(session.state)) {
        if (spinner) spinner.succeed(`Session ${sessionId} reached state: ${session.state}`);

        // Output final session details if not in quiet mode
        if (format !== 'quiet') {
          if (format === 'pretty') console.log('\nFinal Session State:');
          output(session, format, 'session');
        }
        return;
      }

      // Wait before next poll
      await sleep(intervalMs);
    } catch (error: any) {
      // If it's a transient error (e.g. network), we might want to retry a few times 
      // even beyond the client's internal retries.
      if (verbose) {
        console.error(`Poll attempt ${attempts} failed: ${error.message}`);
      }
      
      // If it's a 404, the session is gone, so stop.
      if (error.status === 404) {
        if (spinner) spinner.fail();
        throw error;
      }

      // For other errors, wait and continue unless we've failed too many times in a row
      await sleep(intervalMs);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
