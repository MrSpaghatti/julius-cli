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
import { createCompletionCommand } from './commands/completion.js';
import { createTuiCommand } from './commands/tui.js';
import { createCommandRegistry, createInteractiveCommandExecutor } from './cli/parser.js';
import { handleError } from './utils/errors.js';

export const cli = new Command();

const commandsBeforeInteractive = [
  createAuthCommands(),
  createSourcesCommands(),
  createSessionsCommands(),
  createActivitiesCommands(),
  createWaitCommand(),
  createConfigCommands(),
  createTemplatesCommands(),
];

const commandsAfterInteractive = [
  createListenCommand(),
  createCompletionCommand(),
  createTuiCommand(),
];

const interactiveCommandNames = createCommandRegistry([
  ...commandsBeforeInteractive.map((command) => command.name()),
  'interactive',
  ...commandsAfterInteractive.map((command) => command.name()),
]);

cli
  .name('julius-cli')
  .description('AI-first CLI for Jules REST API with JSON output and full automation support')
  .version('0.7.0');

// Global options
cli.option('--verbose', 'Enable verbose logging');
cli.option('--no-color', 'Disable colored output');

// Add command groups
for (const command of commandsBeforeInteractive) {
  cli.addCommand(command);
}

cli.addCommand(createInteractiveCommand({
  commands: interactiveCommandNames,
  execute: createInteractiveCommandExecutor(cli),
}));

for (const command of commandsAfterInteractive) {
  cli.addCommand(command);
}

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
