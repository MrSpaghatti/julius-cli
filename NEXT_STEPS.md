# Next Steps

> Updated 2026-06-02 — scope reframed to daily-driver client for both humans and agents.

## What Exists

### CLI (Agent Mode) — Feature Complete
- `sessions create`, `list`, `get`, `send`, `approve`, `cancel`, `pull`, `diff`
- `activities list` — full message/activity history
- `wait` — block until completion with JSON output
- `auth`, `config`, `sources`, `templates`, `listen`, `completion`
- All output as JSON by default, proper exit codes

### TUI (Human Mode)
- Session list with keyboard navigation (↑↓), state filtering (1-7, a)
- Session details panel (title, repo, state, timestamps, outputs)
- Activity stream with type-colored icons
- **Chat panel** — conversation view with text input, Enter to open, Esc to exit
- Session creation dialog with repo auto-detection
- Error recovery in activity panel
- No `"Unexpected error"` on `--help`/`--version`

## Gaps vs Website Features

### TUI Filtering
- State filtering exists (1-7 keys) but no repo or creator filter
- No way to quickly search/filter sessions beyond state

### TUI Session Actions
- Chat can send messages but no way to approve plans or cancel sessions
- Need keyboard shortcuts for approve/cancel

### CLI Minor Gaps
- `sessions list` has `--state` and `--repo` but no `--creator` filter

## Priority for Daily-Driver

1. **TUI filter bar** — add repo filter input + active filter display in header
2. **TUI approve/cancel** — keyboard actions for plan approval and session cancellation
3. **TUI quick search** — `/` to search/filter sessions by repo, creator, or ID
4. **CLI `--creator` filter** — pass through to API filter on `sessions list`
