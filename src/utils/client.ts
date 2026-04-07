import { config } from '../config/index.js';
import { JulesAPIClient } from '../api/client.js';
import { AuthError } from './errors.js';

export async function getClient(): Promise<JulesAPIClient> {
  const apiKey = await config.getApiKey();
  if (!apiKey) {
    throw new AuthError(
      'No API key found.',
      'Set one with: jules-cli auth set <key>'
    );
  }
  return new JulesAPIClient(apiKey, config.getApiEndpoint());
}
