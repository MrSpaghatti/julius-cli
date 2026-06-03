import { execFileSync, spawnSync } from 'child_process';
import { InvalidArgsError } from './errors.js';
import { Output } from '../output/manager.js';

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
    Output.info(`Fetching branch ${branchName} from ${repo} (remote: ${remote})...`);

    // Check if the branch exists locally using exact matching
    let branchExists = false;
    try {
      gitProvider.exec(['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`]);
      branchExists = true;
    } catch (e) {
      // Branch does not exist
    }

    if (branchExists) {
      Output.info(
        `Branch ${branchName} already exists locally. Checking it out...`
      );
      gitProvider.execInherit(['checkout', branchName]);
    } else {
      let fetchRef = `${branchName}:${branchName}`;
      const prMatch = branchName.match(/^(?:pr|mr)\/(\d+)$/i);
      
      if (prMatch) {
        const id = prMatch[1];
        const provider = repo.split('/')[0];
        
        if (provider === 'gitlab') {
          fetchRef = `refs/merge-requests/${id}/head:${branchName}`;
        } else if (provider === 'bitbucket') {
          fetchRef = `refs/pull-requests/${id}/from:${branchName}`;
        } else {
          // Default to GitHub
          fetchRef = `refs/pull/${id}/head:${branchName}`;
        }
      }

      // Try to fetch from the specified remote
      gitProvider.execInherit(['fetch', remote, fetchRef]);
      gitProvider.execInherit(['checkout', branchName]);
    }

    Output.info(`Successfully checked out ${branchName}`);
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
