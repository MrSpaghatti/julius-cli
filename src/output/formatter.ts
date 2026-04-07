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

let headerShown = false;

export function resetHeader(): void {
  headerShown = false;
}

type Formatter = (data: any, includeHeader?: boolean) => string;

const prettyFormatters: Record<string, Formatter> = {
  session: formatPrettySession,
  source: formatPrettySource,
  activity: formatPrettyActivity,
  template: formatPrettyTemplate,
};

const tableFormatters: Record<string, Formatter> = {
  session: (data, h) =>
    formatTableSessions(Array.isArray(data) ? data : data.sessions || [data]),
  source: (data, h) =>
    formatTableSources(Array.isArray(data) ? data : data.sources || [data]),
  activity: (data, h) =>
    formatTableActivities(
      Array.isArray(data) ? data : data.activities || [data],
      h
    ),
  template: (data, h) =>
    formatTableTemplates(Array.isArray(data) ? data : Object.values(data)),
};

export function formatOutput(
  data: any,
  format: OutputFormat,
  type?: string,
  isStream: boolean = false
): string {
  if (format === 'quiet') {
    return '';
  }

  if (format === 'json') {
    return formatJSON(data);
  }

  if (type) {
    if (format === 'table' && tableFormatters[type]) {
      const includeHeader = !isStream || !headerShown;
      if (isStream) headerShown = true;
      return tableFormatters[type](data, includeHeader);
    }

    if (format === 'pretty' && prettyFormatters[type]) {
      return prettyFormatters[type](data);
    }
  }

  // Default to JSON if type/format not recognized
  return formatJSON(data);
}

export function output(
  data: any, 
  format: OutputFormat = 'json', 
  type?: string, 
  isStream: boolean = false,
  prefix?: string
): void {
  const formatted = formatOutput(data, format, type, isStream);
  if (formatted) {
    if (prefix) {
      const prefixed = formatted.split('\n').map(line => `${prefix}${line}`).join('\n');
      console.log(prefixed);
    } else {
      console.log(formatted);
    }
  }
}
