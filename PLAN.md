# Jules CLI (AI Agent Edition) - Comprehensive Implementation Plan

> **IMPLEMENTATION NOTE (2026-04-06):** This document represents the original comprehensive plan.  
> The current implementation (v0.1.0) covers ~85% of Phase 1-2 features. See STATUS.md for actual implementation status.  
> Notable deviations: cross-keychain used for secure API key storage,
> auth/ directory structure consolidated into commands/auth.ts.
## Executive Summary

Build a TypeScript CLI tool that wraps the Jules REST API for programmatic control by AI agents (Claude, Copilot, Gemini, etc.). Unlike the official `@google/jules` CLI which focuses on human interaction with TUIs, this tool provides JSON-first output, full API coverage, and non-interactive commands optimized for automation and AI agent workflows.

---

## Problem Statement

The official Jules CLI (`@google/jules`) is designed for human developers with:
- Interactive TUI dashboards
- Browser-based authentication flows  
- Limited command coverage (mainly create/list/pull)
- Human-readable output only

**AI agents need:**
- Machine-readable JSON output
- Full REST API access (sessions, activities, messages, plan approval)
- Non-interactive authentication
- Scriptable, composable commands
- Clear exit codes and error handling
- Real-time progress monitoring
- Filtering and search capabilities

---

## Goals

### Primary Goals
1. **Complete API Coverage**: All Jules REST API endpoints accessible via CLI
2. **JSON-First Design**: Structured output parsable by AI agents
3. **Non-Interactive**: All operations scriptable without human input
4. **Status Transparency**: Clear session states, progress tracking, error reporting
5. **Composability**: Commands chain together for complex workflows

### Secondary Goals
- Human-readable pretty output (opt-in via `--format pretty`)
- Configuration file support for defaults
- Wait/poll utilities for synchronous workflows
- Local git integration for PR management

### Non-Goals
- TUI/interactive dashboards (use official CLI)
- Web UI replacement
- Built-in code editor
- Session execution engine (that's Jules' job)

---

## Architecture

### Project Structure
```
jules-cli-but-better/
├── package.json
├── tsconfig.json
├── .npmignore
├── README.md
├── LICENSE
├── src/
│   ├── index.ts                 # Main CLI entry point
│   ├── cli.ts                   # Commander setup and command routing
│   ├── config/
│   │   ├── index.ts             # Config management
│   │   └── schema.ts            # Config validation
│   ├── auth/
│   │   ├── index.ts             # Auth commands
│   │   ├── keystore.ts          # API key storage
│   │   └── validator.ts         # API key validation
│   ├── api/
│   │   ├── client.ts            # Base HTTP client
│   │   ├── types.ts             # API request/response types
│   │   ├── sources.ts           # Sources API endpoints
│   │   ├── sessions.ts          # Sessions API endpoints
│   │   └── activities.ts        # Activities API endpoints
│   ├── commands/
│   │   ├── sources.ts           # Sources commands
│   │   ├── sessions.ts          # Sessions commands
│   │   ├── activities.ts        # Activities commands
│   │   ├── config.ts            # Config commands
│   │   └── wait.ts              # Wait/poll command
│   ├── output/
│   │   ├── formatter.ts         # Output format dispatcher
│   │   ├── json.ts              # JSON formatter
│   │   ├── pretty.ts            # Human-readable formatter
│   │   └── table.ts             # Table formatter
│   └── utils/
│       ├── errors.ts            # Error types and handling
│       ├── pagination.ts        # Pagination helpers
│       └── polling.ts           # Polling/retry logic
├── test/
│   ├── unit/
│   └── integration/
└── examples/
    └── ai-agent-workflows.md    # Example scripts for AI agents
```

### Technology Stack

**Core:**
- TypeScript 5.x - Type safety and better DX (using ESM module system)
- Node.js 18+ - LTS runtime with native ESM support
- Commander.js 11.x - CLI framework with subcommands

**HTTP & API:**
- Axios 1.x - HTTP client with interceptors
- axios-retry - Automatic retry with exponential backoff

**Configuration & Storage:**
- conf - Cross-platform config storage (plaintext - keytar-rs not implemented)

**Output:**
- chalk 5.x - Terminal colors (ESM, required for pretty mode)
- cli-table3 - ASCII tables for list output
- ora - Spinners for long operations (required for pretty mode)

**Testing:**
- Jest - Unit and integration testing
- ts-jest - TypeScript transformer for Jest
- MSW - Mock Service Worker for API mocking

