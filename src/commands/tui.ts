import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { App } from '../tui/App.js';

let exitRequested = false;

export function createTuiCommand(): Command {
  return new Command('tui')
    .description('Launch the terminal dashboard')
    .action(async () => {
      if (exitRequested) return;
      exitRequested = true;

      const { waitUntilExit } = render(React.createElement(App));

      process.on('SIGINT', () => {});
      process.on('SIGTERM', () => {});

      await waitUntilExit();
    });
}
