import { OAuthTokens } from './oauth.js';

export interface TokenProvider {
  getAuthHeader(): Promise<Record<string, string>>;
}

export class ApiKeyProvider implements TokenProvider {
  constructor(private apiKey: string) {}

  async getAuthHeader(): Promise<Record<string, string>> {
    return { 'X-Goog-Api-Key': this.apiKey };
  }
}

export class OAuthProvider implements TokenProvider {
  private refreshPromise: Promise<OAuthTokens> | null = null;

  constructor(
    private tokens: OAuthTokens,
    private refreshFn: () => Promise<OAuthTokens>
  ) {}

  async getAuthHeader(): Promise<Record<string, string>> {
    // If token is expired or expires in less than 60 seconds, refresh it
    if (Date.now() >= this.tokens.expiresAt - 60_000) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshFn().then(newTokens => {
          this.tokens = newTokens;
          this.refreshPromise = null;
          return newTokens;
        }).catch(err => {
          this.refreshPromise = null;
          throw err;
        });
      }
      await this.refreshPromise;
    }
    return { Authorization: `Bearer ${this.tokens.accessToken}` };
  }

  getTokens(): OAuthTokens {
    return this.tokens;
  }
}
