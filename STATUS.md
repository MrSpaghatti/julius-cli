# Julius CLI Status

**Version:** 0.7.0  
**Status:** Stable / Production-Ready  
**Last Updated:** 2026-04-07

## Overview

Julius CLI is an AI-first command-line tool designed for the Jules REST API. It provides a robust, JSON-centric interface for managing AI-driven sessions, activities, and prompt templates, with a focus on automation and security.

## Recent Achievements (v0.7.0) ✅

- **Interactive Mode (REPL) Overhaul:** Refactored REPL to execute commands in-process using Commander's internal APIs for much faster performance. Added macro support (`macro <name> <cmd...>`, `!<name>`) and basic tab-completion.
- **Multi-Provider Parity:** Expanded support beyond GitHub to include GitLab and Bitbucket.
  - **Improved Git Fetching:** `sessions pull` now correctly handles GitLab Merge Requests and Bitbucket Pull Requests.
  - **Provider-Specific Tokens:** Support for `JULES_GITHUB_API_KEY`, `JULES_GITLAB_API_KEY`, and `JULES_BITBUCKET_API_KEY` for multi-tenant environments.
- **Template Management:** Added subcommands to create, edit, delete, and import prompt templates locally.
- **Robust Repository Inference:** Improved `--repo` flag handling to automatically infer the provider from local git configuration when not explicitly provided.

## Recent Achievements (v0.6.0) ✅

- **Rebranded:** Project renamed from `jules-cli` to `julius-cli` for a cleaner identity.
- **Google OAuth 2.0:** Full support for OAuth 2.0 with PKCE (browser flow) and Device Code flow.
- **Secure Storage:** All sensitive credentials (API keys, OAuth client secrets, and tokens) are stored in the system keychain.

## Current Features 🚀

- **Authentication:** Triple support for API keys, Google OAuth 2.0, and provider-specific tokens.
- **Session Management:** Create, list, get, approve, and cancel AI sessions across GitHub, GitLab, and Bitbucket.
- **Activity Monitoring:** Real-time tailing of session progress via polling or webhooks.
- **Interactive Mode:** Advanced REPL with macros and repository context persistence.
- **Prompt Templates:** Reusable, variable-based templates with local management commands.

## Roadmap 🗺️

- **v0.8.0:** Multi-session orchestration and batch commands.
- **v1.0.0:** Final stability release and public documentation portal.

## Quality Metrics 📊

- **Build Status:** Passing ✅
- **Test Coverage:** >85% (130+ tests) ✅
- **Linting:** Clean (ESLint/Prettier) ✅
- **Type Safety:** High (TypeScript) ✅
