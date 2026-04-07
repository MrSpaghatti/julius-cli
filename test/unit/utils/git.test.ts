import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { inferRepo, gitProvider, pullSessionChanges, diffSessionChanges } from '../../../src/utils/git.js';
import { InvalidArgsError } from '../../../src/utils/errors.js';

describe('Git Utilities', () => {
  describe('inferRepo', () => {
    let getRemoteUrlSpy: any;

    beforeEach(() => {
      getRemoteUrlSpy = jest.spyOn(gitProvider, 'getRemoteUrl');
    });

    afterEach(() => {
      getRemoteUrlSpy.mockRestore();
    });

    it('should infer repo from https URL', () => {
      getRemoteUrlSpy.mockReturnValue('https://github.com/owner/repo.git');
      expect(inferRepo()).toEqual({ provider: 'github', repo: 'owner/repo' });
    });

    it('should infer repo from ssh URL', () => {
      getRemoteUrlSpy.mockReturnValue('git@github.com:owner/repo.git');
      expect(inferRepo()).toEqual({ provider: 'github', repo: 'owner/repo' });
    });

    it('should infer repo from git URL', () => {
      getRemoteUrlSpy.mockReturnValue('git://github.com/owner/repo.git');
      expect(inferRepo()).toEqual({ provider: 'github', repo: 'owner/repo' });
    });

    it('should infer repo from ssh protocol URL', () => {
      getRemoteUrlSpy.mockReturnValue('ssh://git@github.com/owner/repo.git');
      expect(inferRepo()).toEqual({ provider: 'github', repo: 'owner/repo' });
    });

    it('should infer repo with trailing slash', () => {
      getRemoteUrlSpy.mockReturnValue('https://github.com/owner/repo/');
      expect(inferRepo()).toEqual({ provider: 'github', repo: 'owner/repo' });
    });

    it('should infer repo with dots in the name', () => {
      getRemoteUrlSpy.mockReturnValue('https://github.com/owner/my.repo.name.git');
      expect(inferRepo()).toEqual({ provider: 'github', repo: 'owner/my.repo.name' });
    });

    it('should throw InvalidArgsError if git fails', () => {
      getRemoteUrlSpy.mockImplementation(() => {
        throw new Error('git not found');
      });
      expect(() => inferRepo()).toThrow(InvalidArgsError);
    });

    it('should throw InvalidArgsError if URL format is unrecognized', () => {
      getRemoteUrlSpy.mockReturnValue('https://unknown.com/owner/repo');
      expect(() => inferRepo()).toThrow(InvalidArgsError);
    });
  });

  describe('pullSessionChanges', () => {
    let execSpy: any;
    let execInheritSpy: any;

    beforeEach(() => {
      execSpy = jest.spyOn(gitProvider, 'exec').mockImplementation(() => '');
      execInheritSpy = jest.spyOn(gitProvider, 'execInherit').mockImplementation(() => {});
    });

    afterEach(() => {
      execSpy.mockRestore();
      execInheritSpy.mockRestore();
    });

    it('should checkout if branch exists locally (exact match)', () => {
      // Mock show-ref success
      execSpy.mockImplementation((args: string[]) => {
        if (args[0] === 'show-ref' && args[3] === 'refs/heads/session-branch') {
          return '';
        }
        throw new Error('Not found');
      });

      pullSessionChanges('owner/repo', 'session-branch');
      
      expect(execSpy).toHaveBeenCalledWith(['show-ref', '--verify', '--quiet', 'refs/heads/session-branch']);
      expect(execInheritSpy).toHaveBeenCalledWith(['checkout', 'session-branch']);
    });

    it('should fetch and checkout if branch does not exist locally', () => {
      // Mock show-ref failure
      execSpy.mockImplementation(() => {
        throw new Error('Not found');
      });

      pullSessionChanges('owner/repo', 'session-branch');
      
      expect(execSpy).toHaveBeenCalledWith(['show-ref', '--verify', '--quiet', 'refs/heads/session-branch']);
      expect(execInheritSpy).toHaveBeenCalledWith(['fetch', 'origin', 'session-branch:session-branch']);
      expect(execInheritSpy).toHaveBeenCalledWith(['checkout', 'session-branch']);
    });

    it('should handle PR branch for GitHub', () => {
      execSpy.mockImplementation(() => { throw new Error('Not found'); });
      
      pullSessionChanges('github/owner/repo', 'pr/123');
      
      expect(execInheritSpy).toHaveBeenCalledWith(['fetch', 'origin', 'refs/pull/123/head:pr/123']);
    });

    it('should handle MR branch for GitLab', () => {
      execSpy.mockImplementation(() => { throw new Error('Not found'); });
      
      pullSessionChanges('gitlab/owner/repo', 'mr/456');
      
      expect(execInheritSpy).toHaveBeenCalledWith(['fetch', 'origin', 'refs/merge-requests/456/head:mr/456']);
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
      expect(execInheritSpy).toHaveBeenCalledWith(['diff', 'HEAD...session-branch']);
    });
  });
});
