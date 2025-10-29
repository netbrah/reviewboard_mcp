# Development Guide

Complete guide for developing, testing, and contributing to the ReviewBoard MCP Server.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Release Process](#release-process)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Git**: Latest version
- **ReviewBoard Account**: With API token access
- **Docker**: (Optional) For containerized development

### Clone the Repository

```bash
git clone https://github.com/netbrah/reviewboard_mcp.git
cd reviewboard_mcp
```

---

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

This installs all production and development dependencies defined in `package.json`.

### 2. Configure Test Environment

```bash
# Copy template
cp .env.test.template .env.test

# Edit with your credentials
nano .env.test
```

**Required configuration:**
```bash
REVIEWBOARD_BASE_URL=https://reviewboard.netapp.com
REVIEWBOARD_API_TOKEN=your-api-token-here
TEST_REVIEW_ID=858846
TEST_REVIEW_ID_ALT=882166
```

**⚠️ Important:** Never commit `.env.test` - it's in `.gitignore` for security.

### 3. Build the Project

```bash
npm run build
```

This compiles TypeScript files from `src/` to `build/`.

### 4. Verify Setup

```bash
# Build should succeed
npm run build

# Check build output
ls -la build/

# Test stdio mode (requires credentials)
# npm start

# Test HTTP mode
npm run start:http
# In another terminal: curl http://localhost:3000/health
```

---

## Development Workflow

### Branch Strategy

```
main           - Production-ready code
├── develop    - Integration branch
├── feature/*  - Feature development
├── bugfix/*   - Bug fixes
└── copilot/*  - Copilot-assisted development
```

### Creating a New Feature

```bash
# Create feature branch
git checkout -b feature/my-new-feature

# Make changes
# ... edit files ...

# Build and test
npm run build
npm test

# Commit changes
git add .
git commit -m "Add: my new feature description"

# Push to remote
git push origin feature/my-new-feature

# Create pull request on GitHub
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Use consistent indentation (2 spaces)
- **Imports**: Group by external/internal
- **Error Handling**: Always use try-catch with descriptive messages
- **Comments**: Add JSDoc comments for public methods

---

## Testing

### Test Structure

```
test/
├── README.md                      - Test documentation
├── test-patch-diffs.js           - Patch diff functionality tests
├── test-revision-tools.js        - Revision tracking tests
└── test-comment-resolution.js    - Comment resolution tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:patch-diffs
npm run test:revision
npm run test:comments

# Run all sequentially
npm run test:all
```

### Test Requirements

- Valid `.env.test` configuration
- Network access to ReviewBoard instance
- Valid API token with read permissions
- Test review requests exist (858846, 882166)

### Writing New Tests

```javascript
// test/test-my-feature.js
import { ReviewBoardClient } from '../build/reviewboard-client.js';

// Load test configuration
const config = {
  baseUrl: process.env.REVIEWBOARD_BASE_URL,
  apiToken: process.env.REVIEWBOARD_API_TOKEN,
};

const client = new ReviewBoardClient(config);

async function testMyFeature() {
  console.log('Testing my feature...');
  
  try {
    const result = await client.myNewMethod();
    console.log('✅ Test passed');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testMyFeature();
```

### HTTP Mode Testing

```bash
# Terminal 1: Start HTTP server
npm run start:http

# Terminal 2: Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/

# Test SSE connection
curl -N \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-ReviewBoard-URL: https://reviewboard.netapp.com" \
  http://localhost:3000/mcp/sse
```

---

## CI/CD Pipeline

### Overview

The project uses GitHub Actions with three main workflows:

1. **CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
   - Build and test
   - Build Docker image
   - Security scanning
   - Deploy to staging/production

2. **Test Suite** (`.github/workflows/test.yml`)
   - stdio mode tests
   - HTTP mode tests
   - Integration tests

3. **Release** (triggered on tag push)
   - Create GitHub release
   - Generate changelog
   - Publish Docker images

### Triggering Workflows

```bash
# Automatic triggers:
git push origin main           # CI/CD + Tests
git push origin develop        # CI/CD + Tests + Deploy to staging
git push origin feature/*      # Tests only

# Manual trigger:
gh workflow run ci-cd.yml

# With deployment:
gh workflow run ci-cd.yml -f deploy_environment=production
```

### Required Secrets

Configure in GitHub repository settings:

```bash
# Repository Settings → Secrets and variables → Actions

REVIEWBOARD_API_TOKEN       # For testing
REVIEWBOARD_BASE_URL        # (can be variable)
LITELLM_API_KEY_PRODUCTION  # For production deployment
LITELLM_API_KEY_STAGING     # For staging deployment
```

See [SECRETS-CONFIGURATION.md](./SECRETS-CONFIGURATION.md) for detailed setup.

### Monitoring CI/CD

```bash
# View recent runs
gh run list

# Watch specific run
gh run watch

# View run details
gh run view <run-id>

# Download artifacts
gh run download <run-id>
```

---

## Release Process

### Creating a Release

1. **Prepare Release**
   ```bash
   # Ensure all changes are merged to main
   git checkout main
   git pull origin main
   
   # Update version in package.json
   npm version patch  # or minor, or major
   
   # This creates a commit and tag
   ```

2. **Push Release**
   ```bash
   git push origin main
   git push origin --tags
   ```

3. **GitHub Actions Will:**
   - Build and test
   - Create Docker images
   - Create GitHub release
   - Generate changelog
   - Optionally deploy to production

4. **Verify Release**
   ```bash
   # Check release on GitHub
   gh release view v1.0.0
   
   # Verify Docker image
   docker pull ghcr.io/netbrah/reviewboard_mcp:v1.0.0
   ```

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Tag created and pushed
- [ ] GitHub release created
- [ ] Docker images published
- [ ] Deployment successful (if applicable)
- [ ] Release announcement sent

---

## Troubleshooting

### Build Issues

**Problem:** TypeScript compilation errors

```bash
# Solution: Clean and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Problem:** `Cannot find module` errors

```bash
# Solution: Ensure all imports use .js extension
import { Foo } from './foo.js';  // ✅ Correct
import { Foo } from './foo';     // ❌ Incorrect
```

### Test Issues

**Problem:** Tests fail with authentication errors

```bash
# Solution: Verify credentials
cat .env.test  # Check configuration
curl -H "Authorization: token YOUR_TOKEN" \
  https://reviewboard.netapp.com/api/ | jq .
```

**Problem:** Tests timeout

```bash
# Solution: Check network and ReviewBoard accessibility
ping reviewboard.netapp.com
curl -I https://reviewboard.netapp.com
```

### HTTP Server Issues

**Problem:** Port already in use

```bash
# Solution: Change port
PORT=3001 npm run start:http

# Or kill existing process
lsof -ti:3000 | xargs kill
```

**Problem:** SSE connection fails with 401

```bash
# Solution: Verify headers
curl -v \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-ReviewBoard-URL: https://reviewboard.netapp.com" \
  http://localhost:3000/mcp/sse
```

### Docker Issues

**Problem:** Docker build fails

```bash
# Solution: Build with verbose output
docker build --no-cache --progress=plain -t reviewboard-mcp .
```

**Problem:** Container won't start

```bash
# Solution: Check logs
docker logs reviewboard-mcp
docker run -it reviewboard-mcp /bin/sh  # Debug interactively
```

### CI/CD Issues

**Problem:** GitHub Actions fails with secret errors

```bash
# Solution: Verify secrets are set
gh secret list
gh secret set REVIEWBOARD_API_TOKEN
```

**Problem:** Deploy step fails

```bash
# Solution: Check deployment logs
gh run view --log-failed
```

---

## Additional Resources

### Documentation

- [README.md](../README.md) - Project overview
- [TOOLS.md](./TOOLS.md) - All 17 tools reference
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [SECRETS-CONFIGURATION.md](./SECRETS-CONFIGURATION.md) - Secrets setup
- [HTTP-MIGRATION-SUMMARY.md](./HTTP-MIGRATION-SUMMARY.md) - Architecture details

### External References

- [MCP Specification](https://modelcontextprotocol.io/)
- [ReviewBoard API](https://www.reviewboard.org/docs/manual/latest/webapi/)
- [LiteLLM Proxy](https://docs.litellm.ai/docs/proxy/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/netbrah/reviewboard_mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/netbrah/reviewboard_mcp/discussions)
- **Email**: Contact repository maintainers

---

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

---

## License

MIT License - see [LICENSE](../LICENSE) file for details.
