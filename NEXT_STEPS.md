# Next Steps

> Updated 2026-06-02 — after bug-fix pass across TUI and CLI.

## ✅ Fixed This Session

- **CreateSessionDialog render-phase setState** — Moved the `if (repo && phase === 'prompt')` auto-advance from render body into a `useEffect` where it belongs. No more React warnings.
- **ActivityPanel error recovery** — Added `error` prop, wired `activitiesError` state through `App.tsx` `fetchActivities` catch block. Failed API calls now show a red-bordered error box with "Will retry automatically" instead of silently looking like "no activity".
- **CLI `--help`/`--version` "Unexpected error"** — `CommanderError` from Commander's `exitOverride()` is now caught before the generic error handler in `src/index.ts`. Both flags exit 0 cleanly.

## TUI Polish (Medium Priority)

- **Session list pagination** — `fetchSessions` in `App.tsx` doesn't handle `nextPageToken`. Lists are capped at whatever the API default page size is.
- **CreateSessionDialog error handling** — The dialog catches errors but only offers "Esc to close"; a retry button would be better.
- **Keyboard shortcut reference** — The status bar doesn't show that `Enter` opens a session detail (detail is always shown, so this might just need a label).
- **Format flag in TUI** — The `tui` command doesn't support `--format`. Should pass through to the output channel.

## Phase 3 — Production Readiness

- **npm publish** — `package.json` has `"bin": {...}` pointing at `dist/index.js`. Needs: CI publish automation, `prepublishOnly` script for build+test, `files` field to ship only `dist/`.
- **Shell completion at install time** — `src/commands/completion.ts` exists but there's no `"postinstall"` script in `package.json`.
- **Batch session orchestration** — Multi-session create + wait in sequence/parallel for CI pipelines.
- **CI/CD pipeline** — The `.github/` workflow exists but needs verification that it runs tests and publishes.
- **README screenshot** — Worth adding a terminal screenshot/gif of the TUI once it's polished.
