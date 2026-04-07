# Next Session Prompt: Julius CLI v0.7.0 — REPL Overhaul & Provider Parity

We have just completed v0.6.0 (Rebranding to `julius-cli`, Secure Keychain Storage, Activity Tailing Fixes, Robust API Parsing, and Template Security). The next phase is **v0.7.0: Interactive Mode Overhaul and GitLab/Bitbucket Parity**.

---

## Current State

- **Version:** 0.6.0
- **Tests:** 130+ passing, build clean
- **Security:** OAuth client credentials and API keys are stored in the system keychain.
- **Tailing:** Activity streaming in `wait --follow` is robust and uses persistent tokens.
- **Renaming:** Project is fully rebranded as `julius-cli`.

---

## What to Implement

### 1. Interactive Mode (REPL) Overhaul
The current `interactive` command in `src/commands/interactive.ts` re-spawns the Node process for every command. This is slow and loses in-memory state.

**Goal:** Refactor the REPL to execute commands in-process using Commander's internal APIs.

**Tasks:**
- Modify `src/commands/interactive.ts` to use `cli.parseAsync(parts, { from: 'user' })` instead of `spawn('node', ...)`.
- Implement a persistent `context` object in the REPL (e.g., `currentRepo`, `lastSessionId`).
- Add "macro" support: allow users to save a sequence of commands as a temporary macro.
- Add better tab-completion using `readline`'s completion engine.
- Handle `SIGINT` (Ctrl+C) within the REPL to cancel the current command without exiting the shell.

### 2. Multi-Provider Parity
While we support GitLab and Bitbucket in theory, many utilities (like `sessions list --repo` and `git.ts` logic) are still heavily optimized for GitHub.

**Tasks:**
- **`src/utils/git.ts`:** Enhance `pullSessionChanges` to support GitLab and Bitbucket specific branch/PR fetch patterns if they differ from standard `fetch origin`.
- **`src/commands/sessions.ts`:** Update `list` and `create` to better handle GitLab/Bitbucket provider prefixes without falling back to GitHub by default.
- **`src/utils/client.ts`:** Add support for provider-specific API keys if the backend ever requires them (currently uses a unified Jules key).

### 3. Template Management Enhancements
Allow users to manage templates directly from the CLI.

**Tasks:**
- Add `julius-cli templates create` command to interactive add a new template to `templates.json`.
- Add `julius-cli templates edit <id>` command.
- Add `julius-cli templates delete <id>` command.
- Add `julius-cli templates import <url|file>` to bulk load templates.

---

## Implementation Details

### Interactive Mode In-Process Execution:
```typescript
// src/commands/interactive.ts
import { cli } from '../cli.js';

// ... inside the loop
try {
  // Use a modified parseAsync that doesn't call process.exit
  await cli.parseAsync(['node', 'julius-cli', ...parts]);
} catch (err) {
  // Handle command errors without exiting the REPL
}
```
*Note: May need to suppress Commander's default exit behavior using `.exitOverride()` and `.configureOutput()`.*

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/commands/interactive.ts` | Major refactor — switch to in-process execution |
| `src/commands/templates.ts` | Add create/edit/delete/import subcommands |
| `src/utils/git.ts` | Refine remote/branch handling for non-GitHub providers |
| `src/config/templates.ts` | Add mutation methods (set, delete, clear) |

---

## Notes / Caveats

- **Commander State:** When running `cli.parseAsync` multiple times in the same process, ensure global options (like `--verbose`) are reset or managed correctly.
- **Stdio Redirection:** The REPL needs to ensure that command output (especially tables) still renders correctly to the existing TTY.
- **Error Propagation:** Ensure that `CLIError` thrown in commands is caught by the REPL loop and printed nicely, rather than crashing the shell.

---

## Implementation Order (suggested)

1. Refactor `src/commands/interactive.ts` for in-process execution.
2. Verify REPL state management (repo context).
3. Enhance `templates` command with management subcommands.
4. Audit and fix provider-specific edge cases in `git.ts` and `sessions.ts`.
5. Update tests to cover the new interactive logic and template mutations.
