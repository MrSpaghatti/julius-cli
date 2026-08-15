# Next Steps

> Updated 2026-06-07 — scope reframed to daily-driver client for both humans and agents.

## End Goal

A polished, production-ready CLI and TUI that serves as the primary daily driver for both human developers and AI agents interacting with the Jules API. Key principles:

- **Agent-first by default** — JSON output, clean exit codes, composable commands
- **Human-friendly when needed** — TUI dashboard, REPL, pretty output, tab-completion
- **Zero surprises** — clear error messages, comprehensive docs, predictable behavior
- **Ready to publish** — npm package with CI/CD, cross-platform support, shell completion

## What Exists

### CLI (Agent Mode) — Feature Complete
- `sessions create`, `list`, `get`, `send`, `approve`, `cancel`, `pull`, `diff`
- `activities list` — full message/activity history
- `wait` — block until completion (single or multi-session), follows, activity filtering
- `auth` — API key, Google OAuth (browser + device code), logout, status
- `config`, `sources`, `templates`, `listen`, `completion`, `daemon`
- All output as JSON by default, proper exit codes, all output formats (json/pretty/table/quiet)

### TUI (Human Mode)
- Session list with keyboard navigation (↑↓), state filtering (1-7, a), repo filtering (/)
- Session details panel (title, repo, state, timestamps, outputs)
- Activity stream with type-colored icons
- **Chat panel** — conversation view with text input, Enter to open, Esc to exit
- Session creation dialog with repo auto-detection
- Inline plan approval and session cancellation
- Error recovery in activity panel

### REPL (Interactive Mode)
- In-process command execution for low-latency workflows
- Macro support (`macro <name> <cmd...>`, run with `!<name>`)
- Tab-completion for root commands
- Context preservation (`repo <provider/owner/repo>`)

### Daemon Mode
- Background process monitoring all sessions with configurable poll interval
- System notifications for state changes, approval needs, new messages, completion/failure
- PID-based lifecycle management (start/stop/status)
- JSON event output for agent consumption

## Gaps vs Website Features

### TUI Filtering
- State and repo filtering exist but no creator filter
- No quick search across all fields (/ to search)

### CLI Gaps
- `sessions list` has `--state` and `--repo` but no `--creator` filter

### Infrastructure
- Not yet published to npm
- No cross-platform testing (macOS, Windows)
- No automated E2E tests with live API

## v0.8.0 ✓ Completed

1. **npm publishing** — verify config, release.yml, .npmignore, package.json all ready ✅
2. **TUI quick search** — `/` to search sessions by repo, title, or ID (client-side filter) ✅
3. **CLI `--creator` filter** — pass through to API filter on `sessions list` ✅
4. **Cross-platform CI** — test on macOS/Windows/Linux with Node 18/20/22 ✅

### Remaining

None — v0.8.0 is complete ✅

## v0.9.0 ✓ Completed

1. **TUI creator filter** — press `u` to filter sessions by creator email (server-side) ✅
2. **TUI batch operations** — `space` multi-select, `p`/`x` act on the whole selection ✅

### Next (v0.9.x / v0.10.0 Ideas)

- Session performance analytics (cost, duration, success rate) — note: the API `Session` type currently exposes no cost field, so cost needs to be derived externally or waited on
- Cost and quota monitoring tools
- Batch operations in the CLI (`sessions batch-*` already exists) — TUI select-all
- Automated E2E tests with live API
