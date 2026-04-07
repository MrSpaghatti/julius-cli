# Next Session Prompt: Julius CLI v0.6.0 — Google OAuth Support

We have just completed v0.5.1 (audit fixes: HMAC webhook verification, rate limiting, config validation, integration tests). The next phase is **v0.6.0: Google OAuth 2.0 support** alongside the existing API key flow.

---

## Current State

- **Version:** 0.5.1 (tagged as 0.5.0 in package.json — bump to 0.6.0 on release)
- **Tests:** 120 passing, build clean
- **Key commit:** `570d7d8` (latest)

### Auth today (API key only)
- `auth set <key>` → stores in system keychain via `cross-keychain`
- `auth clear` → removes from keychain
- `auth status` → pings API to verify key
- `src/utils/client.ts` `getClient()` → reads API key, constructs `JulesAPIClient(apiKey, endpoint)`
- `JulesAPIClient` constructor takes a plain `apiKey: string`, sets `X-Goog-Api-Key` header on all requests

---

## What to Implement

### 1. New dependency

Install `google-auth-library`:
```bash
npm install google-auth-library
```

This provides `OAuth2Client` for PKCE browser flow, device code flow, token exchange, and auto-refresh.

---

### 2. New file: `src/utils/oauth.ts`

Responsible for the OAuth browser and device code flows.

**Browser flow (PKCE + loopback):**
```typescript
export async function runBrowserOAuthFlow(clientId: string, clientSecret: string, scopes: string[]): Promise<OAuthTokens>
```
- Generate PKCE verifier (`crypto.randomBytes(32).toString('base64url')`) and challenge (`SHA256(verifier)`)
- Generate random `state` parameter
- Find an available localhost port (try 3000+, use `net.createServer`)
- Build Google auth URL: `https://accounts.google.com/o/oauth2/v2/auth?...`
- Open the URL in the default browser (`open` package or `child_process.exec` with platform-specific command)
- Start a temporary HTTP server on localhost to catch the redirect
- Exchange the code + code_verifier for tokens via Google token endpoint
- Return `{ accessToken, refreshToken, expiresAt }`

**Device code flow:**
```typescript
export async function runDeviceCodeFlow(clientId: string, scopes: string[]): Promise<OAuthTokens>
```
- POST to `https://oauth2.googleapis.com/device/code`
- Print `user_code` and `verification_url` to console
- Poll `https://oauth2.googleapis.com/token` every `interval` seconds until authorized or timed out

**Token refresh:**
```typescript
export async function refreshAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<{ accessToken: string; expiresAt: number }>
```

**OAuthTokens type:**
```typescript
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;     // unix ms
  email?: string;        // from id_token if present
}
```

---

### 3. New file: `src/utils/token-provider.ts`

Abstracts auth so `JulesAPIClient` doesn't care which method is active.

```typescript
export interface TokenProvider {
  getAuthHeader(): Promise<Record<string, string>>;
}

export class ApiKeyProvider implements TokenProvider {
  constructor(private apiKey: string) {}
  async getAuthHeader() { return { 'X-Goog-Api-Key': this.apiKey }; }
}

export class OAuthProvider implements TokenProvider {
  constructor(private tokens: OAuthTokens, private refreshFn: () => Promise<OAuthTokens>) {}
  async getAuthHeader() {
    if (Date.now() >= this.tokens.expiresAt - 60_000) {
      this.tokens = await this.refreshFn();
      // persist updated tokens via config
    }
    return { 'Authorization': `Bearer ${this.tokens.accessToken}` };
  }
}
```

---

### 4. Update `src/api/client.ts`

Change constructor signature:
```typescript
// Before
constructor(apiKey: string, baseURL: string)

// After
constructor(private tokenProvider: TokenProvider, baseURL: string)
```

