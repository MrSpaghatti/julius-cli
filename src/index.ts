import { cli } from './cli.js';
import { parseCli } from './cli/parser.js';
import { CommanderError } from 'commander';
import { handleError, ExitCode } from './utils/errors.js';

parseCli(cli, process.argv).catch((error) => {
  // Commander throws CommanderError on --help/--version with exitOverride().
  // These are not real errors — exit cleanly without printing anything.
  if (error instanceof CommanderError) {
    process.exit(error.exitCode);
  }
  process.exit(handleError(error));
});