**Build & Distribution:**
- esbuild or tsup - Fast bundling
- npm - Package distribution

---

## Data Models

### TypeScript Interfaces

```typescript
// Core API Types (from Jules REST API)

interface Source {
  name: string;              // "sources/github/owner/repo"
  id: string;                // "github/owner/repo"
  githubRepo?: {
    owner: string;
    repo: string;
  };
}

interface Session {
  name: string;              // "sessions/123456789"
  id: string;                // "123456789"
  title: string;
  sourceContext: {
    source: string;
    githubRepoContext?: {
      startingBranch: string;
    };
  };
  prompt: string;
  automationMode?: 'NONE' | 'AUTO_CREATE_PR';
  requirePlanApproval?: boolean;
  state?: 'PENDING' | 'PLANNING' | 'AWAITING_APPROVAL' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  outputs?: SessionOutput[];
  createTime?: string;       // ISO 8601
  updateTime?: string;       // ISO 8601
}

interface SessionOutput {
  pullRequest?: {
    url: string;
    title: string;
    description: string;
  };
  branch?: {
    name: string;
  };
}

interface Activity {
  name: string;              // "sessions/123/activities/456"
  id: string;                // "456"
  type: 'PLAN' | 'MESSAGE' | 'PROGRESS' | 'ERROR';
  content: string;
  author: 'USER' | 'AGENT';
  createTime: string;        // ISO 8601
}

interface PaginatedResponse<T> {
  items: T[];
  nextPageToken?: string;    // Opaque cursor-based pagination token
  totalSize?: number;
}

// CLI Configuration

interface CLIConfig {
  apiKey?: string;
  apiEndpoint?: string;      // Default: https://jules.googleapis.com/v1alpha (must be HTTPS)
  defaultFormat?: 'json' | 'pretty' | 'quiet';
  defaultPageSize?: number;  // Default: 30, max: 100
  pollInterval?: number;     // Default: 5000ms
  maxPollAttempts?: number;  // Default: 120 (= 600s when pollInterval is 5000ms)
}

// Command Options

interface CreateSessionOptions {
  repo: string;              // GitHub repo (owner/repo or "." for cwd)
  prompt: string;
  title?: string;
  branch?: string;           // Starting branch
  autoCreatePr?: boolean;    // Enable AUTO_CREATE_PR mode
  requireApproval?: boolean; // Require plan approval
  format?: OutputFormat;
}

interface ListSessionsOptions {
  repo?: string;             // Filter by repository
  state?: SessionState[];    // Filter by state(s)
  since?: string;            // ISO 8601 date
  pageSize?: number;
  pageToken?: string;
  format?: OutputFormat;
}

interface SendMessageOptions {
  sessionId: string;
  message: string;
  format?: OutputFormat;
}

type OutputFormat = 'json' | 'pretty' | 'quiet';
type SessionState = 'PENDING' | 'PLANNING' | 'AWAITING_APPROVAL' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
```

---

## API Client Specification

### Base Client

```typescript
// src/api/client.ts

class JulesAPIClient {
  private baseURL: string;
  private apiKey: string;
  private axios: AxiosInstance;

  constructor(apiKey: string, baseURL?: string) {
    this.apiKey = apiKey;
    this.baseURL = baseURL || 'https://jules.googleapis.com/v1alpha';
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-Goog-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    // Add retry logic
    axiosRetry(this.axios, {
      retries: 3,
      retryDelay: exponentialDelay,
      retryCondition: (error) => {
        return isNetworkOrIdempotentRequestError(error) ||
               error.response?.status === 429; // Rate limit
      },
      onRetry: (retryCount, error, requestConfig) => {
        // Respect Retry-After header for rate limiting
        const retryAfter = error.response?.headers['retry-after'];
        if (retryAfter) {
          const delayMs = parseInt(retryAfter) * 1000;
          return delayMs;
        }
      },
    });
  }

  // Low-level HTTP methods
  async get<T>(path: string, params?: any): Promise<T>;
  async post<T>(path: string, data?: any): Promise<T>;
  async put<T>(path: string, data?: any): Promise<T>;
  async delete<T>(path: string): Promise<T>;
}
```

### Sources API

```typescript
// src/api/sources.ts

interface SourcesAPI {
  // GET /v1alpha/sources
  list(pageSize?: number, pageToken?: string): Promise<PaginatedResponse<Source>>;
  
  // GET /v1alpha/sources/{source_id}
  get(sourceId: string): Promise<Source>;
}
```

### Sessions API

