import chalk from 'chalk';
import type { Session, Source, Activity } from '../api/types.js';

export function formatPrettySession(session: Session): string {
  const lines: string[] = [];

  lines.push(chalk.bold.cyan(`Session: ${session.title || session.id}`));
  lines.push(chalk.gray(`  ID: ${session.id}`));
  lines.push(chalk.gray(`  State: ${formatState(session.state || 'UNKNOWN')}`));

  if (session.sourceContext.source) {
    const source = session.sourceContext.source.replace('sources/github/', '');
    lines.push(chalk.gray(`  Repository: ${source}`));
  }

  if (session.sourceContext.githubRepoContext?.startingBranch) {
    lines.push(chalk.gray(`  Branch: ${session.sourceContext.githubRepoContext.startingBranch}`));
  }

  if (session.automationMode && session.automationMode !== 'NONE') {
    lines.push(chalk.gray(`  Automation: ${session.automationMode}`));
  }

  if (session.requirePlanApproval) {
    lines.push(chalk.gray(`  Plan Approval: Required`));
  }

  if (session.createTime) {
    lines.push(chalk.gray(`  Created: ${new Date(session.createTime).toLocaleString()}`));
  }

  if (session.outputs && session.outputs.length > 0) {
    lines.push(chalk.gray(`  Outputs:`));
    for (const output of session.outputs) {
      if (output.pullRequest) {
        lines.push(chalk.gray(`    PR: ${output.pullRequest.url}`));
      }
      if (output.branch) {
        lines.push(chalk.gray(`    Branch: ${output.branch.name}`));
      }
    }
  }

  lines.push(''); // Empty line between sessions

  return lines.join('\n');
}

export function formatPrettySource(source: Source): string {
  const lines: string[] = [];

  if (source.githubRepo) {
    lines.push(chalk.bold.cyan(`${source.githubRepo.owner}/${source.githubRepo.repo}`));
  } else {
    lines.push(chalk.bold.cyan(source.id));
  }

  lines.push(chalk.gray(`  ID: ${source.id}`));
  lines.push(chalk.gray(`  Name: ${source.name}`));
  lines.push('');

  return lines.join('\n');
}

export function formatPrettyActivity(activity: Activity): string {
  const lines: string[] = [];

  const typeColor = activity.type === 'ERROR' ? chalk.red : chalk.cyan;
  const authorBadge = activity.author === 'USER' ? chalk.blue('[USER]') : chalk.green('[AGENT]');

  lines.push(`${authorBadge} ${typeColor(activity.type)} ${chalk.gray(activity.id)}`);
  lines.push(chalk.gray(`  Time: ${new Date(activity.createTime).toLocaleString()}`));
  lines.push(`  ${activity.content}`);
  lines.push('');

  return lines.join('\n');
}

function formatState(state: string): string {
  switch (state) {
    case 'COMPLETED':
      return chalk.green(state);
    case 'FAILED':
    case 'CANCELLED':
      return chalk.red(state);
    case 'EXECUTING':
      return chalk.yellow(state);
    case 'AWAITING_APPROVAL':
      return chalk.magenta(state);
    default:
      return chalk.gray(state);
  }
}
