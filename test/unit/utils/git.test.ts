import { jest } from '@jest/globals';
import { inferGitHubRepo, gitProvider } from '../../../src/utils/git.js';
import { InvalidArgsError } from '../../../src/utils/errors.js';

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
    
    const result = inferGitHubRepo();
    expect(result).toBe('owner/repo');
    expect(getRemoteUrlSpy).toHaveBeenCalledWith('origin');
  });

  it('should infer repo from ssh URL', () => {
    getRemoteUrlSpy.mockReturnValue('git@github.com:owner/repo.git');
    
    const result = inferGitHubRepo();
    expect(result).toBe('owner/repo');
  });

  it('should infer repo from https URL without .git', () => {
    getRemoteUrlSpy.mockReturnValue('https://github.com/owner/repo');
    
    const result = inferGitHubRepo();
    expect(result).toBe('owner/repo');
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