```typescript
// src/api/sessions.ts

interface SessionsAPI {
  // POST /v1alpha/sessions
  create(params: {
    prompt: string;
    sourceContext: {
      source: string;
      githubRepoContext?: {
        startingBranch: string;
      };
    };
    automationMode?: 'NONE' | 'AUTO_CREATE_PR';
    requirePlanApproval?: boolean;
    title?: string;
  }): Promise<Session>;

  // GET /v1alpha/sessions
  list(params?: {
    pageSize?: number;
    pageToken?: string;
    // Note: Filtering implemented client-side, not by API
  }): Promise<PaginatedResponse<Session>>;

  // GET /v1alpha/sessions/{session_id}
  get(sessionId: string): Promise<Session>;

  // POST /v1alpha/sessions/{session_id}:sendMessage
  sendMessage(sessionId: string, prompt: string): Promise<void>;

  // POST /v1alpha/sessions/{session_id}:approvePlan
  approvePlan(sessionId: string): Promise<void>;

  // POST /v1alpha/sessions/{session_id}:cancel
  // Note: Verify endpoint availability in API documentation
  cancel?(sessionId: string): Promise<void>;
}
```

### Activities API

```typescript
// src/api/activities.ts

interface ActivitiesAPI {
  // GET /v1alpha/sessions/{session_id}/activities
  list(sessionId: string, params?: {
    pageSize?: number;
    pageToken?: string;
    // Note: type/author filtering implemented client-side
  }): Promise<PaginatedResponse<Activity>>;

  // GET /v1alpha/sessions/{session_id}/activities/{activity_id}
  get(sessionId: string, activityId: string): Promise<Activity>;
}
```

---

## Command Specifications

### Global Flags

All commands support:
- `--format <json|pretty|quiet>` - Output format (default: json)
- `--no-color` - Disable colored output
- `--api-key <key>` - Override API key
- `--api-endpoint <url>` - Override API endpoint
- `--verbose` - Enable debug logging
- `--help` - Show help

### Exit Codes
- `0` - Success
- `1` - General error
- `2` - Authentication error (invalid/missing API key)
- `3` - API error (request failed, rate limited)
- `4` - Not found (session, source, activity)
- `5` - Invalid arguments
- `6` - Timeout
- `7` - Network error (connectivity issue)

---

### `jules-cli auth`

Manage authentication and API keys.

#### `jules-cli auth set <api-key>`
Store API key for future use.

```bash
jules-cli auth set sk_1234567890abcdef
```

**Output (JSON):**
```json
{
  "status": "success",
  "message": "API key stored successfully"
}
```

#### `jules-cli auth status`
Check if API key is configured and valid.

```bash
jules-cli auth status
```

**Output (JSON):**
```json
{
  "authenticated": true,
  "source": "config",  // "config" | "environment"
  "valid": true,
  "endpoint": "https://jules.googleapis.com/v1alpha"
}
```

#### `jules-cli auth clear`
Remove stored API key.

```bash
jules-cli auth clear
```

**Output (JSON):**
```json
{
  "status": "success",
  "message": "API key removed"
}
```

---

### `jules-cli sources`

Manage GitHub repositories connected to Jules.

#### `jules-cli sources list`
List all connected repositories.

**Flags:**
- `--page-size <n>` - Results per page (default: 30, max: 100)
- `--page-token <token>` - Pagination token from previous response

```bash
jules-cli sources list --format json
```

**Output (JSON):**
```json
{
  "sources": [
    {
      "name": "sources/github/owner/repo",
      "id": "github/owner/repo",
      "githubRepo": {
        "owner": "owner",
        "repo": "repo"
      }
    }
  ],
  "nextPageToken": "abc123",
  "totalSize": 42
}
```

**Output (Pretty):**
```
Connected Repositories:

owner/repo
  ID: github/owner/repo
  Name: sources/github/owner/repo

anotherowner/anotherrepo
  ID: github/anotherowner/anotherrepo
  Name: sources/github/anotherowner/anotherrepo

Total: 42 repositories
Next page: jules-cli sources list --page-token abc123
```

#### `jules-cli sources get <source-id>`
Get details for a specific source.

```bash
jules-cli sources get github/owner/repo
```

**Output (JSON):**
```json
{
  "name": "sources/github/owner/repo",
  "id": "github/owner/repo",
  "githubRepo": {
    "owner": "owner",
    "repo": "repo"
  }
}
```

---

### `jules-cli sessions`

Manage Jules coding sessions.

#### `jules-cli sessions create`
Create a new session.

