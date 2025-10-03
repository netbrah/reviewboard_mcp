# Contributing to ReviewBoard MCP Server

Thank you for your interest in contributing! This guide will help you understand the project structure and contribution process.

## 📁 Project Structure

```
reviewboard_mcp/
├── src/                    # Source code (TypeScript)
│   ├── index.ts           # MCP server with 17 tools
│   └── reviewboard-client.ts  # ReviewBoard API client
│
├── docs/                   # Documentation
│   ├── README.md          # Documentation index
│   └── *.md               # Feature guides and references
│
├── test/                   # Test suites
│   ├── README.md          # Test documentation
│   └── test-*.js          # Test files
│
├── examples/               # Example scripts
│   ├── README.md          # Examples documentation
│   └── *.js               # API exploration & debug tools
│
└── scripts/                # Build & test automation
    └── run-tests.sh       # Test runner
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- ReviewBoard instance for testing
- API token for authentication

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd reviewboard_mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration
Create `.env.test` for testing:
```bash
cp .env.test.template .env.test
# Edit .env.test with your credentials
```

## 🛠️ Development Workflow

### 1. Make Changes

#### Adding a New Tool
1. **Implement in ReviewBoardClient** (`src/reviewboard-client.ts`)
   ```typescript
   async myNewFeature(param: string): Promise<any> {
     const response = await this.client.get(`/api/...`);
     return {
       data: response.data,
       stat: "ok"
     };
   }
   ```

2. **Expose via MCP Tool** (`src/index.ts`)
   ```typescript
   server.tool(
     "my_new_feature",
     "Description of what it does",
     {
       param: z.string().describe("Parameter description")
     },
     async ({ param }) => {
       const client = ensureClient();
       const result = await client.myNewFeature(param);
       return {
         content: [{
           type: "text",
           text: JSON.stringify(result, null, 2)
         }]
       };
     }
   );
   ```

3. **Add Tests** (`test/test-my-feature.js`)
   ```javascript
   // See test/README.md for test template
   ```

4. **Document** (`docs/TOOLS.md`)
   ```markdown
   ### my_new_feature
   **Description:** What it does
   **Parameters:** List parameters
   **Example:** Show usage example
   ```

5. **Add Natural Language Examples** (`docs/NATURAL-LANGUAGE-QUESTIONS.md`)
   ```markdown
   - "How do I use the new feature?"
   - "Show me an example of X"
   ```

### 2. Build & Test

```bash
# Build
npm run build

# Run all tests
npm test

# Run specific tests
npm run test:patch-diffs
npm run test:revision
npm run test:comments

# Quick test (skip build)
npm run test:quick
```

### 3. Documentation

Update relevant documentation:
- `docs/TOOLS.md` - Tool reference
- `docs/NATURAL-LANGUAGE-QUESTIONS.md` - Usage examples
- `README.md` - If major feature
- `PROJECT_STATUS.md` - Update statistics
- `test/README.md` - If adding tests
- `examples/README.md` - If adding examples

### 4. Commit

Follow conventional commit format:
```bash
git commit -m "feat: add new feature description"
git commit -m "fix: resolve bug description"
git commit -m "docs: update documentation"
git commit -m "test: add test coverage"
```

## 📝 Code Style

### TypeScript
- Use strict mode
- Prefer `async/await` over callbacks
- Include type annotations
- Handle errors gracefully
- Add JSDoc comments for public APIs

### Example
```typescript
/**
 * Get detailed information about a review request
 * @param reviewRequestId - ID of the review request
 * @returns Review request details
 * @throws Error if request fails
 */
async getReviewRequest(reviewRequestId: number): Promise<any> {
  try {
    const response = await this.client.get(
      `/api/review-requests/${reviewRequestId}/`
    );
    return response.data.review_request;
  } catch (error) {
    throw new Error(`Failed to get review request: ${error.message}`);
  }
}
```

### JavaScript (Tests)
- Use ES6+ features
- Clear test descriptions
- Comprehensive assertions
- Proper error handling

## 🧪 Testing Guidelines

### Test Structure
```javascript
#!/usr/bin/env node
/**
 * Test Suite: Feature Name
 */

async function main() {
  console.log('\n🧪 Testing: Feature Name');
  console.log('================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1
  try {
    console.log('Test 1: Description');
    // Test logic
    console.log('  ✅ PASS\n');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // Summary
  console.log('================================');
  console.log(`✅ ${passed}/${passed + failed} tests passed`);
  console.log('================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
```

### Test Data
- Use real ReviewBoard data where possible
- Document test review IDs in test files
- Handle API errors gracefully
- Don't commit sensitive credentials

## 📚 Documentation Guidelines

### Markdown Format
- Use proper headings (# ## ###)
- Include code examples with syntax highlighting
- Add emojis for visual clarity (✅ ⚠️ 📚 🚀)
- Cross-reference related documents
- Keep line length reasonable (~80-100 chars)

### Structure
```markdown
# Feature Name

Brief description

## Overview
What it does

## Usage
How to use it

## Examples
Code examples

## See Also
- [Related Doc](./link.md)
```

## 🔍 Review Process

### Before Submitting
- [ ] Code builds without errors
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] Commit messages are clear

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] All tests pass
- [ ] New tests added
- [ ] Tested with real ReviewBoard instance

## Documentation
- [ ] Updated docs/TOOLS.md
- [ ] Updated docs/NATURAL-LANGUAGE-QUESTIONS.md
- [ ] Updated PROJECT_STATUS.md
- [ ] Added examples if needed

## Checklist
- [ ] Code follows project style
- [ ] Self-reviewed code
- [ ] Commented complex logic
- [ ] No console.log statements left
```

## 🐛 Bug Reports

### Template
```markdown
**Description**
Clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Call tool X with parameters Y
2. Observe error Z

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- Node.js version:
- ReviewBoard version:
- OS:

**Logs**
```
Error messages or logs
```
```

## 💡 Feature Requests

### Template
```markdown
**Feature Description**
Clear description of the feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should it work?

**Alternatives**
Other ways to achieve this

**Additional Context**
Screenshots, examples, etc.
```

## 📊 Performance Considerations

- Minimize API calls (cache when possible)
- Use batch operations where available
- Handle large responses efficiently
- Consider pagination for large datasets
- Test with real-world data sizes

## 🔐 Security

- Never commit API tokens
- Use environment variables for secrets
- Sanitize user input
- Validate API responses
- Handle authentication errors gracefully

## 📈 Versioning

We use [Semantic Versioning](https://semver.org/):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

## 🤝 Community

- Be respectful and professional
- Help others learn
- Share knowledge
- Celebrate successes
- Learn from failures

## 📞 Getting Help

- Check [docs/](./docs/) for documentation
- Review [examples/](./examples/) for usage patterns
- Look at [test/](./test/) for test examples
- Ask questions in issues

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ReviewBoard MCP Server! 🎉
