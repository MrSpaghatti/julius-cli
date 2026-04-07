import { cli } from './cli.js';
import { handleError } from './utils/errors.js';

cli.parseAsync(process.argv).catch((error) => {
  process.exit(handleError(error));
});
