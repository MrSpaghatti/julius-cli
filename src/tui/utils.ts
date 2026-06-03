import type { SessionState } from '../api/types.js';

export function formatRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getStateColor(state: SessionState | undefined): string {
  switch (state) {
    case 'COMPLETED': return 'green';
    case 'EXECUTING': return 'yellow';
    case 'PLANNING': return 'cyan';
    case 'AWAITING_APPROVAL': return 'magenta';
    case 'PENDING': return 'blue';
    case 'FAILED': return 'red';
    case 'CANCELLED': return 'red';
    default: return 'white';
  }
}

export function extractRepo(sourceContext: { source?: string } | undefined): string {
  if (!sourceContext) return 'unknown';
  const src = sourceContext.source?.replace('sources/', '') || '';
  if (!src) return 'unknown';
  const parts = src.split('/');
  return parts.length >= 3 ? parts.slice(-2).join('/') : src;
}

export function getStateIcon(state: SessionState | undefined): string {
  switch (state) {
    case 'COMPLETED': return '\u2713';
    case 'EXECUTING': return '\u25CC';
    case 'PLANNING': return '\u25D7';
    case 'AWAITING_APPROVAL': return '\u25CB';
    case 'PENDING': return '\u25CB';
    case 'FAILED': return '\u2717';
    case 'CANCELLED': return '\u2013';
    default: return '?';
  }
}

export const FILTER_STATES = ['all', 'PENDING', 'EXECUTING', 'PLANNING', 'AWAITING_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;
