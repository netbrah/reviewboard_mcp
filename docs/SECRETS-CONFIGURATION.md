# GitHub Secrets Configuration Guide

This document explains how to configure GitHub secrets and variables for the ReviewBoard MCP Server CI/CD pipeline.

## Required Secrets

### 1. REVIEWBOARD_API_TOKEN

**Description:** ReviewBoard API token for authentication during testing and deployment.

**How to obtain:**
1. Log in to your ReviewBoard instance
2. Click on your username → "My Account"
3. Navigate to "API Tokens"
4. Click "Generate a new API token"
5. Give it a descriptive name (e.g., "GitHub Actions CI/CD")
6. Copy the generated token

**How to configure:**
```bash
# Via GitHub CLI
gh secret set REVIEWBOARD_API_TOKEN -b "your-token-here"

# Or via GitHub Web UI:
# Repository → Settings → Secrets and variables → Actions → New repository secret
```

**Usage:**
- Running tests in CI/CD
- Testing HTTP server functionality
- Validating API connectivity

**Scope:** Repository secret (can be made into environment secret for staging/production separation)

---

### 2. REVIEWBOARD_BASE_URL

**Description:** Base URL of your ReviewBoard instance.

**Example:** `https://reviewboard.netapp.com`

**How to configure:**
```bash
# This can be a variable (not secret) since it's not sensitive
gh variable set REVIEWBOARD_BASE_URL -b "https://reviewboard.netapp.com"

# Or as a secret if preferred:
gh secret set REVIEWBOARD_BASE_URL -b "https://reviewboard.netapp.com"
```

**Usage:**
- Test configuration
- API endpoint base URL
- Documentation generation

**Scope:** Repository variable (recommended) or secret

---

### 3. LITELLM_API_KEY (Production)

**Description:** LiteLLM proxy API key for production server registration.

**How to obtain:**
1. Contact your LiteLLM proxy administrator
2. Request an API key for MCP server registration
3. Key should have permissions for `/v1/mcp/server` endpoints

**How to configure:**
```bash
# Production environment secret
gh secret set LITELLM_API_KEY_PRODUCTION --env production

# Or for repository-level:
gh secret set LITELLM_API_KEY
```

**Usage:**
- Registering MCP server with LiteLLM proxy
- Updating server configuration
- Automated deployment workflows

**Scope:** Environment secret (production)

**⚠️ Important:** This key has broad access to the LiteLLM proxy. Keep it secure and rotate regularly.

---

### 4. LITELLM_API_KEY_STAGING (Optional)

**Description:** LiteLLM proxy API key for staging environment.

**Configuration:**
```bash
gh secret set LITELLM_API_KEY_STAGING --env staging
```

**Usage:**
- Testing LiteLLM integration in staging
- Validating registration flow before production

**Scope:** Environment secret (staging)

---

## Optional Secrets

### 5. DOCKER_HUB_TOKEN (Optional)

**Description:** Docker Hub personal access token for pushing images to Docker Hub (alternative to GitHub Container Registry).

**How to obtain:**
1. Log in to Docker Hub
2. Account Settings → Security → New Access Token
3. Copy the token

**Configuration:**
```bash
gh secret set DOCKER_HUB_USERNAME -b "your-username"
gh secret set DOCKER_HUB_TOKEN -b "your-token"
```

**Usage:**
- Pushing Docker images to Docker Hub
- Alternative to GitHub Container Registry

---

### 6. SLACK_WEBHOOK_URL (Optional)

**Description:** Slack webhook URL for deployment notifications.

**Configuration:**
```bash
gh secret set SLACK_WEBHOOK_URL -b "https://hooks.slack.com/services/..."
```

**Usage:**
- CI/CD status notifications
- Deployment alerts
- Test failure notifications

---

## Repository Variables

These are non-sensitive configuration values that can be stored as repository variables.

### LITELLM_API_URL

**Description:** Base URL of the LiteLLM proxy API.

**Example:** `https://llm-proxy-api.ai.eng.netapp.com`

**Configuration:**
```bash
gh variable set LITELLM_API_URL -b "https://llm-proxy-api.ai.eng.netapp.com"
```

---

### TEST_REVIEW_ID

**Description:** Default review request ID for testing.

**Example:** `858846`

**Configuration:**
```bash
gh variable set TEST_REVIEW_ID -b "858846"
```

---

### DEPLOYMENT_NAMESPACE (Kubernetes)

**Description:** Kubernetes namespace for deployment.

**Example:** `mcp-servers`

**Configuration:**
```bash
gh variable set DEPLOYMENT_NAMESPACE -b "mcp-servers"
```

---

## Environment-Specific Configuration

