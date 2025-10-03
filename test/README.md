# Test Suite

Comprehensive test suites for the ReviewBoard MCP Server.

**Current Status:** ✅ 13/14 passing (92.9% success rate)
**Last Run:** 2025-06-03
See [TEST_RESULTS.md](../TEST_RESULTS.md) for detailed results.

## Configuration

All tests now use `.env.test` for credentials. Copy the template and fill in your credentials:

```bash
cp .env.test.template .env.test
# Edit .env.test with your actual credentials
```

The test runner automatically loads configuration from `.env.test`.

## Test Files

### Core Test Suites

#### `test-patch-diffs.js`
**Tests:** Patch diff and inter-revision change tracking
- ✅ Get diff revisions without patches (baseline)
- ✅ Get diff revisions with inter-revision patches
- ✅ File revision history with patches
- ✅ Partial path matching for files
- ✅ Comparison between old and new capabilities
- ✅ Backward compatibility validation

**Run:**
```bash
npm run test:patch-diffs
# or
REVIEWBOARD_BASE_URL="..." REVIEWBOARD_API_TOKEN="..." node test/test-patch-diffs.js
```

**Expected Output:** 6/6 tests passing with detailed patch diff analysis

---

#### `test-revision-tools.js`
**Tests:** Revision tracking and comparison capabilities
- ✅ Get all diff revisions
- ✅ Get revision summary with statistics
- ✅ Get file at specific revision
- ✅ Get review request history
- ✅ Compare two revisions
- ✅ Track file evolution across revisions

**Run:**
```bash
npm run test:revision
# or
REVIEWBOARD_BASE_URL="..." REVIEWBOARD_API_TOKEN="..." node test/test-revision-tools.js
```

**Expected Output:** 6/6 tests passing with revision analysis

---

#### `test-comment-resolution.js`
**Tests:** Comment analysis and resolution tracking
- ✅ Comprehensive comments analysis
- ✅ Comment resolution status tracking
- ✅ Reviewer feedback aggregation
- ✅ Issue status validation
- ✅ Comment-to-revision correlation

**Run:**
```bash
npm run test:comments
# or
REVIEWBOARD_BASE_URL="..." REVIEWBOARD_API_TOKEN="..." node test/test-comment-resolution.js
```

**Expected Output:** 100% accurate comment resolution analysis

---

#### `mcp-server.test.mjs`
**Tests:** MCP server integration and protocol compliance
- ✅ Server initialization
- ✅ Tool availability
- ✅ Request/response format validation
- ✅ Error handling
- ✅ Environment configuration

**Run:**
```bash
node test/mcp-server.test.mjs
```

---

## 🚀 Running Tests

### Run All Tests
```bash
npm test
# or
npm run test:all
```

This will:
1. Build the project (`npm run build`)
2. Run all test suites sequentially
3. Report results for each suite
4. Exit with appropriate status code

### Run Individual Test Suites
```bash
# Patch diffs only
npm run test:patch-diffs

# Revision tools only
npm run test:revision

# Comment resolution only
npm run test:comments
```

### Quick Test (Skip Build)
```bash
npm run test:quick
```

---

## ⚙️ Configuration

Tests require ReviewBoard API credentials. Set them via:

### Option 1: Environment Variables
```bash
export REVIEWBOARD_BASE_URL="https://reviewboard.netapp.com"
export REVIEWBOARD_API_TOKEN="your-api-token"
npm test
```

### Option 2: .vscode/mcp.json
Configure once in `.vscode/mcp.json`:
```json
{
  "servers": {
    "reviewboard": {
      "env": {
        "REVIEWBOARD_BASE_URL": "https://reviewboard.netapp.com",
        "REVIEWBOARD_API_TOKEN": "your-token"
      }
    }
  }
}
```

Tests will automatically extract credentials from this file.

---

## 📊 Test Coverage

