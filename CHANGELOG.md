# Changelog

All notable changes to this project will be documented in this file.

## [0.6.0] - Planned

### Added
- **Google OAuth 2.0 Support**: New `auth login` command for Google account authentication alongside existing API key flow.
  - Browser-based flow: opens consent screen in default browser, captures token via loopback redirect.
  - Device code flow: `auth login --device-code` for headless/SSH environments.
  - Automatic token refresh — expired access tokens are refreshed transparently before each API call.
- **`auth logout`**: New subcommand (alias for `auth clear`) to remove all stored credentials.
- **Auth method resolution**: Priority chain — `JULES_OAUTH_TOKEN` env var → `JULES_API_KEY` env var → OAuth tokens → API key.
- **Updated `auth status`**: Shows active auth method (`apikey` / `oauth`), token expiry, and user identity for OAuth sessions.

### Changed
- `JulesAPIClient` constructor now accepts a `TokenProvider` interface instead of a raw API key string, enabling both API key and OAuth token modes.
- `auth clear` now removes both API key and OAuth tokens.

### New Dependencies
- `google-auth-library` — Google's official Node.js client for OAuth2/token exchange.

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
