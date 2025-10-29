# GitHub Actions Test Workflows - Summary

This document explains what will happen when tests run in GitHub Actions with the configured secrets.

## Configured Secrets

The following secrets must be configured in GitHub repository settings:

- `REVIEWBOARD_BASE_URL` - Base URL of ReviewBoard instance (e.g., https://reviewboard.netapp.com)
- `REVIEWBOARD_API_TOKEN` - API token for authentication with ReviewBoard

## Test Workflows

### 1. Test Suite Workflow (`test.yml`)

**Trigger**: Push to main/develop/copilot branches, PRs, or daily at 2 AM UTC

**Jobs**:

#### Job: `test-stdio` (stdio Mode Testing)
- Runs on: ubuntu-latest
- Condition: Only if `secrets.REVIEWBOARD_API_TOKEN` is set
- Steps:
  1. Checkout code
  2. Setup Node.js 18
  3. Install dependencies (`npm ci`)
  4. Build project (`npm run build`)
  5. Run stdio tests with secrets
     - Uses `REVIEWBOARD_BASE_URL` from secrets
     - Uses `REVIEWBOARD_API_TOKEN` from secrets
     - Tests review IDs: 858846, 882166
  6. Upload test results (if any failures)

#### Job: `test-http` (HTTP Mode Testing)
- Runs on: ubuntu-latest
- Condition: Only if `secrets.REVIEWBOARD_API_TOKEN` is set
- Steps:
  1. Checkout code
  2. Setup Node.js 18
  3. Install dependencies
  4. Build project
  5. Start HTTP server in background on port 3000
  6. Test health endpoint (`curl localhost:3000/health`)
  7. Test SSE endpoint with credentials
  8. Stop HTTP server
  9. Upload test results

#### Job: `test-integration` (Docker Integration)
- Runs on: ubuntu-latest
- No credentials required
- Steps:
  1. Checkout code
  2. Setup Node.js 18
  3. Install dependencies
  4. Build Docker image
  5. Run container on port 3000
  6. Test container health
  7. Display registration payload (for reference)
  8. Clean up container
  9. Upload test results

**NOTE**: LiteLLM registration payload is displayed but NOT executed (no API access)

#### Job: `test-summary`
- Runs on: ubuntu-latest
- Depends on: test-stdio, test-http
- Always runs (even if tests fail)
- Generates summary of test results

### 2. CI/CD Pipeline Workflow (`ci-cd.yml`)

**Trigger**: Push to main/develop/copilot branches, PRs, or manual dispatch

**Jobs**:

#### Job: `build-and-test`
- Runs on: ubuntu-latest
- Steps:
  1. Checkout code
  2. Setup Node.js 18
  3. Install dependencies
  4. Build TypeScript
  5. Check build artifacts
  6. Run linter (if configured)
  7. Upload build artifacts

**NOTE**: Tests are commented out here (would require secrets)

#### Job: `build-docker`
- Runs on: ubuntu-latest
- Depends on: build-and-test
- Only on push or manual dispatch
- Steps:
  1. Checkout code
  2. Setup Docker Buildx
  3. Login to GitHub Container Registry
  4. Extract metadata (tags)
  5. Build and push Docker image
     - Tags: branch name, PR number, SHA, latest (if main)
     - Platforms: linux/amd64, linux/arm64
  6. Generate image summary

#### Job: `security-scan`
- Runs on: ubuntu-latest
- Depends on: build-and-test
- Steps:
  1. Checkout code
  2. Setup Node.js 18
  3. Install dependencies
  4. Run npm audit (moderate level)
  5. Check for secrets (TruffleHog)

#### Job: `deploy-staging`
- Runs on: ubuntu-latest
- Depends on: build-and-test, build-docker
- Only on develop branch or manual dispatch
- Steps:
  1. Checkout code
  2. Deploy to staging (placeholder - needs actual deployment commands)
  3. Post-deployment notice with manual registration steps
  4. Health check after 30 seconds

**⚠️ MANUAL STEP**: LiteLLM registration must be done manually after deployment

#### Job: `deploy-production`
- Runs on: ubuntu-latest
- Depends on: build-and-test, build-docker, security-scan
- Only on main branch (push or manual dispatch)
- Requires manual approval (GitHub environment protection)
- Steps:
  1. Checkout code
  2. Deploy to production (placeholder - needs actual deployment commands)
  3. Health check after 30 seconds
  4. Create deployment summary with manual registration instructions

**⚠️ MANUAL STEP**: LiteLLM registration must be done manually after deployment

#### Job: `create-release`
- Runs on: ubuntu-latest
- Only on version tags (e.g., v1.0.0)
- Depends on: build-and-test, build-docker
- Steps:
  1. Checkout code with full history
  2. Generate changelog
  3. Create GitHub release with notes

## What Tests Actually Do

### stdio Mode Tests
- Initialize ReviewBoard client with secrets
- Test all 17 MCP tools
- Verify responses are valid
- Check error handling

### HTTP Mode Tests
- Start HTTP server
- Test health endpoint
- Test SSE connection with credentials
- Verify server responds correctly

### Docker Integration Tests
- Build production Docker image
- Run container
- Test health endpoint
- Verify container works correctly

## Expected Behavior

### ✅ When Secrets Are Configured

- `test-stdio` runs and tests against actual ReviewBoard
- `test-http` runs and tests HTTP/SSE transport
- `test-integration` runs (no secrets needed)
- Tests validate all 17 tools work correctly

### ❌ When Secrets Are Missing

- `test-stdio` is skipped (condition fails)
- `test-http` is skipped (condition fails)
- `test-integration` still runs (no secrets needed)
- Summary shows skipped tests

## Verifying Secrets Work

After secrets are configured, check GitHub Actions:

1. Go to repository on GitHub
2. Click "Actions" tab
3. Find latest workflow run
4. Check that `test-stdio` and `test-http` jobs ran (not skipped)
5. Verify all tests passed

## Troubleshooting

### Tests are skipped
- Verify secrets are configured in repository settings
- Check secret names match exactly: `REVIEWBOARD_API_TOKEN`, `REVIEWBOARD_BASE_URL`
- Ensure secrets are available to the branch (check branch protection rules)

### Tests fail with authentication errors
- Verify `REVIEWBOARD_API_TOKEN` is valid
- Test token manually: `curl -H "Authorization: token TOKEN" https://reviewboard.netapp.com/api/`
- Check token hasn't been revoked

### Tests fail with network errors
- Verify `REVIEWBOARD_BASE_URL` is correct
- Check ReviewBoard is accessible from GitHub Actions runners
- Verify no IP restrictions on ReviewBoard

## Manual Steps After CI/CD

After successful deployment:

1. **Verify deployment**: `curl https://mcp-reviewboard.ai.eng.netapp.com/health`
2. **Manual LiteLLM registration**: Follow `docs/MANUAL-LITELLM-REGISTRATION.md`
3. **Verify registration**: Check server appears in LiteLLM
4. **Test end-to-end**: Connect via VS Code using `examples/vscode-configs/mcp-proxy.json`
5. **Announce to team**: Share documentation

## Summary

✅ **Automated**: Build, test, Docker image, deployment  
❌ **Manual**: LiteLLM proxy registration  
📚 **Documentation**: Complete guides for all steps  

---

Last Updated: 2025-10-29
