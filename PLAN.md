# Jules CLI (AI Agent Edition) - Implementation Plan

## Executive Summary

Build a TypeScript CLI tool that wraps the Jules REST API for programmatic control by AI agents. Unlike the official CLI, this tool provides JSON-first output, full API coverage, and non-interactive commands optimized for automation.

---

## Completion Status

- ✅ Phase 1 (Foundation): 100% Complete
- ✅ Phase 2 (Interaction): 100% Complete
- ✅ Phase 3 (Automation): 100% Complete
- ✅ Phase 4 (Polish): 100% Complete
- ✅ Phase 5 (Templates & Git): 100% Complete
- ✅ Phase 6 (Advanced Automation): 100% Complete

---

## Phase 1: Foundation (MVP) ✅ COMPLETED

- [x] Initial project setup (TS, tsup, Jest)
- [x] Secure API key storage (cross-keychain)
- [x] Base API client with retry logic
- [x] Config management system
- [x] JSON and pretty output formatters
- [x] Basic session and source commands

---

## Phase 2: Interaction ✅ COMPLETED

- [x] Session interaction (send message, approve plan)
- [x] Activities API (list/get activities)
- [x] Initial filtering and pagination support

---

## Phase 3: Automation ✅ COMPLETED

- [x] Wait/poll command for synchronous workflows
- [x] Follow mode for real-time activity streaming
- [x] Automatic repository inference from git remote
- [x] Fetch-all-pages utility for complete listings

---

## Phase 4: Polish ✅ COMPLETED

- [x] Unit test suite with >80% coverage
- [x] CI/CD pipeline for automated validation
- [x] Comprehensive error handling and exit codes
- [x] Refined pretty output with colors and state awareness

---

## Phase 5: Templates & Git ✅ COMPLETED

- [x] Session templates for reusable task prompts
- [x] Variable substitution in templates
- [x] Git integration (sessions pull, sessions diff)
- [x] Robust, multi-provider repository inference

---

## Phase 6: Advanced Automation & Interactivity ✅ COMPLETED

### 1. Interactive Mode (REPL) ✅
- [x] Persistent shell session
- [x] Context persistence (e.g., current repository)
- [x] Command chaining and shortcuts

### 2. Webhook Support ✅
- [x] Local listener for session updates
- [x] Register webhooks via API to avoid polling
- [x] Real-time activity streaming via webhooks

### 3. Server-side Filtering ✅
- [x] Efficient filtering for sessions and activities via API
- [x] Reduced client-side processing and quota usage
- [x] Consistent filter syntax across commands

### 4. Codebase Optimization ✅
- [x] Refactor repetitive output logic into common formatters
- [x] Maintain 100% command coverage with unit tests
- [x] Final polish and documentation updates for v0.5.0

---

## Phase 7: Google OAuth Support (Planned)

### 1. OAuth 2.0 Browser Flow
- [ ] `auth login` command — opens browser to Google consent screen, captures auth code via loopback HTTP server, exchanges for access + refresh tokens
- [ ] PKCE (S256) code challenge for security on the loopback redirect
- [ ] Random `state` parameter to prevent CSRF

### 2. Device Code Flow (Headless)
- [ ] `auth login --device-code` — prints URL + code to terminal, polls token endpoint until user completes auth in a separate browser

### 3. Token Storage & Refresh
- [ ] Store OAuth access token + refresh token in system keychain (separate keys from API key)
- [ ] Auto-refresh expired access tokens transparently before each API call
- [ ] `auth logout` alias for `auth clear` that removes all credentials

### 4. API Client Updates
- [ ] `JulesAPIClient` supports both `X-Goog-Api-Key` (API key) and `Authorization: Bearer <token>` (OAuth)
- [ ] Constructor accepts a `TokenProvider` interface — either static API key or live-refreshing OAuth credential
- [ ] `CLIConfig` gains an `authMethod: 'apikey' | 'oauth'` field to track which is active

### 5. Auth Method Resolution Order
Priority (highest first):
1. `JULES_OAUTH_TOKEN` env var → direct Bearer token (CI/automation)
2. `JULES_API_KEY` env var → X-Goog-Api-Key (existing)
3. Stored OAuth tokens via `auth login` → Bearer token with auto-refresh
4. Stored API key via `auth set` → X-Goog-Api-Key (existing)

### 6. New Files
- `src/utils/oauth.ts` — PKCE generation, browser redirect flow, device code flow, token exchange/refresh
- `src/utils/token-provider.ts` — `TokenProvider` interface + `ApiKeyProvider` and `OAuthProvider` implementations

### 7. Updated Files
- `src/commands/auth.ts` — add `login`, `login --device-code`, `logout` subcommands; update `status` to show auth method
- `src/config/index.ts` — add `getOAuthTokens`, `setOAuthTokens`, `clearOAuthTokens`, `getAuthMethod`, `setAuthMethod`
- `src/api/client.ts` — accept `TokenProvider` instead of raw API key string
- `src/api/types.ts` — add `authMethod` to `CLIConfig`
- `src/utils/client.ts` — `getClient()` resolves the active token provider based on priority order

### 8. New Dependency
- `google-auth-library` — Google's official Node.js OAuth2 client; handles token exchange and refresh

### 9. Test Coverage
- Unit tests for PKCE generation (correct length, encoding)
- Unit tests for `OAuthProvider.getToken()` — returns cached token, detects expiry, calls refresh
- Unit tests for auth method resolution in `getClient()`
- Integration tests for `auth login` and `auth status` with mocked Google token endpoints

---

## Future Roadmap

### Phase 8: Advanced Features
- [ ] Batch session creation from a single prompt
- [ ] Group operations (bulk cancel, bulk pull)
- [ ] Cost and quota monitoring tools
- [ ] Session performance analytics

---

## Project Timeline

- **2026-04-06:** v0.1.0 MVP Released
- **2026-04-06:** v0.2.0 Interaction features complete
- **2026-04-06:** v0.3.0 Automation features complete
- **2026-04-06:** v0.4.0 Templates & Git complete
- **2026-04-06:** v0.5.0 Advanced Automation complete
