export interface TokenProvider {
  getAuthHeader(): Promise<Record<string, string>>;
}

export class ApiKeyProvider implements TokenProvider {
  constructor(private apiKey: string) {}

  async getAuthHeader(): Promise<Record<string, string>> {
    return { 'X-Goog-Api-Key': this.apiKey };
  }
}