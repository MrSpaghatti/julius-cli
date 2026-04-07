# Julius CLI Audit Report

This report summarizes the findings of a comprehensive audit of the `julius-cli` codebase (v0.6.0).

## 1. Logic Errors & Bugs

### 1.1 Redundant/Confusing Error Messages (High)
In `src/api/client.ts`, the `handleError` method passes the API's error message as the `id` parameter to the `NotFoundError` constructor.
- **Location:** `src/api/client.ts` (line 89)
- **Effect:** Produces messages like `Resource not found: The session was not found`.
- **Fix:** Pass the actual resource ID or name instead of the error message.

### 1.2 Interactive Mode Header Bug (Medium)
The `headerShown` flag in `src/output/formatter.ts` is a global variable and is never reset in interactive mode.
- **Location:** `src/output/formatter.ts` and `src/commands/interactive.ts`
- **Effect:** Table headers only appear for the first command that uses table format; subsequent commands skip the header.
- **Fix:** Call `resetHeader()` in the interactive loop before executing each command.

### 1.3 Git Substring Match Flaw (Medium)
`src/utils/git.ts` checks if a branch exists using `.includes(branchName)` on the output of `git branch`.
- **Location:** `src/utils/git.ts` (line 74)
- **Effect:** Matches `feature` when only `feature-new` exists.
- **Fix:** Use `git branch --list <branchName>` or exact string matching.

### 1.4 OAuth Token Refresh Race Condition (Medium)
`OAuthProvider.getAuthHeader` triggers a refresh if the token is expiring, but lacks concurrency control.
- **Location:** `src/utils/token-provider.ts` (line 21)
- **Effect:** Simultaneous API requests can trigger multiple refreshes. If refresh token rotation is enabled, all but the first will fail.
- **Fix:** Use a promise-based locking mechanism for the refresh operation.

### 1.5 Device Flow `slow_down` Error (Medium)
The device code flow polling doesn't handle the `slow_down` error specifically.
- **Location:** `src/utils/oauth.ts` (line 144)
- **Effect:** Rejects the login attempt instead of increasing the poll interval as per the OAuth 2.0 spec.
- **Fix:** Update `pollInterval` and continue polling when `slow_down` is received.

---

## 2. Authentication & Security

### 2.1 Inconsistent OAuth Implementation (Low)
`runDeviceCodeFlow` uses standard `fetch` while `runBrowserOAuthFlow` and `refreshAccessToken` use `google-auth-library`.
- **Location:** `src/utils/oauth.ts`
- **Effect:** Architectural inconsistency.
- **Fix:** Port device flow to use `google-auth-library` or standardize on `fetch` with manual helpers.

### 2.2 Unhandled `undefined` Client Secret (Low)
In `src/commands/auth.ts`, `clientSecret` might be stored as `undefined` for device flow.
- **Location:** `src/commands/auth.ts` (line 92)
- **Effect:** Might cause issues in `refreshAccessToken` which expects a string.
- **Fix:** Default to empty string or handle `undefined` in the keychain storage/retrieval.

### 2.3 Webhook Listener Security (Medium)
The local webhook listener defaults to `localhost` for registration if `--host` is missing.
- **Location:** `src/commands/listen.ts` (line 19)
- **Effect:** Webhooks registered with `http://localhost:8080` will fail if the API is remote (standard case). No warning is given to the user.
- **Fix:** Add a warning if `host` is `localhost` and registration is requested.

---

## 3. Performance & Resource Management

### 3.1 Memory Leak in Webhook Listener (Medium)
The `rateLimitMap` in `src/commands/listen.ts` grows indefinitely with every new client IP.
- **Location:** `src/commands/listen.ts` (line 29)
- **Effect:** Slow memory leak if exposed to many IPs.
- **Fix:** Periodically clear old entries or use an LRU cache.

### 3.2 Inefficient Activity Tailing (Low)
The `wait --follow` command fetches all activities from the beginning in every poll if the API doesn't provide a resumption cursor.
- **Location:** `src/commands/wait.ts` (line 88)
- **Effect:** High bandwidth and API usage for sessions with many activities.
- **Fix:** Use a `pageToken` or `minCreateTime` filter if supported by the API.

---

## 4. Documentation & Versioning

### 4.1 Version Mismatch (Low)
`README.md` claims version `0.7.0`, but `package.json` and the CLI output itself say `0.6.0`.
- **Effect:** Confusion about available features (Interactive mode and Templates are marked as `v0.7.0+` but are present in `v0.6.0`).
- **Fix:** Sync versions in `package.json`, `cli.ts`, and `README.md`.

### 4.2 Hallucinated URLs (Low)
The fallback `baseURL` for the API client is `https://jules.googleapis.com/v1alpha`.
- **Location:** `src/api/client.ts` (line 13)
- **Fix:** Verify if this is the correct production endpoint or if it should be an environment-mandated variable only.

---

## 5. Architectural Concerns

### 5.1 Interactive Mode State Bleeding (Medium)
Using `cli.parseAsync` inside the REPL loop might bleed global options (like `--verbose`) between command executions.
- **Location:** `src/commands/interactive.ts` (line 62)
- **Fix:** Create a fresh `Command` instance or sub-command for each execution, or manually reset global options.

### 5.2 Redundant Error Handling (Low)
`createWaitCommand` and `index.ts` both have top-level `.catch(handleError)`.
- **Location:** `src/commands/wait-cli.ts` (line 82) and `src/index.ts` (line 5)
- **Effect:** Redundant code and potentially inconsistent exit behavior.
- **Fix:** Remove local `try/catch` in command actions and rely on the global handler.
