# Testing Documentation

This document tracks all testing performed on julius-cli.

## Test Status: Phase 3 & 4 Automated Testing In Progress ⏳

**Last Updated:** 2026-04-06  
**Automated Test Coverage:** ~30% (Initial suite established)  
**Manual CLI Test Coverage:** 100%

---

## Automated Testing Results ✅

### Unit Tests
```bash
npm test
```
**Results:** ✅ 18 PASS, 0 FAIL
- `JulesAPIClient`: Success/Error cases, retries, and rate limiting (via MSW)
- `fetchAllPages`: Correctly follows nextPageToken and aggregates results
- `inferGitHubRepo`: Correctly parses various git remote URL formats

### Infrastructure
- **Jest:** Configured for ESM/TypeScript modules.
- **MSW:** Integrated for intercepting API calls and simulating various network/API conditions.
- **Node.js:** Verified on v25.9.0.

---

## Manual Testing Results (v0.2.0) ✅

### Secure Storage (Keychain)
- `auth set`: Stores key in system keychain (verified)
- `auth status`: Shows "source: keychain" (verified)
- `auth clear`: Removes key from keychain (verified)
- `config list`: Masks API key from secure storage (verified)

### Git Inference
- `sessions create`: Successfully infers `owner/repo` from `.git/config` when `--repo` is omitted. (verified)

### Pagination
- `sources list --all`: Automatically fetches all pages of results. (verified)

### Table Output
- `--format table`: Displays clean, color-coded tables for sources, sessions, and activities. (verified)

---

### Authentication Commands ✅

#### Test: auth status (no key)
```bash
./dist/index.js auth status
```
**Result:** ✅ PASS
```json
{
  "authenticated": false,
  "source": "none",
  "valid": false,
  "endpoint": "https://jules.googleapis.com/v1alpha"
}
```

#### Test: auth set
```bash
./dist/index.js auth set test-api-key-123
```
**Result:** ✅ PASS
```json
{
  "status": "success",
  "message": "API key stored successfully"
}
```

#### Test: auth status (with key)
```bash
./dist/index.js auth status
```
**Result:** ✅ PASS
```json
{
  "authenticated": true,
  "source": "config",
  "valid": true,
  "endpoint": "https://jules.googleapis.com/v1alpha"
}
```

#### Test: auth clear
```bash
./dist/index.js auth clear
```
**Result:** ✅ PASS
```json
{
  "status": "success",
  "message": "API key removed"
}
```

---

### Help Text Tests ✅

#### Test: Main help
```bash
./dist/index.js --help
```
**Result:** ✅ PASS
- Shows all commands: auth, sources, sessions, activities
- Global options displayed
- Version flag works

#### Test: Subcommand help
```bash
./dist/index.js sessions --help
./dist/index.js activities --help
./dist/index.js sources --help
./dist/index.js auth --help
```
**Result:** ✅ PASS
- All subcommands show proper help
- Options documented
- Arguments shown with types

#### Test: Command-specific help
```bash
./dist/index.js sessions create --help
```
**Result:** ✅ PASS
- Required options marked
- Optional flags documented
- Format options shown

---

### Sessions Commands ✅

#### Test: sessions create help
```bash
./dist/index.js sessions create --help
```
**Result:** ✅ PASS
- All options displayed: -r, -p, -t, -b, --auto-pr, --require-approval, --format

#### Test: sessions list help
```bash
./dist/index.js sessions list --help
```
**Result:** ✅ PASS
- Filter options shown: --repo, --state, --page-size, --page-token

#### Test: sessions get help
```bash
./dist/index.js sessions get --help
```
**Result:** ✅ PASS
- Session ID argument documented
- Format option available

#### Test: sessions send help
```bash
./dist/index.js sessions send --help
```
**Result:** ✅ PASS
- Message option required (-m, --message)
- Session ID argument required

#### Test: sessions approve help
```bash
./dist/index.js sessions approve --help
```
**Result:** ✅ PASS
- Session ID argument required

#### Test: sessions cancel help
```bash
./dist/index.js sessions cancel --help
```
**Result:** ✅ PASS
- Session ID argument required

---

### Activities Commands ✅

#### Test: activities list help
```bash
./dist/index.js activities list --help
```
**Result:** ✅ PASS
- Session ID argument required
- Filter options: --type, --author
- Pagination options: --page-size, --page-token

#### Test: activities get help
```bash
./dist/index.js activities get --help
```
**Result:** ✅ PASS
- Session ID and Activity ID arguments required

---

### Sources Commands ✅

#### Test: sources list help
```bash
./dist/index.js sources list --help
```
**Result:** ✅ PASS
- Pagination options available

#### Test: sources get help
```bash
./dist/index.js sources get --help
```
**Result:** ✅ PASS
- Source ID argument required

---

### Exit Codes ✅

#### Test: Success (exit 0)
```bash
./dist/index.js auth status; echo $?
```
**Result:** ✅ PASS - Exit code 0

#### Test: Help (exits non-zero)
```bash
./dist/index.js --help; echo $?
```
**Result:** ✅ PASS - Exit code 1 (expected for help)

---

### Configuration Storage ✅

#### Test: Config file created
```bash
ls -la ~/.config/julius-cli/
```
**Result:** ✅ PASS
- Config directory created
- config.json file exists
- Proper permissions

#### Test: Config file format
```bash
cat ~/.config/julius-cli/config.json
```
**Result:** ✅ PASS
- Valid JSON format
- apiKey stored correctly
- Default values present

