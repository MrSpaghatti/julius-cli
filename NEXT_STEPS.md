# Next Steps

> Generated 2026-06-02 after Phase 1 (foundation) and Phase 2 (TUI skeleton) completion.

## TUI Fixes (High Priority)

- **CreateSessionDialog render-phase setState** — `setPhase` is called directly in the component body (line 29 in `CreateSessionDialog.tsx`) when `repo` is already detected. This throws a React warning and can cause crashes. Fix: use `useEffect` for the initial-phase auto-advance.
- **Activity polling teardown** — `useEffect` in `App.tsx` starts a `setInterval` for activity polling but doesn't return a cleanup function. This causes stale updates and test teardown warnings.
- **Error recovery in activity panel** — If the activities API call fails, there's no error state in `ActivityPanel.tsx` — it just shows "Loading activities" forever.

## TUI Polish (Medium Priority)

- **Session list pagination** — The `fetchSessions` in `App.tsx` doesn't handle `nextPageToken`. Lists are capped at whatever the API default page size is.
- **CreateSessionDialog error handling** — The dialog catches errors but doesn't allow retrying (only "Esc to close"). A retry button would be better.
- **Keyboard shortcut reference** — The status bar shows shortcuts but doesn't explain that `Enter` expands the selected session. Add that.
- **Format flag in TUI** — The `tui` command doesn't support `--format`. It should, even if it just passes through to the output channel.

## CLI Polish (Low Priority)

- **`"Unexpected error"` on `--help` and `--version`** — Pre-existing issue in `src/cli.ts`. Commander's `exitOverride()` + `configureOutput` don't cleanly handle the help/version output path. The message is harmless but unprofessional.
- **Shell completion at install time** — `src/commands/completion.ts` exists but there's no `"postinstall"` script in `package.json` to auto-generate completions.

## Phase 3 — Production Readiness

- **npm publish** — `package.json` has `"bin": {...}` pointing at `dist/index.js` and a valid name. Needs: `npm publish` automation in CI, a `prepublishOnly` script that runs build + test, and maybe a `files` field to ship only `dist/`.
- **Batch session orchestration** — Multi-session create + wait in sequence/parallel. Useful for CI pipelines.
- **CI/CD pipeline** — The `.github/` workflow exists (from an earlier commit) but needs verification that it runs tests and publishes.

## Housekeeping

- **`.sisyphus/`, `julius-v1-foundation.md`, `scorecard.png`** — Sisyphus work artifacts sitting untracked. Either add to `.gitignore` or keep in a `.sisyphus/archive/` directory if they have historical value.
- **README.md** — Already updated with TUI section. Worth adding a screenshot/gif of the dashboard once it's polished.
