import chalk from 'chalk';

export function formatState(state: string): string {
  switch (state) {
    case 'ACTIVE':
    case 'EXECUTING':
    case 'PLANNING':
      return chalk.yellow(state);
    case 'AWAITING_APPROVAL':
      return chalk.magenta(state);
    case 'COMPLETED':
      return chalk.green(state);
    case 'FAILED':
      return chalk.red(state);
    case 'CANCELLED':
      return chalk.gray(state);
    default:
      return chalk.gray(state);
  }
}
