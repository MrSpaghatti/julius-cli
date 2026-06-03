import type { OutputFormat } from '../cli/types.js';
import type { Activity, Session, Source } from '../api/types.js';
import type { Template } from '../templates/types.js';
import { formatJSON } from './json.js';
import { Output } from './manager.js';
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

export interface FormatterContext {
  headerShown: boolean;
}

export interface OutputOptions {
  formatterContext?: FormatterContext;
  prefix?: string;
}

export function createFormatterContext(): FormatterContext {
  return { headerShown: false };
}

export interface SessionOutput {
  kind: 'session';
  session: Session;
}

export interface SessionsOutput {
  kind: 'sessions';
  sessions: Session[];
  nextPageToken?: string;
  totalSize?: number;
}

export interface SourceOutput {
  kind: 'source';
  source: Source;
}

export interface SourcesOutput {
  kind: 'sources';
  sources: Source[];
  nextPageToken?: string;
  totalSize?: number;
}

export interface ActivityOutput {
  kind: 'activity';
  activity: Activity;
}

export interface ActivitiesOutput {
  kind: 'activities';
  sessionId?: string;
  activities: Activity[];
  nextPageToken?: string;
  totalSize?: number;
}

export interface TemplateOutput {
  kind: 'template';
  template: Template;
}

export interface TemplatesOutput {
  kind: 'templates';
  templates: Template[];
}

export type FormattedOutput =
  | SessionOutput
  | SessionsOutput
  | SourceOutput
  | SourcesOutput
  | ActivityOutput
  | ActivitiesOutput
  | TemplateOutput
  | TemplatesOutput;

function getIncludeHeader(formatterContext?: FormatterContext): boolean {
  const includeHeader = !formatterContext?.headerShown;
  if (formatterContext) {
    formatterContext.headerShown = true;
  }
  return includeHeader;
}

function serializeOutputData(data: FormattedOutput): unknown {
  switch (data.kind) {
    case 'session':
      return data.session;
    case 'sessions':
      return {
        sessions: data.sessions,
        nextPageToken: data.nextPageToken,
        totalSize: data.totalSize,
      };
    case 'source':
      return data.source;
    case 'sources':
      return {
        sources: data.sources,
        nextPageToken: data.nextPageToken,
        totalSize: data.totalSize,
      };
    case 'activity':
      return data.activity;
    case 'activities':
      return {
        sessionId: data.sessionId,
        activities: data.activities,
        nextPageToken: data.nextPageToken,
        totalSize: data.totalSize,
      };
    case 'template':
      return data.template;
    case 'templates':
      return data.templates;
  }
}

function formatPrettyOutput(data: FormattedOutput): string {
  switch (data.kind) {
    case 'session':
      return formatPrettySession(data.session);
    case 'sessions':
      return data.sessions.map((session) => formatPrettySession(session)).join('');
    case 'source':
      return formatPrettySource(data.source);
    case 'sources':
      return data.sources.map((source) => formatPrettySource(source)).join('');
    case 'activity':
      return formatPrettyActivity(data.activity);
    case 'activities':
      return data.activities.map((activity) => formatPrettyActivity(activity)).join('');
    case 'template':
      return formatPrettyTemplate(data.template);
    case 'templates':
      return formatPrettyTemplate(data.templates);
  }
}

function formatTableOutput(
  data: FormattedOutput,
  formatterContext?: FormatterContext
): string {
  switch (data.kind) {
    case 'session':
      return formatTableSessions([data.session]);
    case 'sessions':
      return formatTableSessions(data.sessions);
    case 'source':
      return formatTableSources([data.source]);
    case 'sources':
      return formatTableSources(data.sources);
    case 'activity':
      return formatTableActivities([data.activity], getIncludeHeader(formatterContext));
    case 'activities':
      return formatTableActivities(data.activities, getIncludeHeader(formatterContext));
    case 'template':
      return formatTableTemplates([data.template]);
    case 'templates':
      return formatTableTemplates(data.templates);
  }
}

function formatGenericOutput(data: unknown, format: OutputFormat): string {
  if (format === 'quiet') {
    return '';
  }

  return formatJSON(data);
}

export function formatOutput(
  data: FormattedOutput,
  format: OutputFormat,
  formatterContext?: FormatterContext
): string {
  if (format === 'quiet') {
    return '';
  }

  if (format === 'json') {
    return formatJSON(serializeOutputData(data));
  }

  if (format === 'table') {
    return formatTableOutput(data, formatterContext);
  }

  if (format === 'pretty') {
    return formatPrettyOutput(data);
  }

  return formatJSON(serializeOutputData(data));
}

export function outputFormatted(
  data: FormattedOutput,
  format: OutputFormat = 'json',
  options: OutputOptions = {}
): void {
  const formatted = formatOutput(data, format, options.formatterContext);
  if (formatted) {
    if (options.prefix) {
      const prefixed = formatted
        .split('\n')
        .map((line) => `${options.prefix}${line}`)
        .join('\n');
      Output.log(prefixed);
    } else {
      Output.log(formatted);
    }
  }
}

export function output(
  data: unknown,
  format: OutputFormat = 'json',
  options: OutputOptions = {}
): void {
  const formatted = formatGenericOutput(data, format);
  if (formatted) {
    if (options.prefix) {
      const prefixed = formatted
        .split('\n')
        .map((line) => `${options.prefix}${line}`)
        .join('\n');
      Output.log(prefixed);
    } else {
      Output.log(formatted);
    }
  }
}
