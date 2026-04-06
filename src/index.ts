import { cli } from './cli.js';

cli.parseAsync(process.argv).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