**Flags:**
- `--repo <owner/repo>` - GitHub repository (required, or use `.` for current directory)
- `--prompt <text>` - Task description (required)
- `--title <text>` - Session title (optional, defaults to prompt)
- `--branch <name>` - Starting branch (default: main)
- `--auto-pr` - Automatically create PR when complete
- `--require-approval` - Require explicit plan approval before execution
- `--wait` - Block until session completes (implies --follow)
- `--follow` - Stream activity updates in real-time

```bash
jules-cli sessions create \
  --repo owner/repo \
  --prompt "Add user authentication with JWT" \
  --title "Auth Feature" \
  --branch develop \
  --auto-pr \
  --format json
```

**Output (JSON):**
```json
{
  "session": {
    "name": "sessions/123456789",
    "id": "123456789",
    "title": "Auth Feature",
    "sourceContext": {
      "source": "sources/github/owner/repo",
      "githubRepoContext": {
        "startingBranch": "develop"
      }
    },
    "prompt": "Add user authentication with JWT",
    "automationMode": "AUTO_CREATE_PR",
    "requirePlanApproval": false,
    "state": "PENDING"
    // createTime and updateTime populated by API after creation
  }
}
```

**Infer repo from current directory:**
```bash
cd ~/projects/myrepo
jules-cli sessions create --repo . --prompt "Fix login bug"
# Automatically detects github.com/owner/myrepo from git remote
# Supports both SSH (git@github.com:owner/repo.git) and HTTPS formats
# Only works with GitHub remotes (not GitLab, Bitbucket, etc.)
```

#### `jules-cli sessions list`
List sessions with optional filtering.

**Flags:**
- `--repo <owner/repo>` - Filter by repository (client-side)
- `--state <state>` - Filter by state (can repeat, client-side)
  - States: `PENDING`, `PLANNING`, `AWAITING_APPROVAL`, `EXECUTING`, `COMPLETED`, `FAILED`, `CANCELLED`
- `--since <date>` - Show sessions created after date (ISO 8601, client-side)
- `--page-size <n>` - Results per page (default: 30)
- `--page-token <token>` - Pagination token

```bash
# List all running sessions (client-side filtering)
jules-cli sessions list --state EXECUTING --state PLANNING

# List completed sessions for specific repo (client-side filtering)
jules-cli sessions list --repo owner/repo --state COMPLETED

# List recent sessions (client-side filtering)
jules-cli sessions list --since 2026-04-01T00:00:00Z
```

**Output (JSON):**
```json
{
  "sessions": [
    {
      "name": "sessions/123456789",
      "id": "123456789",
      "title": "Auth Feature",
      "sourceContext": {
        "source": "sources/github/owner/repo",
        "githubRepoContext": {
          "startingBranch": "main"
        }
      },
      "prompt": "Add user authentication",
      "state": "EXECUTING",
      "createTime": "2026-04-06T20:00:00Z",
      "updateTime": "2026-04-06T20:30:00Z"
    }
  ],
  "nextPageToken": "xyz789",
  "totalSize": 15
}
```

**Output (Pretty):**
```
Sessions:

[EXECUTING] 123456789 - Auth Feature
  Repo: owner/repo
  Created: 2026-04-06 20:00:00
  Prompt: Add user authentication

[COMPLETED] 987654321 - Bug Fix
  Repo: owner/repo
  Created: 2026-04-06 19:00:00
  PR: https://github.com/owner/repo/pull/42

Total: 15 sessions
```

#### `jules-cli sessions get <session-id>`
Get detailed information about a session.

```bash
jules-cli sessions get 123456789
```

**Output (JSON):**
```json
{
  "name": "sessions/123456789",
  "id": "123456789",
  "title": "Auth Feature",
  "sourceContext": {
    "source": "sources/github/owner/repo",
    "githubRepoContext": {
      "startingBranch": "main"
    }
  },
  "prompt": "Add user authentication",
  "automationMode": "AUTO_CREATE_PR",
  "state": "COMPLETED",
  "outputs": [
    {
      "pullRequest": {
        "url": "https://github.com/owner/repo/pull/42",
        "title": "Add user authentication with JWT",
        "description": "This PR implements JWT-based authentication..."
      }
    }
  ],
  "createTime": "2026-04-06T20:00:00Z",
  "updateTime": "2026-04-06T20:45:00Z"
}
```

#### `jules-cli sessions send <session-id> <message>`
Send a message to an active session.

```bash
jules-cli sessions send 123456789 "Also add unit tests for the auth flow"
```

