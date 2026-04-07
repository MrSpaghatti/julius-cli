# jules-cli-but-better

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
cd jules-cli-but-better

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
npm install -g jules-cli-but-better
# or
npx jules-cli-but-better <command>
```

## Quick Start

1. **Set your API key:**
```bash
jules-cli auth set YOUR_API_KEY
```

2. **List connected repositories:**
```bash
jules-cli sources list
```

3. **Create a session:**
```bash
jules-cli sessions create \
  --repo owner/repo \
  --prompt "Fix the bug in auth.ts" \
  --title "Bug fix"
```

4. **Check session status:**
```bash
jules-cli sessions get <session-id>
```

5. **Start Interactive Mode (v0.5.0+):**
```bash
jules-cli interactive --repo owner/repo
```

## Commands

### Interactive Mode (REPL) 🆕

Maintain session context across multiple commands without re-entering common flags.

```bash
# Start interactive mode
jules-cli interactive [--repo owner/repo]

# Short alias
jules-cli i
```

In interactive mode:
- Type any command (e.g., `sessions list`, `activities list <id>`)
- Use `repo <owner/repo>` to change the default repository
- Type `help` for commands, `exit` or `quit` to leave

### Webhook Listener 🆕

Listen for real-time session updates without polling the API.

```bash
# Start local webhook listener
jules-cli listen --port 8080

# Start listener and automatically register it for a session
jules-cli listen --register <session-id> --host https://your-public-url.com
```

### Sessions

```bash
# Create a new session
jules-cli sessions create \
  --repo owner/repo \
  --prompt "Your task description" \
  [--title "Session title"] \
  [--branch "starting-branch"] \
  [--auto-pr] \
  [--require-approval] \
  [--wait] \
  [--follow]

# List all sessions (now with server-side filtering)
jules-cli sessions list \
  [--repo owner/repo] \
  [--state PENDING EXECUTING COMPLETED] \
  [--page-size 30] \
  [--page-token abc123] \
  [--all] # Fetch all pages

# Get session details
jules-cli sessions get <session-id>
```

### Wait/Poll

```bash
# Block until a session completes (or fails/cancels)
jules-cli wait <session-id>

# Block and stream real-time activity updates
jules-cli wait <session-id> --follow
```

### Configuration

```bash
# Set configuration values (apiKey, apiEndpoint, defaultFormat, defaultPageSize)
jules-cli config set defaultFormat table

# Get a configuration value
jules-cli config get defaultFormat

# List all configuration values
jules-cli config list
```

## Output Formats

All commands support multiple output formats via the `--format` flag:

- `json` (default) - Structured JSON output for parsing
- `pretty` - Human-readable colored output
- `table` - Clean tabular display for lists
- `quiet` - Suppress output (useful for scripting)

```bash
# JSON output (default)
jules-cli sessions list

# Pretty output with colors
jules-cli sessions list --format pretty

# Table output
jules-cli sources list --format table

# Quiet mode (no output)
jules-cli auth set $API_KEY --format quiet
```

## Pagination & Filtering

List commands (`sessions list`, `sources list`, `activities list`) support server-side pagination and filtering (v0.5.0+):

```bash
# List a specific number of results
jules-cli sessions list --page-size 10

# Fetch the next page using a token
jules-cli sessions list --page-token <token>

# Filter results via the API (efficient)
jules-cli sessions list --state COMPLETED --repo owner/repo

# Automatically fetch all matching results
jules-cli sessions list --state COMPLETED --all
```

## Configuration

Configuration is stored in `~/.config/jules-cli/config.json` (or platform-specific location).

You can also use environment variables:

- `JULES_API_KEY` - API key (overrides config)
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