Replace the static `X-Goog-Api-Key` header with a dynamic header injected per-request using an Axios request interceptor:
```typescript
this.axios.interceptors.request.use(async (config) => {
  const headers = await this.tokenProvider.getAuthHeader();
  Object.assign(config.headers, headers);
  return config;
});
```

Remove the static `headers` block from `axios.create()`.

---

### 5. Update `src/config/index.ts`

Add methods for OAuth token storage:
```typescript
// Store/retrieve tokens as JSON in keychain (separate key from API key)
async getOAuthTokens(): Promise<OAuthTokens | undefined>
async setOAuthTokens(tokens: OAuthTokens): Promise<void>
async clearOAuthTokens(): Promise<void>

// Track which auth method is active in the Conf file
getAuthMethod(): 'apikey' | 'oauth' | undefined
setAuthMethod(method: 'apikey' | 'oauth'): void
```

Note: Use a different keychain account name for OAuth tokens (e.g., `ACCOUNT_NAME_OAUTH = 'oauth-tokens'`) to avoid colliding with the existing API key entry.

Also add `authMethod` to the `Conf` schema:
```typescript
authMethod: {
  type: 'string',
  enum: ['apikey', 'oauth'],
  default: 'apikey',
}
```

And add to `CLIConfig` in `src/api/types.ts`:
```typescript
authMethod?: 'apikey' | 'oauth';
```

---

### 6. Update `src/utils/client.ts`

`getClient()` needs to resolve the active token provider using the priority chain:

```
Priority (highest first):
1. JULES_OAUTH_TOKEN env var → OAuthProvider (no refresh, static token)
2. JULES_API_KEY env var → ApiKeyProvider
3. Stored OAuth tokens (authMethod === 'oauth') → OAuthProvider with refresh
4. Stored API key → ApiKeyProvider
```

```typescript
export async function getClient(): Promise<JulesAPIClient> {
  // 1. Env OAuth token
  if (process.env.JULES_OAUTH_TOKEN) {
    const provider = new OAuthProvider({ accessToken: process.env.JULES_OAUTH_TOKEN, ... }, ...);
    return new JulesAPIClient(provider, config.getApiEndpoint());
  }
  // 2. Env API key
  if (process.env.JULES_API_KEY) {
    return new JulesAPIClient(new ApiKeyProvider(process.env.JULES_API_KEY), config.getApiEndpoint());
  }
  // 3. Stored OAuth
  const oauthTokens = await config.getOAuthTokens();
  if (oauthTokens && config.getAuthMethod() === 'oauth') {
    const provider = new OAuthProvider(oauthTokens, async () => { /* refresh + persist */ });
    return new JulesAPIClient(provider, config.getApiEndpoint());
  }
  // 4. Stored API key
  const apiKey = await config.getApiKey();
  if (apiKey) {
    return new JulesAPIClient(new ApiKeyProvider(apiKey), config.getApiEndpoint());
  }
  throw new AuthError('No credentials found.', 'Run: jules-cli auth login  OR  jules-cli auth set <api-key>');
}
```

---

### 7. Update `src/commands/auth.ts`

Add subcommands:

**`auth login`**
```bash
jules-cli auth login [--client-id <id>] [--client-secret <secret>] [--device-code]
```
- Default: browser PKCE flow
- `--device-code`: device code flow
- `--client-id` / `--client-secret`: optional override (falls back to env: `JULES_GOOGLE_CLIENT_ID`, `JULES_GOOGLE_CLIENT_SECRET`)
- On success: stores tokens via `config.setOAuthTokens()`, sets `config.setAuthMethod('oauth')`
- Prints confirmation with user email if available

**`auth logout`** (alias for `auth clear`)
```bash
jules-cli auth logout
```
- Calls `config.clearApiKey()` + `config.clearOAuthTokens()` + `config.setAuthMethod('apikey')`

**Update `auth status`**
- Show `authMethod: 'oauth' | 'apikey'`
- For OAuth: show token expiry and `email` if stored
- For API key: existing behavior

