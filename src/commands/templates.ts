import { Command } from 'commander';
import chalk from 'chalk';
import { templates } from '../config/templates.js';
import { formatOutput } from '../output/formatter.js';
import { handleCreateSession } from './sessions.js';
import { NotFoundError, InvalidArgsError } from '../utils/errors.js';
import type { Template } from '../api/types.js';

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createTemplatesCommands(): Command {
  const templatesCmd = new Command('templates')
    .description('Manage session prompt templates');

  templatesCmd
    .command('list')
    .description('List all available templates')
    .option('--format <format>', 'Output format (json, pretty, table, quiet)', 'pretty')
    .action(async (options) => {
      const allTemplates = templates.getAll();
      console.log(formatOutput(allTemplates, options.format, 'template'));
    });

  templatesCmd
    .command('get <id>')
    .description('Get details of a specific template')
    .option('--format <format>', 'Output format (json, pretty, table, quiet)', 'pretty')
    .action(async (id, options) => {
      const template = templates.get(id);
      if (!template) {
        throw new NotFoundError('Template', id);
      }
      console.log(formatOutput(template, options.format, 'template'));
    });

  templatesCmd
    .command('use <id> [vars...]')
    .description('Use a template to create a new session')
    .option('--repo <repo>', 'GitHub repository (owner/repo or "." for cwd)')
    .option('--title <title>', 'Session title')
    .option('--branch <branch>', 'Starting branch')
    .option('--auto-pr', 'Automatically create PR when complete')
    .option('--require-approval', 'Require plan approval')
    .option('--wait', 'Wait for session completion')
    .option('--follow', 'Follow activity streaming')
    .option('--format <format>', 'Output format (json, pretty, table, quiet)', 'pretty')
    .action(async (id, vars, options) => {
      const template = templates.get(id);
      if (!template) {
        throw new NotFoundError('Template', id);
      }

      // Parse variables
      const variableValues: Record<string, string> = {};
      vars.forEach((v: string) => {
        const [key, ...rest] = v.split('=');
        if (key && rest.length > 0) {
          variableValues[key] = rest.join('=');
        }
      });

      // Fill template prompt
      let prompt = template.prompt;
      template.variables?.forEach((variable) => {
        const value = variableValues[variable.name] || variable.defaultValue;
        if (variable.required && !value) {
          throw new InvalidArgsError(`Variable "${variable.name}" is required for template "${id}".`);
        }
        if (value) {
          const escapedName = escapeRegExp(variable.name);
          prompt = prompt.replace(new RegExp(`{{${escapedName}}}`, 'g'), value);
        }
      });

      // Clean up remaining placeholders
      prompt = prompt.replace(/{{[^{}]+}}/g, '');

      if (options.format === 'pretty') {
        console.log(chalk.blue(`Using template: ${template.name}`));
      }

      await handleCreateSession({
        ...options,
        prompt,
        title: options.title || template.name,
      });
    });

  return templatesCmd;
}
