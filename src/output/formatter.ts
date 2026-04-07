import type { OutputFormat } from '../api/types.js';
import { formatJSON } from './json.js';
import {
  formatPrettySession,
  formatPrettySource,
  formatPrettyActivity,
  formatPrettyTemplate,
} from './pretty.js';
import {
  formatTableSessions,
  formatTableSources,
  formatTableActivities,
  formatTableTemplates,
} from './table.js';

export function formatOutput(data: any, format: OutputFormat, type?: string): string {
  if (format === 'quiet') {
    return '';
  }

  if (format === 'json') {
    return formatJSON(data);
  }

  // Table format
  if (format === 'table') {
    if (type === 'session') {
      const sessions = Array.isArray(data) ? data : (data.sessions || [data]);
      return formatTableSessions(sessions);
    }
    if (type === 'source') {
      const sources = Array.isArray(data) ? data : (data.sources || [data]);
      return formatTableSources(sources);
    }
    if (type === 'activity') {
      const activities = Array.isArray(data) ? data : (data.activities || [data]);
      return formatTableActivities(activities);
    }
    if (type === 'template') {
      const templates = Array.isArray(data) ? data : Object.values(data);
      return formatTableTemplates(templates);
    }
    return formatJSON(data);
  }

  // Pretty format
  if (type === 'session') {
    return formatPrettySession(data);
  }

  if (type === 'source') {
    return formatPrettySource(data);
  }

  if (type === 'activity') {
    return formatPrettyActivity(data);
  }

  if (type === 'template') {
    return formatPrettyTemplate(data);
  }

  // Default to JSON if type not recognized
  return formatJSON(data);
}

export function output(data: any, format: OutputFormat = 'json', type?: string): void {
  const formatted = formatOutput(data, format, type);
  if (formatted) {
    console.log(formatted);
  }
}
