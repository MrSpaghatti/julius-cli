import { generatePKCE } from '../../../src/utils/oauth.js';

describe('OAuth Utilities', () => {
  describe('generatePKCE', () => {
    it('should generate a verifier and a challenge', () => {
      const { verifier, challenge } = generatePKCE();
      
      expect(verifier).toBeDefined();
      expect(challenge).toBeDefined();
      expect(typeof verifier).toBe('string');
      expect(typeof challenge).toBe('string');
      
      // Check base64url format (roughly)
      expect(verifier).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(challenge).toMatch(/^[a-zA-Z0-9_-]+$/);
      
      // Verifier should be roughly 43 chars (for 32 bytes)
      expect(verifier.length).toBeGreaterThanOrEqual(43);
    });

    it('should generate different PKCE values each time', () => {
      const pkce1 = generatePKCE();
      const pkce2 = generatePKCE();
      
      expect(pkce1.verifier).not.toEqual(pkce2.verifier);
      expect(pkce1.challenge).not.toEqual(pkce2.challenge);
    });
  });
});
