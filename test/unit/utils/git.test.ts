import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { inferGitHubRepo, gitProvider, pullSessionChanges, diffSessionChanges } from '../../../src/utils/git.js';
import { InvalidArgsError } from '../../../src/utils/errors.js';

describe('Git Utilities', () => {
  describe('inferGitHubRepo', () => {
    let getRemoteUrlSpy: any;

    beforeEach(() => {
      getRemoteUrlSpy = jest.spyOn(gitProvider, 'getRemoteUrl');
    });

    afterEach(() => {
      getRemoteUrlSpy.mockRestore();
    });

    it('should infer repo from https URL', () => {
      getRemoteUrlSpy.mockReturnValue('https://github.com/owner/repo.git');
      expect(inferGitHubRepo()).toBe('owner/repo');
    });

    it('should infer repo from ssh URL', () => {
      getRemoteUrlSpy.mockReturnValue('git@github.com:owner/repo.git');
      expect(inferGitHubRepo()).toBe('owner/repo');
    });

    it('should infer repo from git URL', () => {
      getRemoteUrlSpy.mockReturnValue('git://github.com/owner/repo.git');
      expect(inferGitHubRepo()).toBe('owner/repo');
    });

    it('should infer repo from ssh protocol URL', () => {
      getRemoteUrlSpy.mockReturnValue('ssh://git@github.com/owner/repo.git');
      expect(inferGitHubRepo()).toBe('owner/repo');
    });

    it('should infer repo with trailing slash', () => {
      getRemoteUrlSpy.mockReturnValue('https://github.com/owner/repo/');
      expect(inferGitHubRepo()).toBe('owner/repo');
    });

    it('should infer repo with dots in the name', () => {
      getRemoteUrlSpy.mockReturnValue('https://github.com/owner/my.repo.name.git');
      expect(inferGitHubRepo()).toBe('owner/my.repo.name');
    });

    it('should throw InvalidArgsError if git fails', () => {
      getRemoteUrlSpy.mockImplementation(() => {
        throw new Error('git not found');
      });
      expect(() => inferGitHubRepo()).toThrow(InvalidArgsError);
    });

    it('should throw InvalidArgsError if URL format is unrecognized', () => {
      getRemoteUrlSpy.mockReturnValue('https://gitlab.com/owner/repo');
      expect(() => inferGitHubRepo()).toThrow(InvalidArgsError);
    });
  });

  describe('pullSessionChanges', () => {
    let execSpy: any;
    let execInheritSpy: any;

    beforeEach(() => {
      execSpy = jest.spyOn(gitProvider, 'exec');
      execInheritSpy = jest.spyOn(gitProvider, 'execInherit').mockImplementation(() => {});
    });

    afterEach(() => {
      execSpy.mockRestore();
      execInheritSpy.mockRestore();
    });

    it('should checkout if branch exists locally', () => {
      execSpy.mockReturnValue('  main\n* current\n  session-branch');
      pullSessionChanges('owner/repo', 'session-branch');
      expect(execInheritSpy).toHaveBeenCalledWith('git checkout session-branch');
    });

    it('should fetch and checkout if branch does not exist locally', () => {
      execSpy.mockReturnValue('  main\n* current');
      pullSessionChanges('owner/repo', 'session-branch');
      expect(execInheritSpy).toHaveBeenCalledWith('git fetch origin session-branch:session-branch');
      expect(execInheritSpy).toHaveBeenCalledWith('git checkout session-branch');
    });
  });

  describe('diffSessionChanges', () => {
    let execInheritSpy: any;

    beforeEach(() => {
      execInheritSpy = jest.spyOn(gitProvider, 'execInherit').mockImplementation(() => {});
    });

    afterEach(() => {
      execInheritSpy.mockRestore();
    });

    it('should call git diff', () => {
      diffSessionChanges('session-branch');
      expect(execInheritSpy).toHaveBeenCalledWith('git diff HEAD...session-branch');
    });
  });
});
