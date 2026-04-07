# julius-cli

AI-first CLI for Jules REST API with JSON output and full automation support.

## Overview

Unlike the official `@google/jules` CLI which focuses on human interaction with TUIs, this tool provides:

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

### Option B: Google OAuth (v0.6.0, planned)

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

5. **Start Interactive Mode (v0.5.0+):**
```bash
julius-cli interactive --repo owner/repo
```

## Commands

### Interactive Mode (REPL) 🆕

Maintain session context across multiple commands without re-entering common flags.

```bash
# Start interactive mode
julius-cli interactive [--repo owner/repo]

# Short alias
julius-cli i
```

In interactive mode:
- Type any command (e.g., `sessions list`, `activities list <id>`)
- Use `repo <owner/repo>` to change the default repository
- Type `help` for commands, `exit` or `quit` to leave

### Webhook Listener 🆕

Listen for real-time session updates without polling the API.

```bash
# Start local webhook listener
julius-cli listen --port 8080

# Start listener and automatically register it for a session
julius-cli listen --register <session-id> --host https://your-public-url.com
```

### Sessions

```bash
# Create a new session
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
  [--repo owner/repo] \
  [--state PENDING EXECUTING COMPLETED] \
  [--page-size 30] \
  [--page-token abc123] \
  [--all] # Fetch all pages

# Get session details
julius-cli sessions get <session-id>
```

### Wait/Poll

```bash
# Block until a session completes (or fails/cancels)
julius-cli wait <session-id>

# Block and stream real-time activity updates
julius-cli wait <session-id> --follow
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

Two authentication methods are supported (v0.6.0+):

| Method | Command | Best for |
|--------|---------|----------|
| API Key | `auth set <key>` | Simple scripts, CI/CD with API key |
| Google OAuth | `auth login` | Interactive use, Google account access |

Auth resolution order (highest priority first):
1. `JULES_OAUTH_TOKEN` env var — direct OAuth Bearer token
2. `JULES_API_KEY` env var — API key
3. Stored OAuth tokens (from `auth login`)
4. Stored API key (from `auth set`)

### Auth Commands

```bash
# API key
julius-cli auth set YOUR_API_KEY
julius-cli auth clear

# Google OAuth (v0.6.0)
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
