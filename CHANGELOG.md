# Changelog

All notable changes to this project will be documented in this file.

## [0.4.0] - 2026-04-06

### Added
- **Session Templates**: Introduced `jules-cli templates` command group for reusable task prompts.
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
