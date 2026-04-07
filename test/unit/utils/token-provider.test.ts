import { jest } from '@jest/globals';
import { ApiKeyProvider, OAuthProvider } from '../../../src/utils/token-provider.js';

describe('Token Providers', () => {
  describe('ApiKeyProvider', () => {
    it('should return X-Goog-Api-Key header', async () => {
      const apiKey = 'test-api-key';
      const provider = new ApiKeyProvider(apiKey);
      const headers = await provider.getAuthHeader();
      
      expect(headers).toEqual({ 'X-Goog-Api-Key': apiKey });
    });
  });

  describe('OAuthProvider', () => {
    const tokens = {
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 3600_000,
    };

    it('should return Authorization Bearer header', async () => {
      const refreshFn = jest.fn<any>().mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        expiresAt: Date.now() + 3600_000,
      });
      const provider = new OAuthProvider(tokens, refreshFn);
      const headers = await provider.getAuthHeader();
      
      expect(headers).toEqual({ Authorization: 'Bearer test-token' });
      expect(refreshFn).not.toHaveBeenCalled();
    });

    it('should refresh token if expired', async () => {
      const expiredTokens = {
        ...tokens,
        expiresAt: Date.now() - 1000,
      };
      const newTokens = {
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        expiresAt: Date.now() + 3600_000,
      };
      const refreshFn = jest.fn<any>().mockResolvedValue(newTokens);
      const provider = new OAuthProvider(expiredTokens, refreshFn);
      
      const headers = await provider.getAuthHeader();
      
      expect(refreshFn).toHaveBeenCalled();
      expect(headers).toEqual({ Authorization: 'Bearer new-token' });
      expect(provider.getTokens()).toEqual(newTokens);
    });

    it('should refresh token if expiring soon', async () => {
      const expiringSoonTokens = {
        ...tokens,
        expiresAt: Date.now() + 30_000, // 30 seconds from now (less than 60s)
      };
      const newTokens = {
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        expiresAt: Date.now() + 3600_000,
      };
      const refreshFn = jest.fn<any>().mockResolvedValue(newTokens);
      const provider = new OAuthProvider(expiringSoonTokens, refreshFn);
      
      const headers = await provider.getAuthHeader();
      
      expect(refreshFn).toHaveBeenCalled();
      expect(headers).toEqual({ Authorization: 'Bearer new-token' });
    });
  });
});
