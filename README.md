# julius-cli v0.9.0

AI-first CLI for Jules REST API with JSON output and full automation support.

## Overview

Unlike the official `@google/jules` CLI which focuses on human interaction with TUIs, this tool provides:

- **Multi-Provider Support** - Support for GitHub, GitLab, and Bitbucket.
- **JSON-first output** - Machine-readable output for AI agents
- **Full API coverage** - All Jules REST API endpoints accessible via CLI
- **Non-interactive & Interactive** - Support for both automation and human-in-the-loop workflows
- **Clear exit codes** - Proper error handling for automation
- **Composability** - Commands chain together for complex workflows

## Installation

**Note:** This package is not yet published to npm. For now, install locally:

```bash
# Clone the repository
git clone <repository-url>
cd julius-cli

# Install dependencies
npm install

# Build the project
npm run build

# Link globally for local development
npm link

# Or run directly
./dist/index.js <command>
```

Once published, you'll be able to install with:
```bash
npm install -g julius-cli
# or
npx julius-cli <command>
```

## Quick Start

### Option A: API Key (current)

1. **Set your API key:**
```bash
julius-cli auth set YOUR_API_KEY
```

### Option B: Google OAuth (v0.6.0+)

1. **Login with your Google account:**
```bash
julius-cli auth login
# Opens browser → consent → tokens stored automatically

# Headless / SSH environments:
julius-cli auth login --device-code
```

2. **List connected repositories:**
```bash
julius-cli sources list
```

3. **Create a session:**
```bash
julius-cli sessions create \
  --repo owner/repo \
  --prompt "Fix the bug in auth.ts" \
  --title "Bug fix"
```

4. **Check session status:**
```bash
julius-cli sessions get <session-id>
```

5. **Start Interactive Mode (v0.7.0+):**
```bash
julius-cli interactive --repo owner/repo
```

### Terminal Dashboard (TUI) 🆕

Launch a real-time terminal dashboard for monitoring and managing sessions (v0.7.0+):

```bash
julius-cli tui
```

The TUI dashboard features:
- **Live session list** with state-colored indicators (green=completed, yellow=executing, red=failed, etc.)
- **Real-time activity stream** — fetch and display session activities as they arrive
- **Chat panel** — press `Enter` on a session to open a conversation view with text input; `Esc` to exit
- **Session creation** — press `c` to create a new session with prompt, repo, and title
- **Approve plans** — approve sessions awaiting plan review inline
- **Cancel sessions** — cancel active sessions from the dashboard
- **Multi-select batch ops (v0.9.0)** — press `space` to toggle selection on a row, then `p`/`x` act on all selected instead of the single row
- **Repo filter** — press `r` to filter sessions by repository name
- **Creator filter (v0.9.0)** — press `u` to filter sessions by creator email
- **Search** — press `/` to search sessions by repo, title, or ID (client-side)
- **State filtering** — press `1-7` to filter sessions by state (PENDING→CANCELLED), `a` for all
- **Keyboard navigation** — `↑↓` to select, `Enter` for chat, `q` to quit

### Interactive Mode (REPL) 🆕

Maintain session context across multiple commands with in-process execution (v0.7.0+).

```bash
# Start interactive mode
julius-cli interactive [--repo owner/repo]

# Short alias
julius-cli i
```

In interactive mode:
- **Fast Execution**: Commands run in-process for low latency.
- **Macros**: Define a sequence of commands with `macro <name> <cmd...>` and run with `!<name>`.
- **Tab-completion**: Use `<Tab>` to see available commands.
- **Context Preservation**: Use `repo <provider/owner/repo>` to change the default repository context.
- Type `help` for commands, `exit` or `quit` to leave.

### Templates 🆕

Manage session prompt templates locally (v0.7.0+).

```bash
# List templates
julius-cli templates list

# Create a template interactively
julius-cli templates create

# Edit/Delete/Import
julius-cli templates edit <id>
julius-cli templates delete <id>
julius-cli templates import <file.json>

# Use a template
julius-cli templates use <id> [vars...]
```

### Webhook Listener 🆕

Listen for real-time session updates without polling the API.

```bash
# Start local webhook listener
julius-cli listen --port 8080

# Start listener and automatically register it for a session
julius-cli listen --register <session-id> --host https://your-public-url.com
```

### Daemon Mode 🆕

Background monitoring with system/agent notifications (v0.7.1+). Run as a foreground process, or start/stop a background daemon:

```bash
# Foreground — events printed to terminal
julius-cli daemon
julius-cli daemon --json              # JSON-formatted events
julius-cli daemon --interval 15       # Poll every 15 seconds (default: 30)

# Background — detached daemon with PID file
julius-cli daemon start
julius-cli daemon stop
julius-cli daemon status
```

The daemon monitors all sessions and sends **system notifications** (via `node-notifier`) for:
- **State changes** — any session state transition
- **Needs approval** — when a session is awaiting plan approval
- **New messages** — agent responses in active sessions
- **Completion/Failure** — terminal state reached
- **Errors** — polling failures (daemon auto-stops after 10 consecutive errors)

Configuration (`~/.config/julius-cli/config.json`):
```json
{
  "daemon": {
    "pollInterval": 30000,
    "notifications": ["system", "agent"]
  }
}
```

### Sessions

