# Next Session Prompt: Jules CLI v0.5.0 Implementation

We have just completed v0.4.0, which addressed critical performance issues in activity polling, improved git repository inference, fixed security vulnerabilities in shell command execution, and unified the codebase's versioning and error handling.

The next phase of implementation (v0.5.0) focuses on **Advanced Automation and Interactivity**.

### Current Context
- **Version:** 0.4.0
- **Test Coverage:** >80% (110 tests passing)
- **Key Files:**
  - `src/commands/wait.ts`: Optimized polling logic for activity streaming.
  - `src/utils/git.ts`: Robust, multi-provider repository inference.
  - `src/api/client.ts`: Base HTTP client with retry logic.
  - `src/output/formatter.ts`: Multi-format output dispatcher.

### Objectives for v0.5.0
1.  **Webhook Support (Speculative Research):**
    - Investigate if the Jules REST API supports webhooks for session state changes.
    - If supported, implement a local webhook listener (`jules-cli listen`) or a mechanism to register webhooks to avoid polling entirely.
2.  **Interactive Mode (REPL):**
    - Implement an optional interactive REPL mode (`jules-cli interactive`) for command chaining.
    - This should allow users to maintain session context across multiple commands without re-entering common flags (like `--repo`).
3.  **Enhanced Filtering:**
    - If the API supports server-side filtering (e.g., via a `filter` parameter), update the `list` commands to use it instead of client-side filtering.
4.  **Refactor Output Formatters:**
    - Continue the consolidation of output logic started in v0.4.0. Move more repetitive logic into `src/output/common.ts` or a more generic factory pattern to make adding new resource types easier.

### Instructions for the Next Session
- **Research:** Start by checking the latest Jules API documentation (or simulated equivalent) for webhook and server-side filtering support.
- **Strategy:** Draft a plan for the REPL implementation—consider using a library like `enquirer` or `inquirer` if appropriate, but keep it consistent with the existing `commander` structure.
- **Execution:** Implement the most high-impact feature first (likely the REPL or Webhook support).

Please maintain the senior engineering standards established in the previous session: surgical updates, idiomatic TypeScript, and comprehensive test coverage.
