import notifier from 'node-notifier';
import { Output } from '../output/manager.js';
import type { Session, SessionState, Activity } from '../api/types.js';

export interface StateChangeEvent {
  type: 'state_change';
  sessionId: string;
  title: string;
  from: SessionState | undefined;
  to: SessionState;
}

export interface NeedsApprovalEvent {
  type: 'needs_approval';
  sessionId: string;
  title: string;
  prompt: string;
}

export interface NewMessageEvent {
  type: 'new_message';
  sessionId: string;
  title: string;
  author: string;
  content: string;
}

export interface CompletedEvent {
  type: 'completed';
  sessionId: string;
  title: string;
  outputs?: string;
}

export interface FailedEvent {
  type: 'failed';
  sessionId: string;
  title: string;
}

export interface ErrorEvent {
  type: 'error';
  sessionId: string;
  title: string;
  message: string;
}

export type DaemonEvent =
  | StateChangeEvent
  | NeedsApprovalEvent
  | NewMessageEvent
  | CompletedEvent
  | FailedEvent
  | ErrorEvent;

type NotificationTarget = 'system' | 'agent';

function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 12) + '...' : id;
}

function eventTitle(event: DaemonEvent): string {
  switch (event.type) {
    case 'state_change':
      return `Session ${event.to === 'COMPLETED' ? 'Complete' : event.to === 'FAILED' ? 'Failed' : 'Updated'}`;
    case 'needs_approval':
      return 'Approval Needed';
    case 'new_message':
      return `New message from ${event.author}`;
    case 'completed':
      return 'Session Complete';
    case 'failed':
      return 'Session Failed';
    case 'error':
      return 'Monitoring Error';
  }
}

function eventMessage(event: DaemonEvent): string {
  const label = event.title || shortId(event.sessionId);
  switch (event.type) {
    case 'state_change':
      return `${label}: ${event.from || 'NEW'} → ${event.to}`;
    case 'needs_approval':
      return `${label}: ${truncate(event.prompt, 80)}`;
    case 'new_message':
      return `${label}: ${truncate(event.content, 120)}`;
    case 'completed':
      return `${label} completed successfully`;
    case 'failed':
      return `${label} failed`;
    case 'error':
      return `${label}: ${event.message}`;
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

function sendSystemNotification(event: DaemonEvent): void {
  const title = eventTitle(event);
  const message = eventMessage(event);

  notifier.notify({
    title: `Jules: ${title}`,
    message,
    sound: event.type === 'needs_approval' || event.type === 'failed',
    timeout: 10,
  });
}

function sendAgentNotification(event: DaemonEvent): void {
  Output.log(JSON.stringify({
    daemon: true,
    timestamp: new Date().toISOString(),
    ...event,
  }));
}

export function sendNotification(
  events: DaemonEvent | DaemonEvent[],
  targets: NotificationTarget[]
): void {
  const list = Array.isArray(events) ? events : [events];

  for (const event of list) {
    if (targets.includes('system')) {
      sendSystemNotification(event);
    }
    if (targets.includes('agent')) {
      sendAgentNotification(event);
    }
  }
}

export function buildStateChangeEvent(
  session: Session,
  fromState: SessionState | undefined
): StateChangeEvent | null {
  if (!session.state) return null;
  if (session.state === fromState) return null;

  return {
    type: 'state_change',
    sessionId: session.id,
    title: session.title || '',
    from: fromState,
    to: session.state,
  };
}

export function buildNeedsApprovalEvent(session: Session): NeedsApprovalEvent {
  return {
    type: 'needs_approval',
    sessionId: session.id,
    title: session.title || '',
    prompt: session.prompt,
  };
}

export function buildNewMessageEvent(
  session: Session,
  activity: Activity
): NewMessageEvent {
  return {
    type: 'new_message',
    sessionId: session.id,
    title: session.title || '',
    author: activity.author,
    content: activity.content,
  };
}

export function buildCompletedEvent(session: Session): CompletedEvent {
  const outputSummary = session.outputs
    ?.map(o => o.pullRequest?.url || o.branch?.name || '')
    .filter(Boolean)
    .join(', ');

  return {
    type: 'completed',
    sessionId: session.id,
    title: session.title || '',
    outputs: outputSummary,
  };
}

export function buildFailedEvent(session: Session): FailedEvent {
  return {
    type: 'failed',
    sessionId: session.id,
    title: session.title || '',
  };
}