**OAuth scopes to request:**
```
https://www.googleapis.com/auth/cloud-platform
```
(Standard scope for Jules/Gemini APIs — verify against actual API if possible.)

---

### 8. New env vars to document

- `JULES_OAUTH_TOKEN` — inject a Bearer token directly (CI/automation)
- `JULES_GOOGLE_CLIENT_ID` — OAuth client ID (alternative to `--client-id` flag)
- `JULES_GOOGLE_CLIENT_SECRET` — OAuth client secret

---

### 9. Test coverage to add

**Unit tests (`test/unit/utils/oauth.test.ts`):**
- PKCE verifier is 43+ chars base64url
- PKCE challenge is correctly SHA256 hashed
- Token provider returns `X-Goog-Api-Key` for ApiKeyProvider
- OAuthProvider returns `Authorization: Bearer` header
- OAuthProvider auto-refreshes when `expiresAt` is within 60s of now

**Unit tests (`test/unit/commands/auth.test.ts` — extend existing):**
- `auth login` calls OAuth flow and stores tokens
- `auth logout` clears API key + OAuth tokens
- `auth status` shows auth method and email for OAuth

**Update existing mocks:**
- `test/unit/commands/wait-cli.test.ts` and others that mock `config` will need `getOAuthTokens`, `getAuthMethod` added to the mock object
- `src/utils/client.ts` mock in various tests may need updating

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/utils/oauth.ts` | Create — PKCE, browser flow, device flow, token refresh |
| `src/utils/token-provider.ts` | Create — TokenProvider interface + ApiKeyProvider + OAuthProvider |
| `src/api/client.ts` | Modify — accept TokenProvider, use request interceptor for auth header |
| `src/api/types.ts` | Modify — add `authMethod` to CLIConfig |
| `src/config/index.ts` | Modify — add OAuth token methods, authMethod schema |
| `src/commands/auth.ts` | Modify — add login, logout; update status |
| `src/utils/client.ts` | Modify — priority-chain token provider resolution |
| `package.json` | Modify — add `google-auth-library` |
| `test/unit/utils/oauth.test.ts` | Create |
| `test/unit/commands/auth.test.ts` | Extend |
| Various test mocks | Update to include new config methods |

---

## Notes / Caveats

- **OAuth client credentials**: Users must supply their own Google OAuth 2.0 client ID and secret registered for a "Desktop app" application type in Google Cloud Console. Document this clearly. A future enhancement could embed default credentials.
- **Token storage security**: Store the full JSON `OAuthTokens` object as a serialized string in the keychain under account `oauth-tokens`. Don't store in the `Conf` file.
- **Browser opening**: Use `child_process.exec` with `xdg-open` (Linux), `open` (macOS), `start` (Windows) rather than adding a new dependency. Or check if `open` package is already indirectly available.
- **Loopback redirect**: Google allows `http://localhost:<port>` as a redirect URI for Desktop apps. The port must be registered in the Google Cloud Console (wildcard ports allowed for localhost).
- **Backward compatibility**: `JulesAPIClient` signature change is breaking — all call sites that pass a raw API key string need updating. `getClient()` in `src/utils/client.ts` is the only public factory — update it and all tests that construct `JulesAPIClient` directly.

---

## Implementation Order (suggested)

1. `npm install google-auth-library`
2. `src/utils/oauth.ts` — write PKCE helpers and device flow (browser flow is more complex, do it after)
3. `src/utils/token-provider.ts` — TokenProvider interface
4. `src/api/types.ts` — add `authMethod` to CLIConfig
5. `src/config/index.ts` — add OAuth methods
6. `src/api/client.ts` — accept TokenProvider
7. `src/utils/client.ts` — priority chain
8. `src/commands/auth.ts` — add login/logout/update status
9. Update all unit test mocks
10. Add `test/unit/utils/oauth.test.ts`
11. `npm run build && npm test` — all green
12. Bump version to `0.6.0` in `package.json`
