# Complete Deployment Workflow

This guide provides a **complete end-to-end workflow** for deploying the ReviewBoard MCP server to production and registering it with the LiteLLM proxy.

---

## Overview

The deployment process has **three main phases**:

1. **Development & Testing** - Build and test locally
2. **Deployment** - Deploy to production infrastructure
3. **Registration** - Manually register with LiteLLM proxy

---

## Phase 1: Development & Testing

### Step 1.1: Local Development Testing

```bash
# Clone repository
git clone https://github.com/netbrah/reviewboard_mcp.git
cd reviewboard_mcp

# Install dependencies
npm install

# Build
npm run build

# Run tests (requires .env.test with credentials)
cp .env.test.template .env.test
# Edit .env.test with your ReviewBoard credentials
npm test

# Test stdio mode locally
npm start
```

### Step 1.2: Airlock Testing with Docker

See [AIRLOCK-TESTING.md](./AIRLOCK-TESTING.md) for complete guide.

```bash
# Build Docker image
docker build -t reviewboard-mcp:test .

# Run container
docker run -d --name reviewboard-mcp-test -p 3000:3000 reviewboard-mcp:test

# Test health
curl http://localhost:3000/health

# Test with VS Code
# Use examples/vscode-configs/mcp-docker-local.json

# Clean up
docker stop reviewboard-mcp-test
docker rm reviewboard-mcp-test
```

**Success Criteria:**
- ✅ All tests pass locally
- ✅ Docker container runs successfully
- ✅ Health endpoint responds
- ✅ VS Code can connect and use tools
- ✅ All 17 tools are accessible

---

## Phase 2: Deployment to Production

### Option A: Kubernetes Deployment (Recommended)

#### Step 2.1: Build and Push Docker Image

```bash
# Build for production
docker build -t reviewboard-mcp:latest .

# Tag for your registry
docker tag reviewboard-mcp:latest ghcr.io/netbrah/reviewboard_mcp:latest
docker tag reviewboard-mcp:latest ghcr.io/netbrah/reviewboard_mcp:v1.0.0

# Push to registry
docker push ghcr.io/netbrah/reviewboard_mcp:latest
docker push ghcr.io/netbrah/reviewboard_mcp:v1.0.0
```

**GitHub Actions automatically handles this on push to main branch.**

#### Step 2.2: Deploy to Kubernetes

```bash
# Review k8s-deployment.yaml
cat k8s-deployment.yaml

# Deploy
kubectl apply -f k8s-deployment.yaml

# Verify deployment
kubectl get pods -n mcp-servers
kubectl get svc -n mcp-servers
kubectl get ingress -n mcp-servers

# Check pod logs
kubectl logs -f deployment/reviewboard-mcp-server -n mcp-servers

# Verify health
kubectl exec -it deployment/reviewboard-mcp-server -n mcp-servers -- curl http://localhost:3000/health
```

#### Step 2.3: Configure Ingress/TLS

Ensure your Kubernetes cluster has:
- ✅ Ingress controller (e.g., nginx-ingress)
- ✅ Cert-manager for TLS certificates
- ✅ DNS record pointing to ingress IP

```bash
# Verify TLS certificate is ready
kubectl get certificate -n mcp-servers

# Test external access
curl https://mcp-reviewboard.ai.eng.netapp.com/health
```

### Option B: Docker Compose Deployment (Simple)

```bash
# Clone on production server
git clone https://github.com/netbrah/reviewboard_mcp.git
cd reviewboard_mcp

# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f

# Test health
curl http://localhost:3000/health
```

### Option C: Direct Node.js Deployment (VM)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete systemd service setup.

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and build
git clone https://github.com/netbrah/reviewboard_mcp.git
cd reviewboard_mcp
npm install
npm run build

# Create systemd service
sudo vi /etc/systemd/system/reviewboard-mcp.service
# (See DEPLOYMENT.md for service file)

# Start service
sudo systemctl daemon-reload
sudo systemctl enable reviewboard-mcp
sudo systemctl start reviewboard-mcp

# Check status
sudo systemctl status reviewboard-mcp
sudo journalctl -u reviewboard-mcp -f
```

---

## Phase 3: LiteLLM Proxy Registration

⚠️ **IMPORTANT**: This step **must be done manually**. GitHub Actions cannot perform this registration as it doesn't have access to the LiteLLM proxy API.

### Step 3.1: Verify Deployment

Before registering, ensure the server is accessible:

```bash
# Test health endpoint
curl https://mcp-reviewboard.ai.eng.netapp.com/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "reviewboard-mcp-server",
#   "version": "1.0.0",
#   "transport": "streamable-http",
#   "timestamp": "2025-10-29T..."
# }

# Test MCP endpoint
curl https://mcp-reviewboard.ai.eng.netapp.com/

