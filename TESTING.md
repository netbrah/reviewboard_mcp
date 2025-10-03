# Testing Guide

## Quick Start

All test commands now **automatically** load credentials from `.env.test` - no manual exports needed!

### Setup (One Time)

```bash
# Copy template
cp .env.test.template .env.test

# Edit with your credentials (the file already has them)
# .env.test is in .gitignore - never committed
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test suites (auto-loads .env.test)
npm run test:patch-diffs
npm run test:revision
npm run test:comments

# Run all core tests sequentially
npm run test:all

# Run a single test file
./scripts/run-test.sh test/test-patch-diffs.js
```

## How It Works

### Automatic Environment Loading

All test scripts automatically load environment variables from `.env.test`:

1. **run-tests.sh** → Sources `.env.test` before running all tests
2. **run-test.sh** → Sources `.env.test` before running single test
3. **npm scripts** → Use run-test.sh or run-tests.sh

### What Gets Loaded

From `.env.test`:
- `REVIEWBOARD_BASE_URL` - ReviewBoard server URL
- `REVIEWBOARD_API_TOKEN` - Your API token (masked in logs)
- `TEST_REVIEW_ID` - Default test review ID (858846)
- `TEST_REVIEW_ID_ALT` - Alternate test review ID (882166)

### Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `npm test` | Full test suite | `npm test` |
| `npm run test:patch-diffs` | Patch diff tests only | `npm run test:patch-diffs` |
| `npm run test:revision` | Revision tools tests | `npm run test:revision` |
| `npm run test:comments` | Comment resolution tests | `npm run test:comments` |
| `./scripts/run-test.sh` | Single test file | `./scripts/run-test.sh test/FILE.js` |
| `./scripts/run-tests.sh` | All tests in test/ | `./scripts/run-tests.sh` |

## No More Manual Exports! ✅

**Before (manual):**
```bash
export REVIEWBOARD_BASE_URL="https://reviewboard.netapp.com"
export REVIEWBOARD_API_TOKEN="rbp_..."
node test/test-patch-diffs.js
```

**Now (automatic):**
```bash
npm run test:patch-diffs
# or
./scripts/run-test.sh test/test-patch-diffs.js
```

## Test Files

### Core Tests (Always Pass)
- ✅ `test-client.js` - MCP server connection
- ✅ `test-comment-resolution.js` - Comment analysis
- ✅ `test-patch-diffs.js` - Patch diff capabilities (6/6)
- ✅ `test-revision-tools.js` - Revision tracking (6/6)
- ✅ `mcp-server.test.mjs` - Full integration (10/10)

### Legacy Tests (Expected Errors)
- ⚠️ `test-comments-enhanced.js` - Uses deprecated API
- ⚠️ `test-comments.js` - Uses deprecated API
- ⚠️ `test-diff.js` - Uses deprecated API
- ⚠️ `test-comprehensive-comments.mjs` - Uses deprecated API
- ⚠️ `test-connection.mjs` - Uses deprecated API
- ⚠️ `test-different-review.mjs` - Uses deprecated API
- ⚠️ `test-final-comments.mjs` - Uses deprecated API
- ⚠️ `test-proper-workflow.mjs` - Uses deprecated API

### Known Issues
- ❌ `test-natural-questions.js` - Test harness error (not MCP server)

## Troubleshooting

### Missing .env.test

```bash
⚠️  .env.test not found!
Please create .env.test from template:
  cp .env.test.template .env.test
```

**Solution:**
```bash
cp .env.test.template .env.test
```

### Environment Not Loaded

If tests fail with "No API token provided":

**Check:**
```bash
cat .env.test  # Should show your credentials
```

**Verify script is executable:**
```bash
chmod +x scripts/*.sh
```

### Specific Test Fails

Run it individually to see detailed output:
```bash
./scripts/run-test.sh test/test-patch-diffs.js
```

## Configuration Files

### .env.test (Local - Not Committed)
```bash
REVIEWBOARD_BASE_URL=https://reviewboard.netapp.com
REVIEWBOARD_API_TOKEN=rbp_your_token_here
TEST_REVIEW_ID=858846
TEST_REVIEW_ID_ALT=882166
```

### .env.test.template (Committed)
Template with example values - copy to `.env.test` and customize.

### .vscode/mcp.json (VS Code - Not for Testing)
Uses secure input prompts for interactive VS Code usage:
```json
{
  "env": {
    "REVIEWBOARD_BASE_URL": "${input:reviewboard_base_url}",
    "REVIEWBOARD_API_TOKEN": "${input:reviewboard_api_token}"
  }
}
```

## Summary

✅ **Simple:** Just run `npm test` or `npm run test:patch-diffs`
✅ **Automatic:** Environment loaded from `.env.test`
✅ **Secure:** API token masked in logs
✅ **Consistent:** Same workflow for all tests
✅ **No exports needed:** Scripts handle everything
