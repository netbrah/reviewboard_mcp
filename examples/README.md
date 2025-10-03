# Examples Directory

This directory contains example scripts and utilities for exploring and testing the ReviewBoard MCP server capabilities.

## 📁 Directory Contents

### 🔍 API Exploration Scripts

#### `explore-reviewboard-api.js`
Comprehensive API exploration script that discovers and documents ReviewBoard API capabilities.
- Analyzes available endpoints
- Tests different API patterns
- Generates capability reports

#### `analyze-api.js`
Deep analysis of ReviewBoard API structure and responses.
- Examines response formats
- Identifies available fields
- Documents API patterns

### 📊 Diff & Patch Tools

#### `get-complete-patch.js`
Retrieves complete unified diff patches for review requests.
```bash
node examples/get-complete-patch.js <review-request-id>
```

#### `get-raw-patch.js`
Gets raw patch data from ReviewBoard API.
```bash
node examples/get-raw-patch.js <review-request-id> [revision]
```

#### `detailed-diff.js`
Provides detailed diff analysis with file-by-file breakdown.
```bash
node examples/detailed-diff.js <review-request-id>
```

#### `get-diff-files.js`
Lists all files changed in a review request.
```bash
node examples/get-diff-files.js <review-request-id>
```

### 🐛 Debug Utilities

#### `debug-api-calls.cjs`
Debug tool for analyzing API call patterns and responses.
- Logs all API requests
- Shows response structure
- Helps troubleshoot API issues

#### `debug-comments.js`
Debug utility for analyzing comment structures and data.
- Examines comment metadata
- Shows comment relationships
- Tests comment parsing logic

#### `debug-files.js`
Debug tool for file-related API calls.
- Tests file retrieval
- Analyzes file metadata
- Debugs file content issues

#### `debug-file-content.mjs`
Specialized debug tool for file content analysis.
- Examines file encoding
- Tests content retrieval
- Debugs content format issues

### 📈 Report Generation

#### `generate-final-report.mjs`
Generates comprehensive analysis reports for review requests.
- Combines data from multiple API calls
- Creates structured report
- Exports in JSON format

```bash
node examples/generate-final-report.mjs <review-request-id>
```

## 🚀 Usage

### Prerequisites

Set up your environment variables:
```bash
export REVIEWBOARD_BASE_URL="https://reviewboard.example.com"
export REVIEWBOARD_API_TOKEN="your-api-token"
```

Or configure in `.vscode/mcp.json` (see main README).

### Running Examples

Most scripts accept a review request ID as an argument:

```bash
# Get complete patch for review 858846
node examples/get-complete-patch.js 858846

# Explore API capabilities
node examples/explore-reviewboard-api.js

# Generate comprehensive report
node examples/generate-final-report.mjs 858846
```

## 📝 Development Workflow

These examples are useful for:

1. **Learning the API**
   - Run `explore-reviewboard-api.js` to understand available endpoints
   - Use `analyze-api.js` to see response structures

2. **Debugging Issues**
   - Use debug-*.js scripts to troubleshoot specific problems
   - Check API responses and data formats

3. **Testing New Features**
   - Modify example scripts to test new API patterns
   - Validate responses before implementing in main server

4. **Generating Reports**
   - Use `generate-final-report.mjs` for comprehensive analysis
   - Export data for further processing

## 🛠️ Creating New Examples

When creating new example scripts:

1. Follow the naming convention: `action-description.js`
2. Add usage instructions in comments at the top of the file
3. Include environment variable checks
4. Provide clear error messages
5. Update this README with the new example

Example template:

```javascript
#!/usr/bin/env node
/**
 * Script Name: Brief description
 *
 * Usage: node examples/script-name.js <args>
 *
 * Description: Detailed description of what the script does
 */

import { ReviewBoardClient } from '../build/reviewboard-client.js';

// Check environment variables
if (!process.env.REVIEWBOARD_BASE_URL || !process.env.REVIEWBOARD_API_TOKEN) {
  console.error('Please set REVIEWBOARD_BASE_URL and REVIEWBOARD_API_TOKEN');
  process.exit(1);
}

// Your code here
async function main() {
  const client = new ReviewBoardClient({
    baseUrl: process.env.REVIEWBOARD_BASE_URL,
    apiToken: process.env.REVIEWBOARD_API_TOKEN
  });

  // ... implementation
}

main().catch(console.error);
```

## 🔗 Related Documentation

- **[../docs/TOOLS.md](../docs/TOOLS.md)** - Complete MCP tool reference
- **[../test/](../test/)** - Test suites
- **[../README.md](../README.md)** - Main project documentation

## 📊 Example Use Cases

### Case 1: Investigating a Review
```bash
# Get basic info
node examples/analyze-api.js 858846

# Get detailed diff
node examples/detailed-diff.js 858846

# Get complete patch
node examples/get-complete-patch.js 858846

# Generate full report
node examples/generate-final-report.mjs 858846
```

### Case 2: API Exploration
```bash
# Explore available endpoints
node examples/explore-reviewboard-api.js

# Debug specific API calls
node examples/debug-api-calls.cjs
```

### Case 3: Development & Testing
```bash
# Debug file content issues
node examples/debug-file-content.mjs

# Debug comment parsing
node examples/debug-comments.js

# Test file operations
node examples/debug-files.js
```

---

**Note:** These are development and exploration tools. For production use, interact with the MCP server through the official tools (see [../docs/TOOLS.md](../docs/TOOLS.md)).
