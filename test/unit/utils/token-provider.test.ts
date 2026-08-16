import { ApiKeyProvider } from '../../../src/utils/token-provider.js';

describe('Token Providers', () => {
  describe('ApiKeyProvider', () => {
    it('should return X-Goog-Api-Key header', async () => {
      const apiKey = 'test-api-key';
      const provider = new ApiKeyProvider(apiKey);
      const headers = await provider.getAuthHeader();

      expect(headers).toEqual({ 'X-Goog-Api-Key': apiKey });
    });
  });
});