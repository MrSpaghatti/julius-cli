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
        console.error(`[${attempts}] Session ${sessionId} state: ${session.state} (${Math.floor(elapsed / 1000)}s elapsed)`);
      } else if (spinner) {
        spinner.text = `Waiting for session ${sessionId}... (state: ${session.state}, ${Math.floor(elapsed / 1000)}s elapsed)`;
      }

      // If follow mode is on, fetch and output new activities
      if (follow) {
        try {
          // Fetch activities, possibly multiple pages if there are many
          let allNewActivities = [];
          let currentNextPageToken = undefined;
          let foundLastActivity = false;

          do {
            const activitiesResult = await activitiesAPI.list(sessionId, 100, currentNextPageToken);
            const pageActivities = activitiesResult.items;
            
            if (lastActivityId === null) {
              allNewActivities.push(...pageActivities);
              foundLastActivity = true; // Start from the beginning
            } else {
              const lastIndex = pageActivities.findIndex(a => a.id === lastActivityId);
              if (lastIndex !== -1) {
                allNewActivities.push(...pageActivities.slice(lastIndex + 1));
                foundLastActivity = true;
              } else if (foundLastActivity) {
                // We've already found the last activity in a previous page, so all these are new
                allNewActivities.push(...pageActivities);
              }
              // If not found yet, we need to keep looking in next pages (if any)
              // Actually, Jules API returns activities in chronological order (usually)
              // If we didn't find it in the first page (latest 100), it might be in older pages
              // OR it might be that we missed so many that it's gone from the buffer?
              // Assuming chronological order, if it's not in the first 100, and we have more pages,
              // it's likely OLDER. So we should actually be careful.
            }
            
            currentNextPageToken = activitiesResult.nextPageToken;
          } while (currentNextPageToken && !foundLastActivity);

          // If we still haven't found the last activity after all pages, 
          // just assume all current activities are new or we missed some.
          if (!foundLastActivity && lastActivityId !== null) {
            const activitiesResult = await activitiesAPI.list(sessionId, 100);
            allNewActivities = activitiesResult.items;
          }

          for (const activity of allNewActivities) {
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
