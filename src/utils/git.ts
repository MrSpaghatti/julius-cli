import { execFileSync, spawnSync } from 'child_process';
import { InvalidArgsError } from './errors.js';

export interface RepoInfo {
  provider: string;
  repo: string;
}

/**
 * Internal wrapper for execSync to allow mocking in tests.
 */
export const gitProvider = {
  getRemoteUrl(remote: string): string {
    return execFileSync('git', ['remote', 'get-url', remote], {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf-8',
    }).trim();
  },
  exec(args: string[], options: any = {}): string {
    return execFileSync('git', args, options).toString();
  },
  execInherit(args: string[]): void {
    spawnSync('git', args, { stdio: 'inherit' });
  },
};

/**
 * Attempts to infer the repository from the local git configuration.
 */
export function inferRepo(): RepoInfo {
  const remotes = ['origin', 'upstream', 'fork'];
  let remoteUrl = '';

  for (const remote of remotes) {
    try {
      remoteUrl = gitProvider.getRemoteUrl(remote);
      if (remoteUrl) break;
    } catch (e) {
      // Ignore and try the next remote
    }
  }

  if (!remoteUrl) {
    throw new InvalidArgsError(
      'Could not infer repository from local .git/config. Please provide it with --repo <[provider/]owner/repo>'
    );
  }

  // Regex to match github, gitlab, bitbucket etc.
  const providerRegex = /(?:(?:https?|git|ssh):\/\/|git@)(github\.com|gitlab\.com|bitbucket\.org)[/:]([^/]+\/[^\s/]+?)(?:\.git)?\/?$/;
  const match = remoteUrl.match(providerRegex);

  if (match && match[1] && match[2]) {
    const provider = match[1].split('.')[0]; // github, gitlab, bitbucket
    return { provider, repo: match[2] };
  }

  throw new InvalidArgsError(`Could not parse repository path from URL: ${remoteUrl}`);
}

/**
 * Fetches and checks out a branch or PR from a provider.
 */
export function pullSessionChanges(repo: string, branchName: string): void {
  try {
    // Determine remote if possible, default to origin
    const remote = 'origin';
    console.log(`Fetching branch ${branchName} from ${repo} (remote: ${remote})...`);

    // Check if the branch exists locally
    const branches = gitProvider.exec(['branch']);
    if (branches.includes(branchName)) {
      console.log(
        `Branch ${branchName} already exists locally. Checking it out...`
      );
      gitProvider.execInherit(['checkout', branchName]);
    } else {
      // Try to fetch from the specified remote
      gitProvider.execInherit(['fetch', remote, `${branchName}:${branchName}`]);
      gitProvider.execInherit(['checkout', branchName]);
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
    gitProvider.execInherit(['diff', `HEAD...${branchName}`]);
  } catch (error) {
    throw new Error(`Failed to show diff: ${(error as Error).message}`);
  }
}