# Expected response with server info
```

### Step 3.2: Obtain LiteLLM API Key

1. Log into LiteLLM proxy portal
2. Navigate to API Keys section
3. Generate new key with MCP server registration permissions
4. Save the key securely (format: `Bearer user=${username}&key=sk-...`)

### Step 3.3: Prepare Registration Payload

Create `registration.json`:

```json
{
  "server_name": "reviewboard_netapp",
  "alias": "reviewboard",
  "description": "NetApp ReviewBoard MCP server - Natural language interface for code reviews",
  "transport": "sse",
  "auth_type": "bearer_token",
  "url": "https://mcp-reviewboard.ai.eng.netapp.com/mcp",
  "mcp_info": {
    "logo_url": "app/static/icons/ReviewBoard.png",
    "token_prefix": "Bearer",
    "requires_username": false,
    "source": "ReviewBoard",
    "server_name": "reviewboard_netapp",
    "description": "Natural language interface for ReviewBoard code reviews with comprehensive analysis"
  },
  "mcp_access_groups": ["reviewboard", "engineering"],
  "extra_headers": ["X-ReviewBoard-URL"]
}
```

**Key Fields:**
- `server_name`: Unique identifier (use "reviewboard_netapp")
- `alias`: Short name users see (use "reviewboard")
- `transport`: Must be "sse" for HTTP streaming servers
- `auth_type`: Must be "bearer_token" for Bearer auth
- `url`: POST endpoint without trailing slash (`/mcp` not `/mcp/`)
- `extra_headers`: Custom headers to forward (ReviewBoard URL)
- `mcp_access_groups`: Who can access this server

### Step 3.4: Register with LiteLLM

```bash
# Set API key
export LITELLM_API_KEY="Bearer user=yourusername&key=sk-1234..."

# Register server
curl -X POST 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server' \
  -H 'Content-Type: application/json' \
  -H "x-litellm-api-key: $LITELLM_API_KEY" \
  -H 'litellm-changed-by: yourusername' \
  -d @registration.json

# Expected response: Server registration details with server_id
```

**Save the `server_id` from the response!**

### Step 3.5: Verify Registration

```bash
# List all registered servers
curl -X GET 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server' \
  -H "x-litellm-api-key: $LITELLM_API_KEY" | jq .

# Check health status
curl -X GET 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server/health' \
  -H "x-litellm-api-key: $LITELLM_API_KEY" | jq .

# Verify reviewboard_netapp shows status: "healthy"

# List available tools (replace SERVER_ID)
export SERVER_ID="your-server-id-here"
curl -X GET "https://llm-proxy-api.ai.eng.netapp.com/mcp-rest/tools/list?server_id=$SERVER_ID" \
  -H "x-litellm-api-key: $LITELLM_API_KEY" | jq '.tools | length'

# Should return 17 (number of tools)
```

### Step 3.6: Test End-to-End

```bash
# Test via LiteLLM proxy (requires ReviewBoard credentials)
export REVIEWBOARD_TOKEN="your-reviewboard-api-token"
export REVIEWBOARD_URL="https://reviewboard.netapp.com"

curl -X POST 'https://llm-proxy-api.ai.eng.netapp.com/mcp/reviewboard_netapp' \
  -H 'Content-Type: application/json' \
  -H "x-litellm-api-key: $LITELLM_API_KEY" \
  -H "x-mcp-reviewboard-authorization: Bearer $REVIEWBOARD_TOKEN" \
  -H "x-reviewboard-url: $REVIEWBOARD_URL" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Expected: List of 17 tools
```

---

## Phase 4: User Onboarding

### Step 4.1: Create Documentation for Users

Share these resources with your team:
- [LLM-PROXY-AUTHENTICATION.md](./LLM-PROXY-AUTHENTICATION.md) - Complete authentication guide
- [examples/vscode-configs/mcp-proxy.json](../examples/vscode-configs/mcp-proxy.json) - VS Code config

### Step 4.2: Grant Access to Users

1. **LiteLLM Access**: Add users to `reviewboard` or `engineering` access group
2. **ReviewBoard Tokens**: Users must obtain their own ReviewBoard API tokens
3. **Documentation**: Share configuration examples and troubleshooting guides

### Step 4.3: Example User Setup

Users should:

1. **Get LiteLLM API Key**:
   - Log into LiteLLM portal
   - Generate API key
   - Format: `Bearer user=${username}&key=sk-...`

2. **Get ReviewBoard API Token**:
   - Log into ReviewBoard
   - Go to My Account → API Tokens
   - Generate new token
   - Save securely

3. **Configure VS Code**:
   - Copy `examples/vscode-configs/mcp-proxy.json`
   - Paste into `.vscode/mcp.json`
   - Restart VS Code
   - Enter credentials when prompted

---

## CI/CD Pipeline Integration

### Current GitHub Actions Workflow

The CI/CD pipeline (`. github/workflows/ci-cd.yml`) handles:

- ✅ **Build & Test** - Automated on every push
- ✅ **Docker Image** - Builds and pushes to registry
- ✅ **Security Scan** - npm audit and secret detection
- ✅ **Staging Deployment** - Deploys to staging environment
- ✅ **Production Deployment** - Manual approval required

**What's NOT automated:**
- ❌ LiteLLM proxy registration (must be manual)

### Manual Steps After CI/CD

After GitHub Actions deploys to production:

1. **Wait for deployment to complete** (check Actions tab)
2. **Verify health endpoint responds**
3. **Manually register with LiteLLM** (see Phase 3 above)
4. **Verify registration successful**
5. **Test end-to-end with a user account**
6. **Announce to team** (provide documentation links)

---

## Deployment Checklist

Use this checklist for each deployment:

### Pre-Deployment
- [ ] All tests pass locally (`npm test`)
- [ ] Docker build succeeds
- [ ] Airlock testing completed successfully
- [ ] Code reviewed and approved
- [ ] Security scan passed
- [ ] Documentation updated

### Deployment
- [ ] GitHub Actions build passed
- [ ] Docker image pushed to registry
- [ ] Kubernetes/Docker deployment successful
- [ ] Health endpoint responds
- [ ] Ingress/TLS configured correctly
- [ ] DNS resolves to correct IP

### LiteLLM Registration
- [ ] LiteLLM API key obtained
- [ ] Registration payload prepared
- [ ] Server registered successfully
- [ ] Server shows "healthy" status
- [ ] All 17 tools listed correctly
- [ ] End-to-end test passed

### Post-Deployment
- [ ] User documentation shared
- [ ] Access granted to initial users
- [ ] Team announcement sent
- [ ] Monitoring/alerts configured
- [ ] Deployment notes documented

---

## Rollback Procedure

If something goes wrong:

### Kubernetes Rollback
```bash
# Check deployment history
kubectl rollout history deployment/reviewboard-mcp-server -n mcp-servers

