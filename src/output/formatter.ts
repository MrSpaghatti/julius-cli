import type { OutputFormat } from '../api/types.js';
import { formatJSON } from './json.js';
import {
  formatPrettySession,
  formatPrettySource,
  formatPrettyActivity,
} from './pretty.js';

export function formatOutput(data: any, format: OutputFormat, type?: string): string {
  if (format === 'quiet') {
    return '';
  }

  if (format === 'json') {
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

  // Default to JSON if type not recognized
  return formatJSON(data);
}

export function output(data: any, format: OutputFormat = 'json', type?: string): void {
  const formatted = formatOutput(data, format, type);
  if (formatted) {
    console.log(formatted);
  }
}
