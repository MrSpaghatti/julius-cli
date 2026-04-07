# Julius CLI Status

**Version:** 0.6.0  
**Status:** Stable / Production-Ready  
**Last Updated:** 2026-04-07

## Overview

Julius CLI is an AI-first command-line tool designed for the Jules REST API. It provides a robust, JSON-centric interface for managing AI-driven sessions, activities, and prompt templates, with a focus on automation and security.

## Recent Achievements (v0.6.0) ✅

- **Rebranded:** Project renamed from `jules-cli` to `julius-cli` for a cleaner identity.
- **Google OAuth 2.0:** Full support for OAuth 2.0 with PKCE (browser flow) and Device Code flow.
- **Secure Storage:** All sensitive credentials (API keys, OAuth client secrets, and tokens) are stored in the system keychain.
- **Robust Tailing:** Fixed activity streaming in `wait --follow` to be reliable across polling cycles.
- **Standardized Configuration:** Uniform handling of `JULES_API_URL` and `JULES_API_ENDPOINT` environment variables.
- **Improved Pagination:** Decoupled filtering from automatic fetching of all pages for better control.
- **Streaming Table Output:** Optimized table formatting for continuous activity updates.

## Current Features 🚀

- **Authentication:** Dual support for API keys and Google OAuth 2.0.
- **Session Management:** Create, list, get, approve, and cancel AI sessions.
- **Activity Monitoring:** Real-time tailing of session progress via polling or webhooks.
- **Git Integration:** Infer repository context from local `.git` config and pull session-generated changes.
- **Prompt Templates:** Reusable, variable-based templates for consistent task execution.
- **Webhook Listener:** Local server with HMAC signature verification and rate limiting.
- **Interactive Mode:** REPL for executing commands without repeating the binary name.
- **Flexible Output:** Support for JSON, Pretty, Quiet, and Table formats across all commands.

## Roadmap 🗺️

- **v0.7.0 (Upcoming):** Improved Interactive Mode (in-process command execution) and expanded multi-provider (GitLab/Bitbucket) parity.
- **v0.8.0:** Multi-session orchestration and batch commands.
- **v1.0.0:** Final stability release and public documentation portal.

## Quality Metrics 📊

- **Build Status:** Passing ✅
- **Test Coverage:** >85% (130+ tests) ✅
- **Linting:** Clean (ESLint/Prettier) ✅
- **Type Safety:** High (TypeScript) ✅
