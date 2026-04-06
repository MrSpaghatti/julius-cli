# jules-cli-but-better

AI-first CLI for Jules REST API with JSON output and full automation support.

## Overview

Unlike the official `@google/jules` CLI which focuses on human interaction with TUIs, this tool provides:

- **JSON-first output** - Machine-readable output for AI agents
- **Full API coverage** - All Jules REST API endpoints accessible via CLI
- **Non-interactive** - All operations scriptable without human input
- **Clear exit codes** - Proper error handling for automation
- **Composability** - Commands chain together for complex workflows

## Installation

```bash
npm install -g jules-cli-but-better
```

Or run directly with npx:

```bash
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

## Commands

### Authentication

```bash
# Store API key
jules-cli auth set <api-key>

# Check authentication status
jules-cli auth status

# Remove stored API key
jules-cli auth clear
```

### Sources (Repositories)

```bash
# List all connected repositories
jules-cli sources list

# Get details for a specific repository
jules-cli sources get github/owner/repo
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
  [--require-approval]

# List all sessions
jules-cli sessions list \
  [--repo owner/repo] \
  [--state PENDING EXECUTING COMPLETED] \
  [--page-size 30] \
  [--page-token abc123]

# Get session details
jules-cli sessions get <session-id>
```

## Output Formats

All commands support multiple output formats via the `--format` flag:

- `json` (default) - Structured JSON output for parsing
- `pretty` - Human-readable colored output
- `quiet` - Suppress output (useful for scripting)

```bash
# JSON output (default)
jules-cli sessions list

# Pretty output with colors
jules-cli sessions list --format pretty

# Quiet mode (no output)
jules-cli auth set $API_KEY --format quiet
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
```

## License

MIT