```bash
# Create a new session (auto-infers provider from git remote)
# --repo format: [provider/]owner/repo (e.g., github/myorg/myrepo)
julius-cli sessions create \
  --repo owner/repo \
  --prompt "Your task description" \
  [--title "Session title"] \
  [--branch "starting-branch"] \
  [--auto-pr] \
  [--require-approval] \
  [--wait] \
  [--follow]

# List all sessions (now with server-side filtering)
julius-cli sessions list \
  [--repo [provider/]owner/repo] \
  [--state PENDING EXECUTING COMPLETED] \
  [--page-size 30] \
  [--page-token abc123] \
  [--all] # Fetch all pages

# Get session details
julius-cli sessions get <session-id>

# Pull session changes (supports MR/PR formats like pr/123)
julius-cli sessions pull <session-id>

# Show local diff of session's proposed changes
julius-cli sessions diff <session-id>
```

### Wait/Poll

```bash
# Block until a session completes (or fails/cancels)
julius-cli wait <session-id>

# Block and stream real-time activity updates
julius-cli wait <session-id> --follow

# Wait for multiple sessions simultaneously
julius-cli wait <session-id-1> <session-id-2> <session-id-3>

# Wait for a specific state with activity type filtering
julius-cli wait <session-id> --state AWAITING_APPROVAL --activity-type PLAN MESSAGE
```

### Batch Operations

Create, cancel, or inspect multiple sessions at once (v0.8.0+).

```bash
# Batch create from JSON file
julius-cli sessions batch-create ./tasks.json

# Batch create from text file (one prompt per line, # for comments)
julius-cli sessions batch-create ./prompts.txt --repo owner/repo --title-prefix "Sprint-42"

# Batch create and wait for all to complete
julius-cli sessions batch-create ./tasks.json --wait

# Control parallelism (default: 5, max: 20)
julius-cli sessions batch-create ./tasks.json --concurrency 10

# Cancel multiple sessions
julius-cli sessions batch-cancel session-id-1 session-id-2 session-id-3

# Inspect branch info for multiple completed sessions
julius-cli sessions batch-pull session-id-1 session-id-2
```

JSON batch file format:
```json
[
  { "prompt": "Fix the auth bug", "repo": "owner/repo", "title": "Auth fix", "autoPr": true },
  { "prompt": "Add dark mode", "repo": "owner/repo", "requireApproval": true }
]
```

Text batch file format (one prompt per line, `#` for comments):
```
# Sprint 42 tasks
Fix the auth bug
Add dark mode support
Refactor error handling
```

### Configuration

```bash
# Set configuration values (apiKey, apiEndpoint, defaultFormat, defaultPageSize)
julius-cli config set defaultFormat table

# Get a configuration value
julius-cli config get defaultFormat

# List all configuration values
julius-cli config list
```

### Shell Completion 🆕

Generate shell completion scripts for bash and zsh (v0.7.1+):

```bash
# Generate bash completion
julius-cli completion bash

# Generate zsh completion
julius-cli completion zsh

# Source directly (bash example)
source <(julius-cli completion bash)
```

## Output Formats

All commands support multiple output formats via the `--format` flag:

- `json` (default) - Structured JSON output for parsing
- `pretty` - Human-readable colored output
- `table` - Clean tabular display for lists
- `quiet` - Suppress output (useful for scripting)

```bash
# JSON output (default)
julius-cli sessions list

# Pretty output with colors
julius-cli sessions list --format pretty

# Table output
julius-cli sources list --format table

# Quiet mode (no output)
julius-cli auth set $API_KEY --format quiet
```

## Pagination & Filtering

List commands (`sessions list`, `sources list`, `activities list`) support server-side pagination and filtering (v0.5.0+):

```bash
# List a specific number of results
julius-cli sessions list --page-size 10

# Fetch the next page using a token
julius-cli sessions list --page-token <token>

# Filter results via the API (efficient)
julius-cli sessions list --state COMPLETED --repo owner/repo

# Automatically fetch all matching results
julius-cli sessions list --state COMPLETED --all
```

## Authentication

Three authentication methods are supported (v0.7.0+):

| Method | Command | Best for |
|--------|---------|----------|
| API Key | `auth set <key>` | Simple scripts, CI/CD with API key |
| Google OAuth | `auth login` | Interactive use, Google account access |
| Provider-specific | Env Variables | GitLab/Bitbucket specific token injection |

Auth resolution order (highest priority first):
1. `JULES_OAUTH_TOKEN` env var — direct OAuth Bearer token
2. `JULES_API_KEY` env var — API key
3. Stored OAuth tokens (from `auth login`)
4. Stored API key (from `auth set`)

Additionally, provider-specific tokens can be set via environment variables:
- `JULES_GITHUB_API_KEY`
- `JULES_GITLAB_API_KEY`
- `JULES_BITBUCKET_API_KEY`

### Auth Commands

```bash
# API key
julius-cli auth set YOUR_API_KEY
julius-cli auth clear

# Google OAuth
julius-cli auth login                # browser flow
julius-cli auth login --device-code  # headless / SSH

# Check status (shows method, validity, user identity)
julius-cli auth status
julius-cli auth logout               # alias for auth clear
```

## Configuration

Configuration is stored in `~/.config/julius-cli/config.json` (or platform-specific location).

You can also use environment variables:

- `JULES_API_KEY` - API key (overrides stored key)
- `JULES_OAUTH_TOKEN` - OAuth Bearer token (overrides all stored credentials)
- `JULES_API_ENDPOINT` - API endpoint URL (default: https://jules.googleapis.com/v1alpha)

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Authentication error (invalid/missing API key)
- `3` - API error (request failed, rate limited)
- `4` - Not found (session, source, activity)
- `5` - Invalid arguments
- `6` - Timeout
- `7` - Network error

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
./dist/index.js --help

# Watch mode (auto-rebuild)
npm run dev

# Run tests
npm test
```

## License

MIT