For proper separation of staging and production, configure environment secrets:

### Staging Environment

```bash
# Navigate to: Settings → Environments → New environment → "staging"

# Add secrets:
gh secret set REVIEWBOARD_BASE_URL --env staging -b "https://reviewboard-staging.example.com"
gh secret set REVIEWBOARD_API_TOKEN --env staging -b "staging-token"
gh secret set LITELLM_API_KEY --env staging -b "staging-litellm-key"
```

### Production Environment

```bash
# Navigate to: Settings → Environments → New environment → "production"

# Add protection rules:
# - Required reviewers
# - Wait timer: 5 minutes
# - Branch restrictions: main only

# Add secrets:
gh secret set REVIEWBOARD_BASE_URL --env production -b "https://reviewboard.netapp.com"
gh secret set REVIEWBOARD_API_TOKEN --env production -b "production-token"
gh secret set LITELLM_API_KEY --env production -b "production-litellm-key"
```

---

## Security Best Practices

### 1. Secret Rotation

- Rotate API tokens every 90 days
- Use automated rotation where possible
- Update secrets in GitHub immediately after rotation

### 2. Least Privilege

- Grant minimum required permissions to API tokens
- Use separate tokens for CI/CD vs production
- Consider service accounts for automated systems

### 3. Access Control

- Limit who can view/modify secrets (Settings → Manage access)
- Use environment protection rules for production
- Enable audit logging for secret access

### 4. Secret Scanning

- Enable secret scanning in repository settings
- Configure custom patterns for ReviewBoard tokens
- Set up alerts for exposed secrets

### 5. Audit Trail

- Regularly review secret usage in Actions logs
- Monitor for unauthorized access attempts
- Keep track of which workflows use which secrets

---

## Verification

After configuring secrets, verify they're set correctly:

```bash
# List configured secrets (values are hidden)
gh secret list

# List repository variables
gh variable list

# List environment-specific secrets
gh secret list --env production
gh secret list --env staging
```

---

## Testing Secret Configuration

Run the test workflow manually to verify secrets are working:

```bash
# Trigger test workflow
gh workflow run test.yml

# Check workflow status
gh run list --workflow=test.yml

# View workflow logs
gh run view
```

---

## Troubleshooting

### Tests fail with "401 Unauthorized"

**Cause:** Invalid or missing REVIEWBOARD_API_TOKEN

**Solution:**
1. Verify token is set: `gh secret list`
2. Check token is valid in ReviewBoard
3. Regenerate token if necessary
4. Update secret: `gh secret set REVIEWBOARD_API_TOKEN`

### Docker build fails with "authentication required"

**Cause:** Missing or invalid GITHUB_TOKEN permissions

**Solution:**
1. Check workflow has `packages: write` permission
2. Verify token hasn't expired
3. Check repository settings → Actions → General → Workflow permissions

### LiteLLM registration fails

**Cause:** Invalid LITELLM_API_KEY or wrong URL

**Solution:**
1. Verify LITELLM_API_URL variable is correct
2. Test API key manually with curl
3. Check network connectivity from GitHub Actions runners
4. Verify API key has correct permissions

### Secret not available in workflow

**Cause:** Workflow doesn't have access to secret

**Solution:**
1. Check if secret is environment-specific
2. Verify workflow references correct environment
3. Ensure workflow has permission to access environment
4. Check environment protection rules

---

## Quick Setup Script

Copy and run this script to set up all secrets at once:

```bash
#!/bin/bash
# setup-secrets.sh

echo "Setting up GitHub secrets for ReviewBoard MCP Server"
echo ""

# Repository secrets
read -p "ReviewBoard Base URL: " RB_URL
gh variable set REVIEWBOARD_BASE_URL -b "$RB_URL"

read -sp "ReviewBoard API Token: " RB_TOKEN
echo ""
gh secret set REVIEWBOARD_API_TOKEN -b "$RB_TOKEN"

read -p "LiteLLM API URL: " LITELLM_URL
gh variable set LITELLM_API_URL -b "$LITELLM_URL"

read -sp "LiteLLM API Key (Production): " LITELLM_KEY
echo ""
gh secret set LITELLM_API_KEY_PRODUCTION --env production -b "$LITELLM_KEY"

echo ""
echo "✅ Secrets configured successfully!"
echo ""
echo "Verify with: gh secret list"
```

**Usage:**
```bash
chmod +x setup-secrets.sh
./setup-secrets.sh
```

---

## References

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [ReviewBoard API Tokens](https://www.reviewboard.org/docs/manual/latest/webapi/2.0/getting-started/#authentication)
- [LiteLLM Proxy Documentation](https://docs.litellm.ai/docs/proxy/)