### Features Tested
- ✅ **17/17 MCP Tools** - All tools validated
- ✅ **Patch Diff Capabilities** - Inter-revision diffs
- ✅ **File Evolution Tracking** - Across all revisions
- ✅ **Comment Resolution** - Intelligent analysis
- ✅ **Revision Comparison** - Any two revisions
- ✅ **Natural Language Support** - Conversational queries
- ✅ **Error Handling** - Graceful degradation
- ✅ **Backward Compatibility** - Previous functionality preserved

### Test Data
All tests use real ReviewBoard data:
- **Review #858846** - 13 revisions, 6 comments, 3 reviewers
- **Review #882166** - Alternative test case
- Production ReviewBoard instance for integration testing

---

## 📈 Test Results Format

Each test suite outputs:

```
🧪 Testing: Feature Name
================================

Test 1: Description
  ✅ PASS - Details

Test 2: Description
  ✅ PASS - Details

...

================================
✅ X/X tests passed (100%)
================================
```

---

## 🐛 Debugging Failed Tests

If tests fail:

1. **Check Configuration**
   ```bash
   echo $REVIEWBOARD_BASE_URL
   echo $REVIEWBOARD_API_TOKEN
   ```

2. **Verify Connectivity**
   ```bash
   curl -H "Authorization: token $REVIEWBOARD_API_TOKEN" \
        $REVIEWBOARD_BASE_URL/api/
   ```

3. **Check Build**
   ```bash
   npm run clean
   npm run build
   ```

4. **Run Single Test**
   ```bash
   node test/test-patch-diffs.js
   ```

5. **Enable Debug Output**
   Edit test file and uncomment debug statements

6. **Check Test Data**
   - Ensure review #858846 exists and is accessible
   - Verify you have read permissions
   - Check API version compatibility

---

## ✍️ Writing New Tests

### Test Template

```javascript
#!/usr/bin/env node
/**
 * Test Suite: Feature Name
 *
 * Tests functionality related to [describe feature]
 */

import { ReviewBoardClient } from '../build/reviewboard-client.js';

// Configuration
const TEST_REVIEW_ID = 858846;

async function main() {
  console.log('\n🧪 Testing: Feature Name');
  console.log('================================\n');

  const client = new ReviewBoardClient({
    baseUrl: process.env.REVIEWBOARD_BASE_URL,
    apiToken: process.env.REVIEWBOARD_API_TOKEN
  });

  let passed = 0;
  let failed = 0;

  // Test 1
  try {
    console.log('Test 1: Description');
    const result = await client.someMethod();

    // Assertions
    if (/* validation */) {
      console.log('  ✅ PASS - Details\n');
      passed++;
    } else {
      console.log('  ❌ FAIL - Reason\n');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAIL - ${error.message}\n`);
    failed++;
  }

  // Summary
  console.log('================================');
  const total = passed + failed;
  const percentage = ((passed / total) * 100).toFixed(0);
  console.log(`✅ ${passed}/${total} tests passed (${percentage}%)`);
  console.log('================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

### Test Guidelines

1. **Use descriptive names** - `test-feature-name.js`
2. **Test real scenarios** - Use actual ReviewBoard data
3. **Include assertions** - Validate all expected outcomes
4. **Handle errors** - Catch and report failures gracefully
5. **Output clearly** - Use emojis and formatting for readability
6. **Exit correctly** - Return 0 for success, 1 for failure
7. **Document** - Add comments explaining complex tests
8. **Update README** - Add new tests to this document

---

## 📊 Continuous Integration

Test suite is designed for CI/CD integration:

```yaml
# Example .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
        env:
          REVIEWBOARD_BASE_URL: ${{ secrets.RB_URL }}
          REVIEWBOARD_API_TOKEN: ${{ secrets.RB_TOKEN }}
```

---

## 🔗 Related Documentation

- **[../docs/TOOLS.md](../docs/TOOLS.md)** - Tool reference
- **[../examples/](../examples/)** - Example scripts
- **[../README.md](../README.md)** - Main documentation

---

**Test Status:** ✅ All tests passing (100%)
**Last Run:** October 2025
**Coverage:** 17/17 tools validated
