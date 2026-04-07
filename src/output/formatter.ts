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

type Formatter = (data: any) => string;

const prettyFormatters: Record<string, Formatter> = {
  session: formatPrettySession,
  source: formatPrettySource,
  activity: formatPrettyActivity,
  template: formatPrettyTemplate,
};

const tableFormatters: Record<string, Formatter> = {
  session: (data) =>
    formatTableSessions(Array.isArray(data) ? data : data.sessions || [data]),
  source: (data) =>
    formatTableSources(Array.isArray(data) ? data : data.sources || [data]),
  activity: (data) =>
    formatTableActivities(
      Array.isArray(data) ? data : data.activities || [data]
    ),
  template: (data) =>
    formatTableTemplates(Array.isArray(data) ? data : Object.values(data)),
};

export function formatOutput(
  data: any,
  format: OutputFormat,
  type?: string
): string {
  if (format === 'quiet') {
    return '';
  }

  if (format === 'json') {
    return formatJSON(data);
  }

  if (type) {
    if (format === 'table' && tableFormatters[type]) {
      return tableFormatters[type](data);
    }

    if (format === 'pretty' && prettyFormatters[type]) {
      return prettyFormatters[type](data);
    }
  }

  // Default to JSON if type/format not recognized
  return formatJSON(data);
}

export function output(data: any, format: OutputFormat = 'json', type?: string): void {
  const formatted = formatOutput(data, format, type);
  if (formatted) {
    console.log(formatted);
  }
}
