import Table from 'cli-table3';
import chalk from 'chalk';
import type { Activity, Session, Source } from '../api/types.js';
import type { Template } from '../templates/types.js';
import { formatState } from './common.js';

function createTable(head: string[]): Table.Table {
  return new Table({
    head: head.map(h => chalk.cyan(h)),
    chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
  });
}

export function formatTableSessions(sessions: Session[]): string {
  const table = createTable(['ID', 'Title', 'State', 'Repository', 'Created']);

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
  const table = createTable(['ID', 'Name']);

  for (const source of sources) {
    table.push([source.id, source.name]);
  }

  return table.toString();
}

export function formatTableActivities(activities: Activity[], includeHeader: boolean = true): string {
  const table = createTable(includeHeader ? ['ID', 'Type', 'Author', 'Content', 'Created'] : []);

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

export function formatTableTemplates(templates: Template[]): string {
  const table = createTable(['ID', 'Name', 'Description']);

  for (const template of templates) {
    table.push([
      template.id,
      template.name,
      template.description || 'N/A',
    ]);
  }

  return table.toString();
}