**Output (JSON):**
```json
{
  "status": "success",
  "message": "Message sent to session 123456789"
}
```

**Note:** Response appears in next activity. Use `jules-cli activities list <session-id>` to see agent's reply.

#### `jules-cli sessions approve <session-id>`
Approve the plan for a session awaiting approval.

**Note:** Returns error if session is not in `AWAITING_APPROVAL` state.

```bash
jules-cli sessions approve 123456789
```

**Output (JSON):**
```json
{
  "status": "success",
  "message": "Plan approved for session 123456789",
  "session": {
    "id": "123456789",
    "state": "EXECUTING"
  }
}
```

**Error Example (wrong state):**
```json
{
  "error": {
    "code": "INVALID_STATE",
    "message": "Session 123456789 is not awaiting approval",
    "details": "Current state: EXECUTING. Can only approve sessions in AWAITING_APPROVAL state."
  }
}
```

#### `jules-cli sessions cancel <session-id>`
Cancel a running session.

**Note:** Verify this endpoint exists in API documentation before implementation.

```bash
jules-cli sessions cancel 123456789
```

**Output (JSON):**
```json
{
  "status": "success",
  "message": "Session 123456789 cancelled",
  "session": {
    "id": "123456789",
    "state": "CANCELLED"
  }
}
```

---

### `jules-cli activities`

View activity logs for sessions.

#### `jules-cli activities list <session-id>`
List all activities in a session.

**Flags:**
- `--page-size <n>` - Results per page (default: 30)
- `--page-token <token>` - Pagination token
- `--type <type>` - Filter by activity type (PLAN, MESSAGE, PROGRESS, ERROR) (client-side)
- `--author <author>` - Filter by author (USER, AGENT) (client-side)

```bash
jules-cli activities list 123456789
```

**Output (JSON):**
```json
{
  "activities": [
    {
      "name": "sessions/123456789/activities/1",
      "id": "1",
      "type": "PLAN",
      "author": "AGENT",
      "content": "I'll implement JWT authentication by...",
      "createTime": "2026-04-06T20:01:00Z"
    },
    {
      "name": "sessions/123456789/activities/2",
      "id": "2",
      "type": "PROGRESS",
      "author": "AGENT",
      "content": "Created auth middleware in src/auth/middleware.ts",
      "createTime": "2026-04-06T20:05:00Z"
    },
    {
      "name": "sessions/123456789/activities/3",
      "id": "3",
      "type": "MESSAGE",
      "author": "USER",
      "content": "Also add unit tests",
      "createTime": "2026-04-06T20:10:00Z"
    }
  ],
  "nextPageToken": null,
  "totalSize": 3
}
```

**Output (Pretty):**
```
Activities for session 123456789:

[20:01:00] AGENT (PLAN):
I'll implement JWT authentication by...

[20:05:00] AGENT (PROGRESS):
Created auth middleware in src/auth/middleware.ts

[20:10:00] USER (MESSAGE):
Also add unit tests

Total: 3 activities
```

#### `jules-cli activities get <session-id> <activity-id>`
Get a specific activity.

```bash
jules-cli activities get 123456789 1
```

**Output (JSON):**
```json
{
  "name": "sessions/123456789/activities/1",
  "id": "1",
  "type": "PLAN",
  "author": "AGENT",
  "content": "I'll implement JWT authentication by creating...",
  "createTime": "2026-04-06T20:01:00Z"
}
```

---

### `jules-cli wait <session-id>`

Block until a session reaches a terminal state (completed, failed, cancelled).

**Flags:**
- `--timeout <seconds>` - Maximum wait time (default: 600 seconds / 10 minutes)
- `--poll-interval <ms>` - Polling interval (default: 5000ms)
  - Note: Total polls = timeout / (poll-interval / 1000)
- `--follow` - Stream activity updates while waiting

```bash
# Wait for session to complete (block for up to 10 minutes)
jules-cli wait 123456789

# Wait with custom timeout and follow
jules-cli wait 123456789 --timeout 1800 --follow
```

**Output (JSON):**
```json
{
  "sessionId": "123456789",
  "finalState": "COMPLETED",
  "duration": 2456,
  "session": {
    "name": "sessions/123456789",
    "id": "123456789",
    "state": "COMPLETED",
    "outputs": [
      {
        "pullRequest": {
          "url": "https://github.com/owner/repo/pull/42",
          "title": "Add user authentication",
          "description": "..."
        }
      }
    ]
  }
}
```

