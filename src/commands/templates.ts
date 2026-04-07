import { Command } from 'commander';
import chalk from 'chalk';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
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
    .command('create')
    .description('Create a new template interactively')
    .action(async () => {
      const rl = readline.createInterface({ input, output });
      
      try {
        const id = await rl.question('Template ID (e.g. bugfix): ');
        if (!id) throw new Error('Template ID is required');
        
        const name = await rl.question('Template Name: ');
        const description = await rl.question('Description: ');
        console.log('Enter prompt (use {{var}} for variables). Press Enter twice to finish:');
        
        let promptLines: string[] = [];
        while (true) {
          const line = await rl.question('');
          if (line === '' && promptLines.length > 0 && promptLines[promptLines.length - 1] === '') {
            promptLines.pop();
            break;
          }
          promptLines.push(line);
        }
        
        const prompt = promptLines.join('\n');
        
        const regex = /{{([^}]+)}}/g;
        const matches = [...prompt.matchAll(regex)];
        const varNames = Array.from(new Set(matches.map(m => m[1])));
        
        const template: Template = {
          id,
          name,
          description,
          prompt,
          variables: varNames.map(v => ({ name: v, description: `Variable ${v}`, required: true }))
        };
        
        templates.set(template);
        console.log(chalk.green(`\nTemplate '${id}' created successfully.`));
      } finally {
        rl.close();
      }
    });

  templatesCmd
    .command('edit <id>')
    .description('Edit an existing template')
    .option('-n, --name <name>', 'Template name')
    .option('-d, --description <description>', 'Template description')
    .option('-p, --prompt <prompt>', 'Template prompt')
    .action(async (id, options) => {
      const template = templates.get(id);
      if (!template) throw new NotFoundError('Template', id);
      
      if (options.name) template.name = options.name;
      if (options.description) template.description = options.description;
      if (options.prompt) {
        template.prompt = options.prompt;
        const regex = /{{([^}]+)}}/g;
        const matches = [...options.prompt.matchAll(regex)];
        const varNames = Array.from(new Set(matches.map(m => m[1])));
        template.variables = varNames.map((v: string) => {
          const existing = template.variables?.find(ev => ev.name === v);
          return existing || { name: v, description: `Variable ${v}`, required: true };
        });
      }
      
      templates.set(template);
      console.log(chalk.green(`Template '${id}' updated successfully.`));
    });

  templatesCmd
    .command('delete <id>')
    .description('Delete a template')
    .action(async (id) => {
      if (!templates.get(id)) throw new NotFoundError('Template', id);
      templates.delete(id);
      console.log(chalk.green(`Template '${id}' deleted successfully.`));
    });

  templatesCmd
    .command('import <file>')
    .description('Import templates from a JSON file')
    .action(async (file) => {
      const fs = await import('fs');
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const imported = JSON.parse(content) as Template[];
        if (!Array.isArray(imported)) {
          throw new InvalidArgsError('Import file must contain an array of templates');
        }
        let count = 0;
        for (const t of imported) {
          if (!t.id || !t.prompt) {
            console.log(chalk.yellow(`Skipping invalid template (missing id or prompt): ${t.id || 'unknown'}`));
            continue;
          }
          templates.set(t);
          count++;
        }
        console.log(chalk.green(`Successfully imported ${count} templates from ${file}`));
      } catch (err: any) {
        throw new Error(`Failed to import templates: ${err.message}`);
      }
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
