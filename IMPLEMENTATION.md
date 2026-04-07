# Julius CLI Implementation Details

**Version:** 0.6.0  
**Project:** julius-cli  

This document provides a detailed overview of the architectural decisions and implementation patterns used in the **julius-cli** project.

## Core Architecture

### 1. API Client (`src/api/client.ts`)
- Built on top of `axios`.
- Uses `axios-retry` for automatic handling of transient errors (5xx, 429).
- Employs a `TokenProvider` strategy for request authentication, injecting headers via Axios request interceptors.
- Supports both `JULES_API_URL` and `JULES_API_ENDPOINT` environment variables.

### 2. Authentication Strategy (`src/utils/token-provider.ts`)
- **ApiKeyProvider:** Injects `X-Goog-Api-Key`.
- **OAuthProvider:** Injects `Authorization: Bearer <token>` and handles automatic refreshes when the token is near expiration (within 60s).
- Uses a priority-chain resolution in `getClient()` to determine the active auth method.

### 3. OAuth Implementation (`src/utils/oauth.ts`)
- **Browser Flow:** Implements PKCE (Proof Key for Code Exchange) with a local loopback server. Features a 5-minute timeout and SIGINT handling for security.
- **Device Code Flow:** Headless polling for authentication on restricted environments.
- **Refresh Flow:** Securely uses stored client credentials to refresh access tokens.

### 4. Configuration Management (`src/config/index.ts`)
- **ConfigManager:** Uses the `conf` package for non-sensitive settings (endpoints, formats, polling intervals).
- **Secure Storage:** Leverages `cross-keychain` to store API keys and OAuth secrets in the OS-level keychain.

### 5. Output Formatting (`src/output/`)
- **JSON:** Default machine-readable output.
- **Pretty:** Colorized, human-readable terminal output using `chalk`.
- **Table:** Column-based data views using `cli-table3`.
- **Streaming Support:** Optimized for continuous updates (e.g., activity tailing) by suppressing redundant headers.

### 6. Command System (`src/commands/`)
- Powered by `commander`.
- Logic is modularized into feature-based groups (auth, sessions, activities, etc.).
- Global error handling via `CLIError` ensure consistent exit codes and user-friendly error messages.

### 7. Git Integration (`src/utils/git.ts`)
- Inferred repository detection from local `.git` config.
- Automated branch fetching and diffing to streamline the workflow between the CLI and local development environment.

## Key Performance & Security Features

- **Efficient Tailing:** The `wait --follow` command persists `nextPageToken` to avoid re-fetching the entire activity history on each poll.
- **Secure Webhooks:** The `listen` command uses HMAC-SHA256 signature verification and rate limiting to protect against malicious input.
- **Payload Integrity:** Uses `Buffer` accumulation in the webhook listener to ensure correct UTF-8 handling across network chunks.
- **Safe Pagination:** The `fetchAllPages` utility avoids recursive spread operations to prevent stack overflow on large datasets.

## Testing Strategy

- **Unit Tests:** Exhaustive coverage for individual utilities, API methods, and command logic using `jest`.
- **Integration Tests:** End-to-end flows verifying command interactions, authentication resolution, and API contract integrity.
- **Mocks:** Uses `msw` (Mock Service Worker) for reliable API simulation in test environments.
