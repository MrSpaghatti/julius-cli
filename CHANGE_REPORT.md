# Change Report — 2026-06-11

## Build & Test Fixes

### Problems Found
- **3 TypeScript errors** blocking compilation:
  - `src/tui/App.tsx`: `filteredSessions` used before declaration (TS2448/TS2454)
  - `src/commands/sessions-batch.ts`: `PromiseSettledResult.value` not narrowed on indexed access
- **1 test suite failure** (`daemon.test.ts`): foreground mode test timed out waiting for SIGINT
- **2 unused declarations** in `App.tsx`: `actionLoading` state, `prevFilterStateRef` ref

### Files Modified

- **`src/tui/App.tsx`** — Moved `const filteredSessions` declaration above the `useEffect` that references it. Removed unused `actionLoading`/`setActionLoading` state and `prevFilterStateRef` ref. Removed stale `useRef` import.

- **`src/commands/sessions-batch.ts`** — Fixed `PromiseSettledResult` narrowing in `handleBatchCancel` and `handleBatchPull` by assigning `results[i]`/`sessions[i]` to a local `result` variable before checking `.status`.

- **`test/unit/commands/daemon.test.ts`** — Added `DaemonService` mock with `start()` that rejects immediately, so the bare-invocation foreground mode test resolves fast instead of hanging for the Jest timeout.

## `no-explicit-any` Lint Cleanup

Eliminated all 52 `no-explicit-any` warnings across 17 files by replacing with proper types:

- **`src/api/*.ts` (7 fixes)** — `params: any` → `Record<string, unknown>`, `data?: any` → `data?: unknown`, `as any` → `'wrong' in (response as object)`
- **`src/commands/config.ts` (3 fixes)** — `key as any` → `key as string`, `parsedValue: any` → `string | number`, `displayConfig: any` → `Record<string, unknown>`
- **`src/commands/daemon.ts` (1 fix)** — `msg: any` → `msg: unknown`
- **`src/commands/interactive.ts` (1 fix)** — `catch (err: any)` → typed error handling
- **`src/commands/listen.ts` (3 fixes)** — `catch (err: any)` → `catch (err: unknown)` with typed error extraction
- **`src/commands/sessions-batch.ts` (3 fixes)** — `as any` casts → `as Session[]`
- **`src/commands/templates.ts` (1 fix)** — `catch (err: any)` → `catch (err: unknown)`
- **`src/commands/wait.ts` (2 fixes)** — `spinner: any` → `Ora | null`, `catch (error: any)` → typed error handling
- **`src/commands/wait-cli.ts` (1 fix)** — `options: any` → fully typed options interface
- **`src/config/index.ts` (1 fix)** — `schema: schema as any` → `as Schema<CLIConfig>`
- **`src/config/templates.ts` (1 fix)** — `as any` → `as string`
- **`src/output/json.ts` (1 fix)** — `data: any` → `data: unknown`
- **`src/utils/git.ts` (1 fix)** — `options: any` → `Record<string, unknown>`
- **`src/utils/oauth.ts` (3 fixes)** — `as any` → `as Record<string, unknown>`, `'S256'` → `CodeChallengeMethod.S256`, typed `TokenResponse` interface

## Real Lint Errors Fixed (4)
- Removed unused `config` import from `src/commands/daemon.ts`
- Removed unused `ExitCode` import from `src/index.ts`
- Removed unused `Activity` import from `src/services/daemonService.ts`
- Added comment to empty catch block in `src/utils/git.ts`

## Verification
- [x] Build passes cleanly (`tsc --noEmit && tsup`)
- [x] All 199 tests pass (25 suites, 0 failures)
- [x] No LSP diagnostics errors
- [x] Lint: 0 errors, 0 `no-explicit-any` warnings (down from 52)
