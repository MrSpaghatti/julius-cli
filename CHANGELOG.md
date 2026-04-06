# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-04-06

### Added
- **Secure Storage:** API key is now stored in the OS Keychain using `cross-keychain`.
- **Git Inference:** `sessions create` now automatically infers the repository from the local `.git/config` if not provided.
- **Table Output:** New `--format table` option for human-readable tabular data.
- **Enhanced Pagination:** Added `--all` flag to `sources list`, `sessions list`, and `activities list` to automatically fetch all pages.
- **Unit Test Suite:** Established automated testing infrastructure with Jest and MSW.
  - Unit tests for `JulesAPIClient` covering error handling and retries.
  - Unit tests for pagination and git inference utilities.

### Changed
- All API-related commands are now async at the top level to support secure storage retrieval.
- `ConfigManager.getApiKey()` and `setApiKey()` are now asynchronous.
- `config` subcommands updated to handle secure API key storage.
- Improved `wait` command with more robust polling and activity streaming.

### Fixed
- Redundant "undefined" outputs and duplicate code blocks from previous versions.
- Modernized Jest configuration for ESM support.
- Fixed `axios-retry` configuration to properly respect `Retry-After` headers.

## [0.1.2] - 2026-04-06

### Fixed
- Critical compilation errors in `wait` and `wait-cli` commands
- Broken import in `src/commands/wait.ts`
- Redundant "undefined" output in `sources`, `sessions`, and `activities` commands
- Hardcoded command defaults now correctly pull from global configuration
- Duplicate code blocks in `src/commands/sources.ts` and `src/commands/sessions.ts`
- Misleading validation message in `auth status`

### Changed
- Build process now enforces full type checking (`tsc --noEmit`) before bundling
- `auth status` now explicitly notes that validation is local-only

## [0.1.1] - 2026-04-06

### Added
- `wait` command for blocking until session reaches a terminal state
- `--follow` flag for `wait` command to stream activity updates in real-time
- `config` command group for managing CLI configuration:
  - `config set <key> <value>` to update settings
  - `config get <key>` to retrieve a setting
  - `config list` to view all configuration (with masked API key)
  - `config reset` to restore defaults
- Support for `pollInterval` and `maxPollAttempts` configuration

### Fixed
- Build error in `src/commands/wait-cli.ts` due to incorrect config import
- Masked sensitive information (API key) in `config list` output

## [0.1.0] - 2026-04-06

### Added
- Initial release of jules-cli-but-better
- Complete Phase 1 (Foundation) implementation
- Complete Phase 2 (Interaction) implementation

#### Authentication
- `auth set` command to store API key
- `auth status` command to check authentication state
- `auth clear` command to remove stored API key
- Environment variable support (JULES_API_KEY, JULES_API_ENDPOINT)
- Cross-platform secure config storage using conf

#### Sources (Repositories)
- `sources list` command with pagination
- `sources get` command for repository details
- Support for github.com repositories

#### Sessions
- `sessions create` command with full options:
  - Repository selection
  - Custom prompts
  - Optional title
  - Branch selection
  - Auto-PR mode
  - Plan approval requirement
- `sessions list` command with filtering:
  - Filter by repository
  - Filter by state(s)
  - Pagination support
- `sessions get` command for session details
- `sessions send` command to send messages to active sessions
- `sessions approve` command for plan approval workflow
- `sessions cancel` command to cancel running sessions

#### Activities
- `activities list` command with filtering:
  - Filter by activity type (PLAN, MESSAGE, PROGRESS, ERROR)
  - Filter by author (USER, AGENT)
  - Pagination support
- `activities get` command for activity details

#### Output Formats
- JSON format (default) - Machine-readable structured output
- Pretty format - Human-readable colored output with:
  - Color-coded session states
  - Formatted timestamps
  - Activity author badges
  - Metadata display
- Quiet format - No output (exit codes only)

#### API Client
- Axios-based HTTP client with Jules API integration
- Automatic retry with exponential backoff (3 retries)
- Rate limit handling with Retry-After header support
- 30-second request timeout
- Comprehensive error handling:
  - Network errors
  - Authentication errors (401, 403)
  - Not found errors (404)
  - Rate limiting (429)
  - Server errors (5xx)

#### Error Handling
- 8 distinct exit codes for automation:
  - 0: Success
  - 1: General error
  - 2: Authentication error
  - 3: API error
  - 4: Not found
  - 5: Invalid arguments
  - 6: Timeout
  - 7: Network error
- Custom error classes for type-safe error handling
- Actionable error messages

#### Configuration
- Cross-platform config storage
- Schema validation with defaults
- Settings:
  - API key
  - API endpoint
  - Default output format
  - Default page size
  - Poll interval
  - Max poll attempts

#### Documentation
- Comprehensive README with quick start
- Implementation log with technical details
- AI agent workflow examples (10+ examples)
- API endpoint mapping
- Cross-platform compatibility notes

### Technical Details
- TypeScript 5.x with strict mode
- ESM module format
- Node.js 18+ required
- esbuild-based bundling with tsup
- Zero runtime compilation
- Automatic shebang injection for CLI execution

### Dependencies
- commander@11.x - CLI framework
- axios@1.x - HTTP client
- axios-retry@4.x - Retry logic
- conf@12.x - Configuration management
- chalk@5.x - Terminal colors
- cli-table3@0.6.x - ASCII tables
- ora@8.x - Spinners

[0.1.0]: https://github.com/yourusername/jules-cli-but-better/releases/tag/v0.1.0