**Exit codes:**
- `0` - Session completed successfully
- `1` - Session failed
- `6` - Timeout reached

**With --follow flag (Pretty mode):**
```
⠋ Waiting for session 123456789...

[20:01:00] AGENT: Creating plan...
[20:05:00] AGENT: Implementing auth middleware...
[20:10:00] AGENT: Writing tests...
[20:15:00] AGENT: Creating PR...

✓ Session completed in 14m 32s
  PR: https://github.com/owner/repo/pull/42
```

---

### `jules-cli config`

Manage CLI configuration.

#### `jules-cli config set <key> <value>`
Set a configuration value.

**Supported keys:**
- `apiKey` - Jules API key
- `apiEndpoint` - API base URL
- `defaultFormat` - Default output format (json|pretty|quiet)
- `defaultPageSize` - Default page size for list commands
- `pollInterval` - Default polling interval (ms)
- `maxPollAttempts` - Max polling attempts for wait command

```bash
jules-cli config set defaultFormat pretty
jules-cli config set apiEndpoint https://jules.googleapis.com/v1alpha
```

**Output (JSON):**
```json
{
  "status": "success",
  "key": "defaultFormat",
  "value": "pretty"
}
```

#### `jules-cli config get <key>`
Get a configuration value.

```bash
jules-cli config get defaultFormat
```

**Output (JSON):**
```json
{
  "key": "defaultFormat",
  "value": "pretty"
}
```

#### `jules-cli config list`
List all configuration values.

```bash
jules-cli config list
```

**Output (JSON):**
```json
{
  "config": {
    "apiKey": "sk_***************cdef",
    "apiEndpoint": "https://jules.googleapis.com/v1alpha",
    "defaultFormat": "json",
    "defaultPageSize": 30,
    "pollInterval": 5000,
    "maxPollAttempts": 120
  }
}
```

#### `jules-cli config reset`
Reset configuration to defaults (keeps API key).

```bash
jules-cli config reset
```

---

## Configuration File Format

**Location:** `~/.config/jules-cli/config.json` (primary)
- Fallback: `~/.julesrc` (for backward compatibility)

**Format (JSON):**
```json
{
  "apiKey": "sk_1234567890abcdef",
  "apiEndpoint": "https://jules.googleapis.com/v1alpha",
  "defaultFormat": "json",
  "defaultPageSize": 30,
  "pollInterval": 5000,
  "maxPollAttempts": 120
}
```

**Priority (highest to lowest):**
1. Command-line flags (`--api-key`, `--format`, etc.)
2. Environment variables (`JULES_API_KEY`, `JULES_API_ENDPOINT`)
3. Config file (`~/.config/jules-cli/config.json`, then `~/.julesrc`)
4. Built-in defaults

---

## Error Handling

### Error Response Format (JSON)

```json
{
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid API key",
    "details": "The provided API key is invalid or has been revoked",
    "hint": "Run 'jules-cli auth set <key>' to configure a valid API key"
  }
}
```

### Error Codes

| Code | HTTP Status | Exit Code | Description |
|------|-------------|-----------|-------------|
| `AUTHENTICATION_FAILED` | 401 | 2 | Invalid or missing API key |
| `PERMISSION_DENIED` | 403 | 2 | Insufficient permissions |
| `NOT_FOUND` | 404 | 4 | Resource not found |
| `INVALID_ARGUMENT` | 400 | 5 | Invalid command arguments |
| `RATE_LIMITED` | 429 | 3 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | 1 | API internal error |
| `TIMEOUT` | - | 6 | Request timeout |
| `NETWORK_ERROR` | - | 7 | Network connectivity issue |
| `INVALID_STATE` | 400 | 5 | Invalid session state for operation |
| `SESSION_CANCELLED` | 409 | 1 | Session already cancelled |

### Retry Logic

- Automatic retry for transient errors (network, 429, 5xx)
- Exponential backoff: 1s, 2s, 4s
- Max 3 retry attempts
- Not retried: 400, 401, 403, 404

---

## AI Agent Integration Patterns

### Pattern 1: Create and Monitor Session

```bash
#!/bin/bash

# Create session and extract ID
SESSION_ID=$(jules-cli sessions create \
  --repo . \
  --prompt "Fix authentication bug in login flow" \
  --auto-pr \
  --format json | jq -r '.session.id')

echo "Created session: $SESSION_ID"

# Wait for completion (blocks up to 10 minutes)
jules-cli wait "$SESSION_ID" --format json > result.json

# Check exit code
if [ $? -eq 0 ]; then
  PR_URL=$(jq -r '.session.outputs[0].pullRequest.url' result.json)
  echo "Success! PR created: $PR_URL"
else
  echo "Session failed"
  exit 1
fi
```