# Rollback to previous version
kubectl rollout undo deployment/reviewboard-mcp-server -n mcp-servers

# Rollback to specific revision
kubectl rollout undo deployment/reviewboard-mcp-server -n mcp-servers --to-revision=2

# Verify rollback
kubectl get pods -n mcp-servers
kubectl logs deployment/reviewboard-mcp-server -n mcp-servers
```

### LiteLLM Unregistration
```bash
# If you need to remove the server temporarily
# Contact LiteLLM admin or use DELETE endpoint (check API docs)
```

### Docker Compose Rollback
```bash
# Stop current version
docker-compose down

# Pull previous image
docker pull ghcr.io/netbrah/reviewboard_mcp:v1.0.0

# Update docker-compose.yml to use previous version
# Restart
docker-compose up -d
```

---

## Monitoring & Maintenance

### Health Checks

Set up automated health checks:

```bash
# Add to cron or monitoring system
*/5 * * * * curl -f https://mcp-reviewboard.ai.eng.netapp.com/health || alert-on-call
```

### Log Monitoring

```bash
# Kubernetes
kubectl logs -f deployment/reviewboard-mcp-server -n mcp-servers

# Docker Compose
docker-compose logs -f

# Systemd
journalctl -u reviewboard-mcp -f
```

### Metrics to Monitor

- Response time of health endpoint
- Number of active connections
- Tool call success/failure rate
- ReviewBoard API response times
- Error rates in logs

---

## Troubleshooting Common Issues

### Deployment Issues

**Problem**: Pod crashes on startup

**Solutions**:
- Check logs: `kubectl logs <pod-name> -n mcp-servers`
- Verify image was built correctly
- Check resource limits (memory/CPU)
- Verify Node.js version in Dockerfile

**Problem**: Health check fails

**Solutions**:
- Verify port 3000 is exposed
- Check ingress configuration
- Test from inside pod: `kubectl exec -it <pod> -- curl localhost:3000/health`
- Check firewall rules

### Registration Issues

**Problem**: LiteLLM registration fails

**Solutions**:
- Verify API key is valid
- Check JSON payload is valid: `cat registration.json | jq .`
- Verify transport is "sse" not "http"
- Check URL doesn't have trailing slash on `/mcp`

**Problem**: Server shows "unhealthy"

**Solutions**:
- Verify server is accessible from LiteLLM
- Check health endpoint responds
- Verify correct URL in registration
- Wait 1-2 minutes for sync

### Runtime Issues

**Problem**: Tools return authentication errors

**Solutions**:
- Verify ReviewBoard credentials are valid
- Test ReviewBoard API directly
- Check headers are being forwarded correctly
- Verify X-ReviewBoard-URL header

---

## Support & Resources

### Documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [MANUAL-LITELLM-REGISTRATION.md](./MANUAL-LITELLM-REGISTRATION.md) - Registration instructions
- [LLM-PROXY-AUTHENTICATION.md](./LLM-PROXY-AUTHENTICATION.md) - Authentication guide
- [AIRLOCK-TESTING.md](./AIRLOCK-TESTING.md) - Testing guide

### Getting Help
- **Deployment issues**: Check GitHub Actions logs, pod logs
- **LiteLLM issues**: Contact LiteLLM admin
- **ReviewBoard issues**: Verify API access independently
- **General help**: Create GitHub issue with logs

---

Last Updated: 2025-10-29
