# Airlock Testing Guide

## Overview

This guide walks you through testing the ReviewBoard MCP server in an **airlock environment** using Docker. This simulates the production deployment while allowing you to test with VS Code locally.

---

## What You'll Test

- ✅ Docker image builds correctly
- ✅ HTTP server starts and responds to health checks
- ✅ MCP protocol works via HTTP/SSE transport
- ✅ Authentication with ReviewBoard works
- ✅ All 17 tools are accessible and functional
- ✅ VS Code can connect and use the tools

---

## Prerequisites

### In Your Airlock Environment

- Docker installed and running
- Git access to clone the repository
- Network access to ReviewBoard (https://reviewboard.netapp.com)
- VS Code with MCP extension installed

### Credentials Needed

- **ReviewBoard API Token** - Get from https://reviewboard.netapp.com/account/preferences/api-tokens/
- **ReviewBoard Base URL** - Typically `https://reviewboard.netapp.com`

---

## Step-by-Step Testing Process

### Step 1: Clone and Build Docker Image

```bash
# Clone the repository (if not already done)
git clone https://github.com/netbrah/reviewboard_mcp.git
cd reviewboard_mcp

# Build the Docker image
docker build -t reviewboard-mcp:test .

# Verify image was built
docker images | grep reviewboard-mcp
```

**Expected output:**
```
reviewboard-mcp    test    <image_id>    <timestamp>    <size>
```

### Step 2: Run the Docker Container

```bash
# Run the container, exposing port 3000
docker run -d \
  --name reviewboard-mcp-test \
  -p 3000:3000 \
  reviewboard-mcp:test

# Verify container is running
docker ps | grep reviewboard-mcp-test
```

**Expected output:**
```
<container_id>   reviewboard-mcp:test   ...   Up X seconds   0.0.0.0:3000->3000/tcp   reviewboard-mcp-test
```

### Step 3: Verify Server Health

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "reviewboard-mcp-server",
#   "version": "1.0.0",
#   "transport": "streamable-http",
#   "timestamp": "2025-10-29T..."
# }

# Test root endpoint for info
curl http://localhost:3000/

# Expected response with server info and endpoints
```

### Step 4: Test MCP Protocol

```bash
# Set your credentials
export REVIEWBOARD_TOKEN="your_reviewboard_api_token_here"
export REVIEWBOARD_URL="https://reviewboard.netapp.com"

# Test tools/list method
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REVIEWBOARD_TOKEN" \
  -H "X-ReviewBoard-URL: $REVIEWBOARD_URL" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Expected response: JSON-RPC response with list of 17 tools
```

**Expected output includes:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "get_review_request",
        "description": "Get details of a specific review request...",
        "inputSchema": { ... }
      },
      ... (16 more tools)
    ]
  }
}
```

### Step 5: Test a Simple Tool Call

```bash
# Test get_review_request tool with a known review ID
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REVIEWBOARD_TOKEN" \
  -H "X-ReviewBoard-URL: $REVIEWBOARD_URL" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "id": 2,
    "params": {
      "name": "get_review_request",
      "arguments": {
        "reviewId": "858846"
      }
    }
  }'

# Expected response: Review request details in JSON format
```

### Step 6: Configure VS Code

Create or update `.vscode/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "reviewboard-airlock": {
      "url": "http://localhost:3000/mcp",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer ${input:reviewboard_api_token}",
        "X-ReviewBoard-URL": "${input:reviewboard_base_url}"
      }
    }
  },
  "inputs": [
    {
      "id": "reviewboard_api_token",
      "type": "promptString",
      "description": "ReviewBoard API Token",
      "password": true
    },
    {
      "id": "reviewboard_base_url",
      "type": "promptString",
      "description": "ReviewBoard Base URL",
      "default": "https://reviewboard.netapp.com"
    }
  ]
}
```

### Step 7: Test with VS Code

1. **Restart VS Code** (or reload window)
2. **Open the MCP panel** in VS Code
3. **Verify "reviewboard-airlock" server appears**
4. **Enter credentials when prompted**:
   - ReviewBoard API Token: `your_token_here`
   - ReviewBoard Base URL: `https://reviewboard.netapp.com`
5. **Check server status** - Should show "Connected"
6. **Browse available tools** - Should list all 17 tools
7. **Test a tool**:
   - Try: "Show me review 858846"
   - Verify it calls `get_review_request` and returns data

---

## Troubleshooting

### Container won't start

**Problem:** Docker container exits immediately

**Check logs:**
```bash
docker logs reviewboard-mcp-test
```

**Common issues:**
- Port 3000 already in use: Change to `-p 3001:3000`
- Build failed: Check `docker build` output for errors

### Health check fails

**Problem:** `curl http://localhost:3000/health` fails

**Solutions:**
1. Verify container is running: `docker ps`
2. Check container logs: `docker logs reviewboard-mcp-test`
3. Verify port mapping: `docker port reviewboard-mcp-test`
4. Test from inside container:
   ```bash
   docker exec reviewboard-mcp-test curl http://localhost:3000/health
   ```

### MCP protocol returns errors

**Problem:** Tools/list returns authentication errors

**Solutions:**
1. Verify ReviewBoard token is valid:
   ```bash
   curl -H "Authorization: token $REVIEWBOARD_TOKEN" \
     $REVIEWBOARD_URL/api/
   ```
2. Check ReviewBoard URL is correct (no trailing slash)
3. Verify network access from airlock to ReviewBoard
4. Check container logs for detailed error messages

### VS Code won't connect

**Problem:** VS Code shows "Connection failed"

**Solutions:**
1. Verify Docker container is running: `docker ps`
2. Test MCP endpoint manually (see Step 4)
3. Check VS Code MCP extension logs
4. Verify JSON syntax in `.vscode/mcp.json`
5. Try reloading VS Code window

### Tools return empty or error responses

**Problem:** Tool calls succeed but return no data

**Solutions:**
1. Verify ReviewBoard API is accessible:
   ```bash
   curl -H "Authorization: token $REVIEWBOARD_TOKEN" \
     $REVIEWBOARD_URL/api/review-requests/858846/
   ```
2. Check ReviewBoard token has appropriate permissions
3. Try a different review ID (use one you know exists)
4. Check container logs for ReviewBoard API errors

---

## What to Test

### Basic Functionality

- [ ] Health endpoint responds
- [ ] Root endpoint shows server info
- [ ] Tools/list returns all 17 tools
- [ ] VS Code can connect to server
- [ ] VS Code shows server as "Connected"

### Authentication

- [ ] Invalid token returns proper error
- [ ] Valid token allows access
- [ ] Missing headers return proper error
- [ ] Token with insufficient permissions handled correctly

### Tool Functionality (Sample Tests)

Test a few representative tools:

- [ ] **get_review_request** - Fetch review 858846
  ```
  Ask: "Show me review 858846"
  Expected: Review details with status, description, author
  ```

- [ ] **get_review_requests** - List recent reviews
  ```
  Ask: "Show me the last 5 reviews"
  Expected: List of 5 review requests
  ```

- [ ] **get_full_diff_patch** - Get diff for a review
  ```
  Ask: "Show me the diff for review 858846"
  Expected: Unified diff patch showing code changes
  ```

- [ ] **get_comprehensive_comments_analysis** - Get comments
  ```
  Ask: "What comments were made on review 858846?"
  Expected: List of comments with context
  ```

### Performance

- [ ] Initial connection time < 5 seconds
- [ ] Tool calls respond within 5-10 seconds
- [ ] Multiple concurrent tool calls work
- [ ] Server remains responsive under load

---

## Clean Up

When testing is complete:

```bash
# Stop and remove container
docker stop reviewboard-mcp-test
docker rm reviewboard-mcp-test

# Optionally remove image
docker rmi reviewboard-mcp:test

# Remove VS Code config (if desired)
rm .vscode/mcp.json
```

---

## Success Criteria

Your airlock test is successful when:

✅ Docker container runs without errors  
✅ Health endpoint returns "healthy"  
✅ MCP protocol responds correctly  
✅ VS Code connects successfully  
✅ All 17 tools are listed  
✅ Sample tool calls return valid data  
✅ Authentication works correctly  
✅ Server remains stable during testing  

---

## Next Steps After Successful Testing

1. **Document any issues encountered** - Note in GitHub issues
2. **Take screenshots** - Capture VS Code working with the server
3. **Record test results** - Document what worked and what didn't
4. **Prepare for production deployment**:
   - Push Docker image to registry
   - Deploy to production infrastructure
   - Register with LiteLLM proxy (manual step)
   - Test via LLM proxy

---

## Docker Commands Quick Reference

```bash
# Build image
docker build -t reviewboard-mcp:test .

# Run container
docker run -d --name reviewboard-mcp-test -p 3000:3000 reviewboard-mcp:test

# Check status
docker ps

# View logs
docker logs reviewboard-mcp-test
docker logs -f reviewboard-mcp-test  # Follow logs

# Execute command in container
docker exec reviewboard-mcp-test curl http://localhost:3000/health

# Stop container
docker stop reviewboard-mcp-test

# Start stopped container
docker start reviewboard-mcp-test

# Remove container
docker rm reviewboard-mcp-test

# Remove image
docker rmi reviewboard-mcp:test
```

---

## VS Code MCP Testing Tips

1. **Use VS Code Dev Tools**:
   - Open Command Palette → "Developer: Toggle Developer Tools"
   - Check Console for MCP-related logs

2. **Check MCP Extension Logs**:
   - Look for connection errors
   - Verify tool registration
   - Check request/response flow

3. **Test incrementally**:
   - First: Connection works
   - Second: Tools list correctly
   - Third: Individual tools work
   - Fourth: Complex queries work

4. **Keep container logs visible**:
   ```bash
   docker logs -f reviewboard-mcp-test
   ```
   Watch for errors while testing in VS Code

---

## Support

**During Testing:**
- Check Docker container logs first
- Verify ReviewBoard API access independently
- Test MCP protocol with curl before VS Code
- Document exact error messages

**After Testing:**
- Report issues on GitHub with logs and steps to reproduce
- Share successful test results
- Document any configuration changes needed

---

Last Updated: 2025-10-29
