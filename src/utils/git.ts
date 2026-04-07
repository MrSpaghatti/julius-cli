import { execSync } from 'child_process';
import { InvalidArgsError } from './errors.js';

/**
 * Internal wrapper for execSync to allow mocking in tests.
 */
export const gitProvider = {
  getRemoteUrl(remote: string): string {
    return execSync(`git remote get-url ${remote}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf-8',
    }).trim();
  },
  exec(command: string, options: any = {}): string {
    return execSync(command, options).toString();
  },
  execInherit(command: string): void {
    execSync(command, { stdio: 'inherit' });
  },
};

/**
 * Attempts to infer the GitHub owner/repo from the local git configuration.
 */
export function inferGitHubRepo(): string {
  try {
    // Try to get the remote URL for 'origin'
    const remoteUrl = gitProvider.getRemoteUrl('origin');

    if (!remoteUrl) {
      throw new Error('No remote URL found');
    }

    // Comprehensive regex for GitHub URL patterns
    // Matches:
    // https://github.com/owner/repo[.git]
    // git@github.com:owner/repo[.git]
    // git://github.com/owner/repo[.git]
    // ssh://git@github.com/owner/repo[.git]
    const githubRegex = /(?:(?:https?|git|ssh):\/\/|git@)github\.com[/:]([^/]+\/[^/\s]+?)(?:\.git)?\/?$/;
    const match = remoteUrl.match(githubRegex);

    if (match && match[1]) {
      const parts = match[1].split('/');
      return `${parts[0]}/${parts[1]}`;
    }


    throw new Error(`Could not parse repository path from URL: ${remoteUrl}`);
  } catch (error) {
    throw new InvalidArgsError(
      'Could not infer GitHub repository from local .git/config. Please provide it with --repo <owner/repo>'
    );
  }
}

/**
 * Fetches and checks out a branch or PR from GitHub.
 */
export function pullSessionChanges(repo: string, branchName: string): void {
  try {
    console.log(`Fetching branch ${branchName} from ${repo}...`);

    // Check if the branch exists locally
    const branches = gitProvider.exec('git branch');
    if (branches.includes(branchName)) {
      console.log(
        `Branch ${branchName} already exists locally. Checking it out...`
      );
      gitProvider.execInherit(`git checkout ${branchName}`);
    } else {
      // Try to fetch from origin
      gitProvider.execInherit(`git fetch origin ${branchName}:${branchName}`);
      gitProvider.execInherit(`git checkout ${branchName}`);
    }

    console.log(`Successfully checked out ${branchName}`);
  } catch (error) {
    throw new Error(`Failed to pull changes: ${(error as Error).message}`);
  }
}

/**
 * Shows the diff between the current branch and the session branch.
 */
export function diffSessionChanges(branchName: string): void {
  try {
    gitProvider.execInherit(`git diff HEAD...${branchName}`);
  } catch (error) {
    throw new Error(`Failed to show diff: ${(error as Error).message}`);
  }
}
