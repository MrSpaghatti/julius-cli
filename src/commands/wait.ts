import { JulesAPIClient } from '../api/client.js';
import { SessionsAPI } from '../api/sessions.js';
import { ActivitiesAPI } from '../api/activities.js';
import { Session, SessionState, OutputFormat, Activity } from '../api/types.js';
import { output } from '../output/formatter.js';
import { CLIError, ExitCode } from '../utils/errors.js';
import { sleep } from '../utils/polling.js';
import ora from 'ora';

export interface WaitCommandOptions {
  sessionId: string;
  timeout?: number; // seconds, default 600 (10 minutes)
  interval?: number; // seconds, default 5
  state?: SessionState; // wait for specific state, default COMPLETED|FAILED|CANCELLED
  format?: OutputFormat;
  verbose?: boolean;
  follow?: boolean;
  activityTypes?: string[];
  noSpinner?: boolean;
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
    activityTypes,
    noSpinner = false,
  } = options;

  const sessionsAPI = new SessionsAPI(client);
  const activitiesAPI = new ActivitiesAPI(client);
  const startTime = Date.now();
  const timeoutMs = timeout * 1000;
  const intervalMs = interval * 1000;

  // Target states to wait for
  const targetStates = state ? [state] : TERMINAL_STATES;

  let spinner: any;
  if (format === 'pretty' && !verbose && !follow && !noSpinner) {
    spinner = ora(`Waiting for session ${sessionId} (target: ${targetStates.join('/')})...`).start();
  }

  let lastSession: Session | null = null;
  let attempts = 0;
  let currentToken: string | undefined = undefined;
  const seenActivityIds = new Set<string>();

  while (true) {
    attempts++;
    const elapsed = Date.now() - startTime;

    // Check timeout
    if (elapsed >= timeoutMs) {
      if (spinner) spinner.fail(`Timeout reached for session ${sessionId}`);
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
          let hasMore = true;
          let newActivities: Activity[] = [];
          
          while (hasMore) {
            const result = await activitiesAPI.list(sessionId, 100, currentToken);
            
            for (const act of result.items) {
              if (!seenActivityIds.has(act.id)) {
                newActivities.push(act);
                seenActivityIds.add(act.id);
              }
            }

            if (result.nextPageToken) {
              currentToken = result.nextPageToken;
            } else {
              hasMore = false;
            }
            
            if (result.items.length === 0) {
              hasMore = false;
            }
          }

          // Filter by activity type if provided
          if (activityTypes && activityTypes.length > 0) {
            const typeSet = new Set(activityTypes.map(t => t.toUpperCase()));
            newActivities = newActivities.filter(a => typeSet.has(a.type));
          }

          // Output new activities in chronological order
          newActivities.sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());

          for (const activity of newActivities) {
            output(activity, format, 'activity');
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
        if (spinner) spinner.fail(`Session ${sessionId} not found.`);
        throw error;
      }

      // For other errors, wait and continue unless we've failed too many times in a row
      await sleep(intervalMs);
    }
  }
}
