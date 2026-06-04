import { getClient } from '../utils/client.js';
import { SessionsAPI } from '../api/sessions.js';
import { ActivitiesAPI } from '../api/activities.js';
import { sleep } from '../utils/polling.js';
import { config } from '../config/index.js';
import type { Session, SessionState, Activity } from '../api/types.js';
import {
  sendNotification,
  buildStateChangeEvent,
  buildNeedsApprovalEvent,
  buildNewMessageEvent,
  buildCompletedEvent,
  buildFailedEvent,
  type DaemonEvent,
} from './notifier.js';

const TERMINAL_STATES: SessionState[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

interface TrackedSession {
  state: SessionState | undefined;
  lastActivityTime: string | undefined;
  notifiedCompleted: boolean;
  notifiedFailed: boolean;
  notifiedNeedsApproval: boolean;
}

export interface DaemonOptions {
  pollInterval?: number;
  notificationTargets?: ('system' | 'agent')[];
  onEvent?: (event: DaemonEvent) => void;
}

export class DaemonService {
  private running = false;
  private tracked = new Map<string, TrackedSession>();
  private sessionsAPI!: SessionsAPI;
  private activitiesAPI!: ActivitiesAPI;
  private pollInterval: number;
  private targets: ('system' | 'agent')[];
  private onEvent?: (event: DaemonEvent) => void;
  private consecutiveErrors = 0;
  private readonly MAX_CONSECUTIVE_ERRORS = 10;

  constructor(options: DaemonOptions = {}) {
    this.pollInterval = options.pollInterval ?? config.get('daemon')?.pollInterval ?? 30000;
    this.targets = options.notificationTargets ?? config.get('daemon')?.notifications ?? ['system', 'agent'];
    this.onEvent = options.onEvent;
  }

  get isRunning(): boolean {
    return this.running;
  }

  private emit(event: DaemonEvent): void {
    sendNotification(event, this.targets);
    this.onEvent?.(event);
  }

  async start(): Promise<void> {
    const client = await getClient();
    this.sessionsAPI = new SessionsAPI(client);
    this.activitiesAPI = new ActivitiesAPI(client);
    this.running = true;

    while (this.running) {
      try {
        await this.pollOnce();
        this.consecutiveErrors = 0;
      } catch (err) {
        this.consecutiveErrors++;
        const message = err instanceof Error ? err.message : String(err);
        this.emit({
          type: 'error',
          sessionId: 'daemon',
          title: 'Daemon Monitor',
          message: `Poll error (${this.consecutiveErrors}/${this.MAX_CONSECUTIVE_ERRORS}): ${message}`,
        });

        if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
          this.emit({
            type: 'error',
            sessionId: 'daemon',
            title: 'Daemon Monitor',
            message: `Too many consecutive errors (${this.MAX_CONSECUTIVE_ERRORS}), stopping daemon`,
          });
          this.running = false;
          break;
        }
      }

      if (this.running) {
        await sleep(this.pollInterval);
      }
    }
  }

  stop(): void {
    this.running = false;
  }

  private async pollOnce(): Promise<void> {
    const result = await this.sessionsAPI.list(100);
    const sessions = result.items || [];

    const seenIds = new Set(sessions.map(s => s.id));

    for (const session of sessions) {
      await this.checkSession(session);
    }

    for (const [id] of this.tracked) {
      if (!seenIds.has(id)) {
        this.tracked.delete(id);
      }
    }
  }

  private async checkSession(session: Session): Promise<void> {
    if (!session.state) return;

    const tracked = this.tracked.get(session.id) ?? {
      state: undefined,
      lastActivityTime: undefined,
      notifiedCompleted: false,
      notifiedFailed: false,
      notifiedNeedsApproval: false,
    };

    const events: DaemonEvent[] = [];

    if (session.state !== tracked.state) {
      const event = buildStateChangeEvent(session, tracked.state);
      if (event) {
        events.push(event);
      }

      if (TERMINAL_STATES.includes(session.state)) {
        if (session.state === 'COMPLETED' && !tracked.notifiedCompleted) {
          events.push(buildCompletedEvent(session));
          tracked.notifiedCompleted = true;
        }
        if (session.state === 'FAILED' && !tracked.notifiedFailed) {
          events.push(buildFailedEvent(session));
          tracked.notifiedFailed = true;
        }
      }

      if (session.state === 'AWAITING_APPROVAL' && !tracked.notifiedNeedsApproval) {
        events.push(buildNeedsApprovalEvent(session));
        tracked.notifiedNeedsApproval = true;
      }

      tracked.state = session.state;
    }

    if (session.state === 'AWAITING_APPROVAL' && !tracked.notifiedNeedsApproval) {
      events.push(buildNeedsApprovalEvent(session));
      tracked.notifiedNeedsApproval = true;
    }

    try {
      const activitiesResult = await this.activitiesAPI.list(session.id, 10);
      const activities = activitiesResult.items || [];

      for (const activity of activities) {
        const actTime = activity.createTime;
        if (
          activity.author === 'AGENT' &&
          activity.type === 'MESSAGE' &&
          (!tracked.lastActivityTime || actTime > tracked.lastActivityTime)
        ) {
          events.push(buildNewMessageEvent(session, activity));
        }
      }

      if (activities.length > 0) {
        const latest = activities.reduce((latest, a) =>
          a.createTime > latest.createTime ? a : latest
        );
        if (!tracked.lastActivityTime || latest.createTime > tracked.lastActivityTime) {
          tracked.lastActivityTime = latest.createTime;
        }
      }
    } catch {
      // Activity fetching is best-effort during monitoring
    }

    this.tracked.set(session.id, tracked);

    for (const event of events) {
      this.emit(event);
    }
  }
}
