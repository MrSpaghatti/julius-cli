import { cli } from './cli.js';
import { parseCli } from './cli/parser.js';
import { handleError } from './utils/errors.js';

parseCli(cli, process.argv).catch((error) => {
  process.exit(handleError(error));
});
