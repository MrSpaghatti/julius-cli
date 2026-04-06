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

    // Handle common git remote URL formats:
    // https://github.com/owner/repo.git
    // git@github.com:owner/repo.git
    // https://github.com/owner/repo
    
    let repoPath = '';
    
    if (remoteUrl.startsWith('https://github.com/')) {
      repoPath = remoteUrl.replace('https://github.com/', '');
    } else if (remoteUrl.startsWith('git@github.com:')) {
      repoPath = remoteUrl.replace('git@github.com:', '');
    } else {
      // Try to match anything that looks like github.com/owner/repo
      const match = remoteUrl.match(/github\.com[/:]([^/]+\/[^/.]+)/);
      if (match) {
        repoPath = match[1];
      }
    }

    if (repoPath) {
      // Remove trailing .git if present
      repoPath = repoPath.replace(/\.git$/, '');
      
      const parts = repoPath.split('/');
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
    }

    throw new Error('Could not parse repository path from URL');
  } catch (error) {
    throw new InvalidArgsError(
      'Could not infer GitHub repository from local .git/config. Please provide it with --repo <owner/repo>'
    );
  }
}