### Pattern 2: List and Filter Sessions

```bash
# Find all running sessions for a repo
jules-cli sessions list \
  --repo owner/repo \
  --state executing \
  --state planning \
  --format json | jq '.sessions[] | {id, title, state}'
```

### Pattern 3: Send Follow-up Message

```bash
# Create session
SESSION_ID=$(jules-cli sessions create \
  --repo . \
  --prompt "Add user profile page" \
  --format json | jq -r '.session.id')

# Wait for plan
sleep 10

# Check activities for plan
jules-cli activities list "$SESSION_ID" --format json | jq '.activities[] | select(.type == "PLAN")'

# Send follow-up
jules-cli sessions send "$SESSION_ID" "Also add profile editing functionality"
```

### Pattern 4: Conditional Plan Approval

```bash
# Create session requiring approval
SESSION_ID=$(jules-cli sessions create \
  --repo . \
  --prompt "Refactor database layer" \
  --require-approval \
  --format json | jq -r '.session.id')

# Poll for plan with timeout
TIMEOUT=300  # 5 minutes
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  STATE=$(jules-cli sessions get "$SESSION_ID" --format json | jq -r '.state')
  if [ "$STATE" == "AWAITING_APPROVAL" ]; then
    break
  elif [ "$STATE" == "FAILED" ] || [ "$STATE" == "CANCELLED" ]; then
    echo "Session ended before approval: $STATE"
    exit 1
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
  echo "Timeout waiting for plan approval state"
  exit 6
fi

# Get plan content
PLAN=$(jules-cli activities list "$SESSION_ID" --format json | jq -r '.activities[] | select(.type == "PLAN") | .content')

# AI agent analyzes plan here...
echo "Plan: $PLAN"

# Approve
jules-cli sessions approve "$SESSION_ID"
```

### Pattern 5: Batch Session Creation

```bash
# Create multiple sessions in parallel with error handling
REPOS=("owner/repo1" "owner/repo2" "owner/repo3")
PROMPT="Update dependencies to latest versions"
PIDS=()

for repo in "${REPOS[@]}"; do
  jules-cli sessions create \
    --repo "$repo" \
    --prompt "$PROMPT" \
    --auto-pr \
    --format json > "session-${repo//\//-}.json" &
  PIDS+=($!)
done

# Wait and check exit codes
FAILED=0
for i in "${!PIDS[@]}"; do
  wait "${PIDS[$i]}"
  if [ $? -ne 0 ]; then
    echo "Failed to create session for ${REPOS[$i]}"
    FAILED=$((FAILED + 1))
  fi
done

echo "Sessions created: $((${#REPOS[@]} - FAILED)) succeeded, $FAILED failed"
```

---

## Implementation Phases

### Phase 1: Foundation (MVP)
**Goal:** Basic CLI with auth and core session management

**Tasks:**
1. Project setup (package.json, tsconfig, directory structure)
2. Authentication module (API key storage, validation)
3. Base API client (HTTP client with auth headers)
4. Config system (read/write ~/.julesrc)
5. Output formatters (JSON, basic pretty print)
6. Error handling foundation
7. Basic commands:
   - `auth set/status/clear`
   - `sessions create/list/get`
   - `sources list`

**Deliverable:** AI agents can create and list sessions with JSON output

### Phase 2: Interaction
**Goal:** Full session interaction capabilities

**Tasks:**
1. Implement `sessions send` (message sending)
2. Implement `sessions approve` (plan approval)
3. Implement `activities list/get`
4. Add filtering to `sessions list` (by state, repo, date)
5. Improve error messages with actionable hints
6. Add retry logic with exponential backoff

**Deliverable:** AI agents can fully interact with active sessions

### Phase 3: Automation
**Goal:** Advanced features for automation workflows

**Tasks:**
1. Implement `wait` command (blocking poll)
2. Add `--follow` flag for real-time activity streaming
3. Implement `sessions cancel`
4. Add pagination support for all list commands
5. Repo inference from current directory (git remote)
6. Pretty output mode with colors and tables
7. Comprehensive error handling with exit codes

**Deliverable:** AI agents can orchestrate complex workflows

### Phase 4: Polish
**Goal:** Production-ready tool

