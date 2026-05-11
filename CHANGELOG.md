# Changelog

All notable changes to this project will be documented in this file.

## [0.7.0] - 2026-04-07

### Added
- **Interactive Mode (REPL) Overhaul**:
  - In-process command execution for significantly faster performance.
  - Macro support: define sequences with `macro <name> <cmd...>` and run with `!<name>`.
  - Basic tab-completion for root commands.
  - Better signal handling: Ctrl+C clears the current line instead of exiting.
- **Multi-Provider Parity**:
  - Full support for GitLab and Bitbucket alongside GitHub.
  - Enhanced `sessions pull` to support GitLab Merge Requests and Bitbucket Pull Requests fetch patterns.
  - Provider-specific token support via environment variables (`JULES_GITHUB_API_KEY`, etc.).
- **Template Management**:
  - `templates create`: Interactive prompt to create new templates.
  - `templates edit`: Modify existing templates.
  - `templates delete`: Remove templates.
  - `templates import`: Bulk load templates from JSON.

### Changed
- Improved `--repo` inference to correctly identify providers from local git remotes.
- Refactored `src/utils/client.ts` with `ProviderTokenWrapper` for extensible header injection.

## [0.7.1] - 2026-05-10

### Added
- **TUI**: Continued terminal UX refinements and interactive workflow improvements.
- **Agentic DX**: Developer experience updates for agent-assisted workflows.
- **CI/CD**: Expanded CI matrix, stricter linting, coverage uploads, and release publishing workflow.

### Changed
- **Dependency updates**: Modernized the project stack and kept tooling aligned with current Node releases.
- **Test fixes**: Stabilized test execution and coverage reporting in automation.
- **Audit fixes**: Addressed package and workflow hygiene issues.

### Fixed
- **Desloppify**: Cleaned up remaining code quality issues identified during repository hardening.

## [0.6.0] - 2026-04-07

### Added
- **Rebranding**: Project renamed from `jules-cli` to `julius-cli`.
- **Google OAuth 2.0 Support**: New `auth login` command for Google account authentication.
  - Browser-based flow and Device code flow.
  - Automatic token refresh.
- **Secure Storage**: Sensitive credentials stored in the system keychain.
- **Robust Tailing**: Fixed activity streaming in `wait --follow`.
- **Standardized Configuration**: Uniform handling of API URLs and endpoints.

### Changed
- `JulesAPIClient` constructor updated for `TokenProvider`.
- `auth clear` removes both API key and OAuth tokens.

## [0.5.1] - 2026-04-06

### Security
- Added HMAC-SHA256 webhook signature verification to `listen` command (`--secret` flag).
- Added IP-based rate limiting (100 req/IP per 60s) to webhook listener.
- Added `ConfigManager.getRequired()` to surface missing config values explicitly.

### Added
- Integration test suite for API contract validation (`test/integration/api-contract.test.ts`).
  - Tests for invalid response structures in Sessions and Activities APIs.
  - Tests for pagination token handling.
  - Tests for retry limit behavior in wait command.

## [0.5.0] - 2026-04-06

### Added
- **Interactive Mode (REPL)**: New `julius-cli interactive` (alias `i`) command for persistent shell sessions.
  - Maintains repository context across commands.
  - Custom `repo <owner/repo>` command to change context on the fly.
- **Webhook Support**: New `julius-cli listen` command to start a local webhook listener.
  - Real-time session and activity updates.
  - Automatic registration with the Jules API via `SessionsAPI.registerWebhook`.
- **Server-side Filtering**: Efficient filtering for `sessions list` and `activities list` via the API.
  - Supports `--repo`, `--state`, `--type`, and `--author` directly at the API level.
  - Significantly reduced bandwidth and API quota usage.

### Changed
- **Output Refactoring**: Refactored `formatOutput` in `src/output/formatter.ts` using a registry pattern for better maintainability.
- **API Client**: Updated `SessionsAPI` and `ActivitiesAPI` to support the `filter` parameter.

## [0.4.0] - 2026-04-06

### Added
- **Session Templates**: Introduced `julius-cli templates` command group for reusable task prompts.
  - `templates list`: View available templates (Bug Fix, Add Unit Tests, Refactor).
  - `templates get <id>`: Get detailed information about a template and its variables.
  - `templates use <id> [vars...]`: Start a session using a template with variable substitution.
- **Local Git Integration**: Commands to interact with local repository state.
  - `sessions pull <session-id>`: Automatically fetch and checkout the session's branch.
  - `sessions diff <session-id>`: Show a local diff of the session's proposed changes.
- **Improved Git Inference**: Robust detection of GitHub repositories from more remote URL formats (SSH, Git protocol, and obscure HTTPS formats).
- **New Utilities**: `src/utils/client.ts` for centralized API client acquisition.

### Changed
- **Refactoring**: Refactored `sessions create` into a reusable `handleCreateSession` function.
- **CLI Commands**: Unified API client initialization across all command modules.
- **Test Suite**: Increased total test count to 110 with >80% coverage.

## [0.3.0] - 2026-04-06

### Added
- **Progress Indicators**: Visual feedback via `ora` spinners for common operations.
- **Enhanced Wait**: Support for waiting on multiple session IDs in parallel.
- **Activity Filtering**: Filter streamed activities by type (PLAN, MESSAGE, PROGRESS, ERROR).
- **CI/CD Pipeline**: GitHub Actions workflow for automated build, lint, and test verification.

### Changed
- **Error Handling**: Improved error reporting with actionable hints.
- **Wait Command**: Streamlined polling logic and enhanced follow mode.

### Fixed
- **Timeout Handling**: Resolved issues with default timeout values in wait command.
- **Configuration**: Fixed logic errors in default config initialization.

## [0.2.0] - 2026-04-06

### Added
- **Activities API**: Support for listing and getting session activities.
- **Session Interaction**: Send messages and approve plans from the CLI.
- **Wait Command**: Synchronous waiting for session completion with polling.
- **Activity Streaming**: Real-time follow mode for session progress.

### Changed
- **Output Formatting**: Enhanced pretty-print mode with colors and icons.
- **CLI Structure**: Improved command group organization.

## [0.1.0] - 2026-04-06

### Added
- **Initial Release**: Basic CLI for Jules REST API.
- **Auth**: Manage API keys with secure local storage.
- **Sessions**: Create, list, and get session details.
- **Sources**: List and get connected GitHub repositories.
- **JSON-First Output**: Machine-readable JSON for all operations.
