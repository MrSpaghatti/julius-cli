import Table from 'cli-table3';
import chalk from 'chalk';
import type { Session, Source, Activity } from '../api/types.js';

export function formatTableSessions(sessions: Session[]): string {
  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Title'),
      chalk.cyan('State'),
      chalk.cyan('Repository'),
      chalk.cyan('Created'),
    ],
    chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
  });

  for (const session of sessions) {
    const repo = session.sourceContext.source.replace('sources/github/', '');
    const state = formatState(session.state || 'PENDING');
    const created = session.createTime
      ? new Date(session.createTime).toLocaleString()
      : 'N/A';

    table.push([
      session.id,
      session.title || (session.prompt.substring(0, 30) + '...'),
      state,
      repo,
      created,
    ]);
  }

  return table.toString();
}

export function formatTableSources(sources: Source[]): string {
  const table = new Table({
    head: [chalk.cyan('ID'), chalk.cyan('Name')],
    chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
  });

  for (const source of sources) {
    table.push([source.id, source.name]);
  }

  return table.toString();
}

export function formatTableActivities(activities: Activity[]): string {
  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Type'),
      chalk.cyan('Author'),
      chalk.cyan('Content'),
      chalk.cyan('Created'),
    ],
    chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
  });

  for (const activity of activities) {
    const created = new Date(activity.createTime).toLocaleString();
    const content = activity.content.substring(0, 50).replace(/\n/g, ' ') + (activity.content.length > 50 ? '...' : '');
    
    table.push([
      activity.id,
      activity.type,
      activity.author,
      content,
      created,
    ]);
  }

  return table.toString();
}

function formatState(state: string): string {
  switch (state) {
    case 'ACTIVE':
    case 'EXECUTING':
    case 'PLANNING':
      return chalk.yellow(state);
    case 'AWAITING_APPROVAL':
      return chalk.magenta(state);
    case 'COMPLETED':
      return chalk.green(state);
    case 'FAILED':
      return chalk.red(state);
    case 'CANCELLED':
      return chalk.gray(state);
    default:
      return state;
  }
}
