import { Command } from 'commander';
import { createAuthCommands } from './commands/auth.js';
import { createSourcesCommands } from './commands/sources.js';
import { createSessionsCommands } from './commands/sessions.js';
import { createActivitiesCommands } from './commands/activities.js';
import { handleError } from './utils/errors.js';

export const cli = new Command();

cli
  .name('jules-cli')
  .description('AI-first CLI for Jules REST API with JSON output and full automation support')
  .version('0.1.0');

// Global options
cli.option('--verbose', 'Enable verbose logging');
cli.option('--no-color', 'Disable colored output');

// Add command groups
cli.addCommand(createAuthCommands());
cli.addCommand(createSourcesCommands());
cli.addCommand(createSessionsCommands());
cli.addCommand(createActivitiesCommands());

// Error handling
cli.exitOverride();
cli.configureOutput({
  outputError: (str, write) => {
    // Strip any color codes if --no-color is set
    write(str);
  },
});

// Handle errors globally
process.on('uncaughtException', handleError);
process.on('unhandledRejection', (reason) => {
  handleError(reason);
});
