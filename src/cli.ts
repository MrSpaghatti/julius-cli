import { Command } from 'commander';
import { createAuthCommands } from './commands/auth.js';
import { createSourcesCommands } from './commands/sources.js';
import { createSessionsCommands } from './commands/sessions.js';
import { createActivitiesCommands } from './commands/activities.js';
import { createWaitCommand } from './commands/wait-cli.js';
import { createConfigCommands } from './commands/config.js';
import { createTemplatesCommands } from './commands/templates.js';
import { createInteractiveCommand } from './commands/interactive.js';
import { createListenCommand } from './commands/listen.js';
import { handleError } from './utils/errors.js';

export const cli = new Command();

cli
  .name('julius-cli')
  .description('AI-first CLI for Jules REST API with JSON output and full automation support')
  .version('0.7.0');

// Global options
cli.option('--verbose', 'Enable verbose logging');
cli.option('--no-color', 'Disable colored output');

// Add command groups
cli.addCommand(createAuthCommands());
cli.addCommand(createSourcesCommands());
cli.addCommand(createSessionsCommands());
cli.addCommand(createActivitiesCommands());
cli.addCommand(createWaitCommand());
cli.addCommand(createConfigCommands());
cli.addCommand(createTemplatesCommands());
cli.addCommand(createInteractiveCommand());
cli.addCommand(createListenCommand());

// Error handling
cli.exitOverride();
cli.configureOutput({
  outputError: (str, write) => {
    // Strip any color codes if --no-color is set
    write(str);
  },
});

// Handle errors globally
process.on('uncaughtException', (error) => {
  process.exit(handleError(error));
});
process.on('unhandledRejection', (reason) => {
  process.exit(handleError(reason));
});
