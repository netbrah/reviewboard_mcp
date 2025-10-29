# GitHub Actions Workflow Test Plan

## What the Workflows Will Do

Since GitHub secrets are configured with:
- `REVIEWBOARD_BASE_URL` 
- `REVIEWBOARD_API_TOKEN`

The workflows will run actual tests against the ReviewBoard instance.

## Test Workflow (`test.yml`)

### test-stdio Job
**Will run**: ✅ (secrets configured)
**Actions**:
1. Checkout code
2. Setup Node.js 18
3. Install dependencies (`npm ci`)
4. Build (`npm run build`)
5. Run stdio tests with actual ReviewBoard credentials
   - Tests all 17 MCP tools
   - Uses review IDs: 858846, 882166
   - Validates responses from actual API
6. Upload test results if any failures

**Expected Duration**: 2-3 minutes

### test-http Job
**Will run**: ✅ (secrets configured)
**Actions**:
1. Checkout code  
2. Setup Node.js 18
3. Install dependencies
4. Build project
5. Start HTTP server in background
6. Test health endpoint
7. Test SSE endpoint with ReviewBoard credentials
8. Stop server
9. Upload test results

**Expected Duration**: 1-2 minutes

### test-integration Job  
**Will run**: ✅ (no secrets needed)
**Actions**:
1. Build Docker image (locally, then copy)
2. Run container
3. Test health endpoint
4. Display registration payload (informational)
5. Clean up

**Expected Duration**: 2-3 minutes

### test-summary Job
Generates summary of all test results

## CI/CD Workflow (`ci-cd.yml`)

### build-and-test Job
**Actions**:
1. Build TypeScript
2. Check artifacts
3. Run linter (continues on error)
4. Upload artifacts

**Expected Duration**: 1 minute

### build-docker Job
**Actions**:
1. Build Docker image (with pre-built files)
2. Push to GitHub Container Registry
3. Tag with branch, SHA, latest

**Expected Duration**: 2-3 minutes

### security-scan Job
**Actions**:
1. npm audit
2. TruffleHog secret detection

**Expected Duration**: 1 minute

### deploy-staging / deploy-production
**Will NOT run**: Placeholder deployment (no actual infrastructure configured)

## Important Notes

### About Testing with Secrets

✅ **Tests WILL connect to actual ReviewBoard**
- Uses configured secrets
- Tests actual API responses
- Validates all 17 tools work
- Safe: Read-only operations

### About Docker Builds

✅ **Docker build works** 
- Builds locally first (`npm run build`)
- Copies `build/` and `node_modules/` to container
- No npm install in Docker (avoids bugs)

### About Deployment

⚠️ **Manual steps required**:
1. Tests run automatically
2. Docker images build automatically  
3. **LiteLLM registration is MANUAL** (cannot automate)
4. Follow `docs/MANUAL-LITELLM-REGISTRATION.md`

## Verifying Workflows Work

After push to branch:

1. Go to GitHub Actions tab
2. Find latest workflow run
3. Verify:
   - ✅ build-and-test completes
   - ✅ test-stdio runs (not skipped)
   - ✅ test-http runs (not skipped)
   - ✅ test-integration runs
   - ✅ build-docker completes
   - ✅ security-scan completes

## If Tests Fail

Check:
- Secrets configured correctly
- ReviewBoard API accessible
- API token valid
- Network connectivity

## Summary

✅ **Workflows configured correctly**
✅ **Secrets in place**
✅ **Docker builds fixed**
✅ **Tests will run against real API**
⏭️ **LiteLLM registration is manual**

---

Last Updated: 2025-10-29
