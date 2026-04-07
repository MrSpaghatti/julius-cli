# Next Session: jules-cli-but-better - v0.3.0+

## Project Context
`jules-cli-but-better` is an AI-first CLI for the Jules REST API, optimized for automation and AI agent workflows. It focuses on machine-readable JSON output, comprehensive API coverage, and non-interactive operation.

## Current State (v0.3.0 Stable)
- ✅ **Core Commands:** Full coverage of Auth, Sources, Sessions, and Activities APIs.
- ✅ **Automation:** `wait` command supports multiple parallel sessions, activity streaming (`--follow`), and activity type filtering.
- ✅ **Seamless Flows:** `sessions create --wait --follow` enables single-command task execution and monitoring.
- ✅ **Robust Error Handling:** 8 standardized exit codes via `ExitCode` enum and detailed `handleError` logic.
- ✅ **Test Suite:** 97 passing tests (Unit & Integration) with ~80% coverage.
- ✅ **CI/CD:** GitHub Actions workflow established for build, lint, and test verification.
- ✅ **Documentation:** Accurate README, STATUS, and CHANGELOG reflecting v0.3.0.

## Implementation Priorities

### 1. Session Templates (Phase 5)
Implement `jules-cli templates` command group to allow users to define and use reusable prompt templates.
- **Commands:** `templates list`, `templates get <id>`, `templates use <id> [vars...]`.
- **Storage:** Store templates in the existing `conf` storage or a dedicated `templates/` directory in the user's config folder.

### 2. Local Git Integration
Enhance the CLI to interact directly with the local repository state after session completion.
- **Features:**
  - `jules-cli sessions pull <session-id>`: Automatically fetch and checkout the branch/PR created by Jules.
  - `jules-cli sessions diff <session-id>`: Show a local diff of the changes proposed in the session.
  - Improved `inferGitHubRepo` to handle more obscure remote URL formats.

### 3. Webhook Support (Optional)
Explore providing a way to receive real-time notifications via webhooks instead of polling for long-running sessions, reducing API load and latency.

## Technical Debt & Optimization
- ⚠️ **Wait Performance:** The `waitCommand` currently fetches all activities across all pages every poll cycle. Optimize by fetching only new pages if possible, or investigate if the API supports reverse chronological ordering.
- ⚠️ **Polling Efficiency:** Consider an exponential backoff for the `wait` command polling interval if a session is in a long-running state (e.g., `EXECUTING`).
- ⚠️ **Promise Management:** Refine the parallel `Promise.all` logic in `wait-cli.ts` to allow individual poll failures without cancelling the entire operation.

## Instructions for Next Session
1. **Initialize:** Review the `PLAN.md` and `STATUS.md` to confirm alignment.
2. **Strategy:** Choose one of the implementation priorities above (Session Templates or Git Integration).
3. **Execution:** Follow the Research -> Strategy -> Execution lifecycle. Ensure all new features include unit tests and update the CHANGELOG.md.