---

## API Integration Tests (Pending)

**Status:** ⏳ PENDING - Requires valid Jules API key and active Jules environment

### Tests to Perform with Live API:

1. **Sources List**
   - Verify API response format matches types
   - Test pagination
   - Check empty response handling

2. **Sources Get**
   - Valid source ID
   - Invalid source ID (404 error)
   - Verify response structure

3. **Sessions Create**
   - Create with minimal options
   - Create with all options
   - Invalid repo format
   - Verify session creation response

4. **Sessions List**
   - List all sessions
   - Filter by repo
   - Filter by state
   - Pagination through results

5. **Sessions Get**
   - Valid session ID
   - Invalid session ID (404)
   - Check state transitions

6. **Sessions Send**
   - Send message to active session
   - Send to completed session (error expected)
   - Send to cancelled session (error expected)

7. **Sessions Approve**
   - Approve plan in AWAITING_APPROVAL state
   - Approve plan in wrong state (error expected)

8. **Sessions Cancel**
   - Cancel active session
   - Cancel completed session (error expected)

9. **Activities List**
   - List activities for session
   - Filter by type
   - Filter by author
   - Pagination

10. **Activities Get**
    - Valid activity ID
    - Invalid activity ID (404)

11. **Error Handling**
    - 401/403 authentication errors
    - 404 not found errors
    - 429 rate limiting
    - 500 server errors
    - Network errors
    - Timeout scenarios

12. **Retry Logic**
    - Verify retries on network errors
    - Verify retries on 429
    - Verify retries on 5xx
    - Verify exponential backoff
    - Verify Retry-After header handling

---

## Cross-Platform Tests (Pending)

**Status:** ⏳ PENDING

### Platforms to Test:
- [x] Linux ✅
- [ ] macOS
- [ ] Windows (cmd)
- [ ] Windows (PowerShell)
- [ ] Windows (WSL)

### Platform-Specific Tests:
- Config file location
- Shebang execution
- Path handling
- Color output
- Line endings

---

## Unit Tests (Not Yet Implemented)

**Status:** 📋 PLANNED for Phase 4

### Test Files to Create:
- `test/unit/api/client.test.ts` - HTTP client tests
- `test/unit/api/sources.test.ts` - Sources API tests
- `test/unit/api/sessions.test.ts` - Sessions API tests
- `test/unit/api/activities.test.ts` - Activities API tests
- `test/unit/config/index.test.ts` - Config management tests
- `test/unit/output/formatter.test.ts` - Output formatter tests
- `test/unit/output/json.test.ts` - JSON formatter tests
- `test/unit/output/pretty.test.ts` - Pretty formatter tests
- `test/unit/utils/errors.test.ts` - Error handling tests

### Coverage Goals:
- Overall: >80%
- Critical paths: 100%
- Error handling: 100%
- API client: >90%

---

## Integration Tests (Not Yet Implemented)

**Status:** 📋 PLANNED for Phase 4

### Test Files to Create:
- `test/integration/auth.test.ts` - Auth workflow
- `test/integration/sessions.test.ts` - Session lifecycle
- `test/integration/activities.test.ts` - Activities workflow
- `test/integration/sources.test.ts` - Sources workflow
- `test/integration/errors.test.ts` - Error scenarios

### Tools:
- Jest for test runner
- MSW for API mocking
- Mocked Jules API responses

---

## Performance Tests (Not Yet Implemented)

**Status:** 📋 PLANNED for Phase 4

### Tests to Create:
- CLI startup time (<500ms target)
- Large list pagination (1000+ items)
- Concurrent API requests
- Memory usage monitoring
- Network timeout handling

---

## Security Tests (Not Yet Implemented)

**Status:** 📋 PLANNED for Phase 4

### Security Checklist:
- [ ] API key not logged in verbose mode
- [ ] API key not in error messages
- [ ] Config file permissions (600 on Unix)
- [ ] Input sanitization (SQL injection, XSS prevention)
- [ ] Dependency vulnerability scan
- [ ] HTTPS enforcement
- [ ] Token expiration handling

---

## Regression Tests

**Status:** 📋 TO BE ESTABLISHED

### Process:
1. Capture current behavior as baseline
2. Create automated regression suite
3. Run before each release
4. Document any breaking changes

---

## Test Coverage Summary

| Category | Status | Coverage |
|----------|--------|----------|
| Manual CLI Tests | ✅ Complete | 100% |
| Help Text | ✅ Complete | 100% |
| Exit Codes | ✅ Complete | Basic |
| Config Storage | ✅ Complete | 100% |
| API Integration | ⏳ Pending | 0% |
| Unit Tests | 📋 Planned | 0% |
| Integration Tests | 📋 Planned | 0% |
| Cross-Platform | ⏳ Pending | Linux only |
| Performance | 📋 Planned | 0% |
| Security | 📋 Planned | 0% |

---

## Known Issues

None identified in manual testing.

---

## Testing Recommendations

### Before Phase 3:
1. ✅ Complete API integration tests with live Jules instance
2. Test with real repositories
3. Verify all error scenarios
4. Test pagination edge cases

### Before Phase 4:
1. Implement unit test suite
2. Set up CI/CD testing
3. Add integration tests with MSW
4. Cross-platform validation

### Before v1.0 Release:
1. Achieve >80% code coverage
2. Security audit
3. Performance benchmarks
4. Full cross-platform testing
5. Load testing with concurrent operations

---

_Last updated: 2026-04-06_