**Tasks:**
1. Unit tests (>80% coverage)
2. Integration tests with mocked API
3. README with examples and API reference
4. CLI help text for all commands
5. Performance optimization (caching, connection pooling)
6. Security audit (API key storage, input validation)
7. npm package publishing setup (include .d.ts type definitions)
8. Cross-platform validation (Linux, macOS, Windows)

**Deliverable:** Public npm package ready for distribution

---

## Testing Strategy

### Unit Tests
- API client methods (mocked HTTP)
- Config read/write operations
- Output formatters (JSON, pretty, quiet)
- Error handling and retry logic
- Pagination helpers
- Polling logic

### Integration Tests
- Full command execution (mocked API with MSW)
- Config file loading priority
- Environment variable precedence
- Error scenarios (401, 404, 429, 500)
- Pagination flows

### Manual Testing
- Real API integration (verify Jules API endpoints exist)
- Authentication flows
- Session creation and monitoring
- Activity streaming
- Cross-platform compatibility (Linux, macOS, Windows with both cmd and PowerShell)
- Verify cancel endpoint availability before implementing

---

## Security Considerations

1. **API Key Storage**
   - Store in config file with restricted permissions (chmod 600)
   - Consider keytar for OS keychain integration
   - Never log API keys (mask in output)
   - Clear text warning if key exposed in CLI args

2. **Input Validation**
   - Sanitize all user input before API calls
   - Validate session IDs (string containing digits only, e.g., "123456789")
   - Validate source names (format: github/owner/repo)
   - Limit prompt length to prevent abuse (max 10,000 characters)
   - Validate apiEndpoint is HTTPS URL when set

3. **Network Security**
   - Always use HTTPS for API calls
   - Validate SSL certificates
   - Timeout on requests (30s default)
   - No credential caching in memory

---

## Performance Targets

- Command startup: < 200ms (cold start)
- Session creation: < 2s (API latency)
- Session listing: < 1s (30 results)
- Activity listing: < 1s (100 activities)
- Wait command: Poll every 5s, max 10 minutes
- Memory usage: < 80MB (Node.js baseline ~30MB + dependencies)

---

## Documentation Requirements

### README.md
- Installation (npm install -g)
- Quick start guide
- Authentication setup
- Command reference (all commands with examples)
- AI agent integration examples (Bash, PowerShell, Python)
- Troubleshooting common errors
- Contributing guide
- TypeScript type definitions for programmatic use

### examples/ai-agent-workflows.md
- Bash scripts for common workflows (Linux/macOS)
- PowerShell scripts for common workflows (Windows)
- Python examples (for AI agents using subprocess)
- Node.js examples (using child_process)
- Error handling patterns
- Retry strategies

### CLI Help Text
- Brief description for each command
- Usage syntax with required/optional args
- Examples for common use cases
- Related commands

---

## Future Enhancements (Post-MVP)

1. **Session Templates**
   - Predefined prompts for common tasks
   - Template variables for customization
   - `jules-cli templates list/get/use`

2. **Local Git Integration**
   - Automatic PR branch fetching
   - Merge PR from CLI
   - Diff preview before pulling

3. **Webhooks**
   - Real-time notifications via webhook
   - Avoid polling for long-running sessions

4. **Session Grouping**
   - Tag sessions for organization
   - Bulk operations on tagged sessions

5. **Cost Tracking**
   - Track API usage and costs
   - Budget alerts

6. **Interactive Mode**
   - Optional REPL for command chaining
   - Session state persistence across commands

7. **Export/Import**
   - Export session history as JSON
   - Import templates from other users

---

## Success Criteria

**MVP Success:**
- AI agent can create session programmatically ✓
- AI agent can monitor session progress ✓
- AI agent can interact with active session ✓
- All output is JSON-parsable ✓
- Clear error handling with exit codes ✓

**Production Success:**
- Published to npm registry ✓
- Documentation complete ✓
- 3 example workflows for AI agents ✓
- Test coverage > 80% ✓
- Cross-platform compatibility ✓

**Adoption Success:**
- Used by 10+ AI agent projects
- Positive feedback on ease of use
- Feature requests from real users
- Active maintenance and bug fixes

---

## References

- Jules REST API: https://jules.google/docs/api/reference/
- Official Jules CLI: https://jules.google/docs/cli/reference
- Commander.js Docs: https://github.com/tj/commander.js
- Axios Docs: https://axios-http.com/
- Node.js Best Practices: https://github.com/goldbergyoni/nodebestpractices
tps://axios-http.com/
- Node.js Best Practices: https://github.com/goldbergyoni/nodebestpractices
