# Paper Trail - Julius CLI Implementation

**Version:** 0.6.0  
**Last Updated:** 2026-04-07  
**Project:** julius-cli  

This document serves as a comprehensive paper trail of the core implementation and significant refactors performed during the development of **julius-cli**.

## Implementation Milestones

### v0.6.0 - Security Hardening & Rebranding (Current)
- **Project Rebranding:** Renamed `jules-cli` to `julius-cli` globally across binary, package, code, and documentation.
- **Credential Hardening:** Moved OAuth client secrets and tokens into the OS-level keychain (`cross-keychain`).
- **Activity Tailing Fix:** Resolved the "re-fetch history" bug in `wait --follow` by persisting `nextPageToken` and implementing an initialization pass.
- **Streaming Table Output:** Optimized `formatOutput` and `formatTableActivities` to support suppressed headers for activity updates.
- **Robust API Handling:** Introduced defensive parsing for all list-based API responses (sessions, activities) to prevent crashes on empty collections.
- **Standardized Configuration:** Uniformed endpoint handling with support for `JULES_API_URL` and `JULES_API_ENDPOINT`.
- **Command Injection Prevention:** Implemented regex escaping for prompt templates using a dedicated helper.

### v0.5.x - Google OAuth 2.0 & Webhooks
- **OAuth 2.0 Support:** Implemented browser flow (PKCE) and device code flow using `google-auth-library`.
- **Secure Webhooks:** Added HMAC signature verification and rate limiting to the `listen` command.
- **Automation Logic:** Enhanced `sessions create` with `--wait` and `--follow` flags for seamless automation.

### v0.4.x - Optimization & API Parity
- **Polling Efficiency:** Initial improvements to polling logic to reduce API load.
- **Git Context:** Basic repository inference from local Git remotes.
- **Template System:** Introduced the `templates` command group for reusable task prompts.

### v0.3.x - Core Architecture
- **Base Client:** Established the `JulesAPIClient` with `axios` and `axios-retry`.
- **Formatting Engine:** Created the `json`, `pretty`, and `table` output formatters.
- **Authentication:** Initial API key storage implementation in the keychain.

## Rationale for Key Changes

- **Renaming to Julius:** Improved identity clarity and consistency with the "AI Agent" positioning.
- **Keychain vs. Config:** Moved sensitive data (OAuth secrets) from plaintext JSON to the system keychain to meet security best practices.
- **TokenProvider Pattern:** Decoupled `JulesAPIClient` from specific auth methods, allowing for easier expansion to new authentication strategies in the future.
- **Buffer Accumulation:** Replaced string-based chunk processing in webhooks with `Buffer` to prevent UTF-8 corruption, essential for reliability in internationalized environments.
- **Loop-based Pagination:** Switched from spread operators to explicit loops in `fetchAllPages` to ensure stability when dealing with massive datasets that exceed the JavaScript stack limit.
