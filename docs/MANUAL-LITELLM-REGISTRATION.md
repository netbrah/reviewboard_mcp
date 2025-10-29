# Manual LiteLLM Registration Guide

## Overview

This guide provides step-by-step instructions for manually registering the ReviewBoard MCP server with the LiteLLM proxy. **GitHub Actions cannot perform this registration automatically** as it does not have access to the LiteLLM proxy API.

---

## Prerequisites

- ✅ ReviewBoard MCP server deployed and accessible
- ✅ Server health endpoint responding: `https://mcp-reviewboard.ai.eng.netapp.com/health`
- ✅ LiteLLM API key with MCP server registration permissions
- ✅ Access to `https://llm-proxy-api.ai.eng.netapp.com`

---

## Step 1: Verify Server Deployment

Before registering, ensure the server is deployed and healthy:

```bash
# Check health endpoint
curl https://mcp-reviewboard.ai.eng.netapp.com/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "reviewboard-mcp-server",
#   "version": "1.0.0",
#   "transport": "streamable-http",
#   "timestamp": "2025-10-29T..."
# }

# Check root endpoint for info
curl https://mcp-reviewboard.ai.eng.netapp.com/

# Expected response with server info and endpoints
```

---

## Step 2: Prepare Registration Payload

Create a file `reviewboard-registration.json`:

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

**Important Notes:**
- `transport`: Use `"sse"` (this is what LiteLLM expects, even though we use StreamableHTTP)
- `url`: Should be `https://mcp-reviewboard.ai.eng.netapp.com/mcp` (POST endpoint, no trailing slash)
- `auth_type`: Use `"bearer_token"` for Bearer token authentication
- `extra_headers`: `["X-ReviewBoard-URL"]` tells LiteLLM to forward this custom header

---

## Step 3: Register with LiteLLM Proxy

### Option A: Using curl

```bash
# Set your LiteLLM API key
export LITELLM_API_KEY="your-api-key-here"

# Register the server
curl -X POST 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server' \
  -H 'Content-Type: application/json' \
  -H "x-litellm-api-key: $LITELLM_API_KEY" \
  -H 'litellm-changed-by: your-username' \
  -d @reviewboard-registration.json

# Expected response:
# {
#   "server_id": "550e8400-e29b-41d4-a716-446655440000",
#   "server_name": "reviewboard_netapp",
#   "alias": "reviewboard",
#   ...
# }
```

### Option B: Using Postman/Insomnia

1. **Method**: POST
2. **URL**: `https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server`
3. **Headers**:
   - `Content-Type: application/json`
   - `x-litellm-api-key: YOUR_API_KEY`
   - `litellm-changed-by: your-username` (optional, for audit)
4. **Body**: Paste the JSON from `reviewboard-registration.json`

---

## Step 4: Verify Registration

### Check Server is Listed

```bash
# List all registered MCP servers
curl -X GET 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server' \
  -H "x-litellm-api-key: $LITELLM_API_KEY" | jq .

# Look for "reviewboard_netapp" in the list
```

### Check Health Status

```bash
# Health check all registered servers
curl -X GET 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server/health' \
  -H "x-litellm-api-key: $LITELLM_API_KEY" | jq .

# Verify reviewboard_netapp shows "status": "healthy"
```

### List Available Tools

```bash
# Get the server_id from the registration response
export SERVER_ID="550e8400-e29b-41d4-a716-446655440000"

# List tools from the server
curl -X GET "https://llm-proxy-api.ai.eng.netapp.com/mcp-rest/tools/list?server_id=$SERVER_ID" \
  -H "x-litellm-api-key: $LITELLM_API_KEY" | jq '.tools | length'

# Should show 17 (the number of ReviewBoard tools)
```

---

## Step 5: Test End-to-End

### Test with MCP Inspector (Local)

```bash
# Install MCP Inspector
npx @modelcontextprotocol/inspector

# Connect to: https://mcp-reviewboard.ai.eng.netapp.com/mcp
# Provide headers:
#   Authorization: Bearer YOUR_REVIEWBOARD_API_TOKEN
#   X-ReviewBoard-URL: https://reviewboard.netapp.com
```

### Test via LiteLLM Proxy

Use Claude or another MCP client configured to use the LiteLLM proxy and verify you can:
1. See the ReviewBoard server listed
2. Access all 17 tools
3. Execute tools successfully with ReviewBoard credentials

---

## Troubleshooting

### Registration Fails with 422

**Problem**: Validation error

**Solutions**:
- Verify JSON is valid: `cat reviewboard-registration.json | jq .`
- Check required fields are present: `server_name`, `transport`, `url`
- Verify `transport` is one of: `"sse"`, `"http"`, `"stdio"`
- Verify `auth_type` is one of: `"none"`, `"api_key"`, `"bearer_token"`, `"basic"`, `"authorization"`, `"oauth2"`

### Server Shows "unhealthy" Status

**Problem**: LiteLLM cannot connect to server

**Solutions**:
1. Check server is accessible: `curl https://mcp-reviewboard.ai.eng.netapp.com/health`
2. Verify URL in registration is correct (no typos)
3. Check firewall/network rules allow LiteLLM to reach server
4. Verify endpoint path is `/mcp` not `/mcp/sse`

### Tools Not Appearing

**Problem**: Tools list is empty

**Solutions**:
1. Wait 1-2 minutes for LiteLLM to sync
2. Check server logs for errors
3. Verify server is responding to POST requests at `/mcp` endpoint
4. Test directly: 
   ```bash
   curl -X POST https://mcp-reviewboard.ai.eng.netapp.com/mcp \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -H "X-ReviewBoard-URL: https://reviewboard.netapp.com" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
   ```

### Access Denied Errors

**Problem**: 401 or 403 when testing

**Solutions**:
1. Verify LiteLLM API key is valid
2. Check API key has MCP server registration permissions
3. Verify you're in the correct `mcp_access_groups`
4. Check ReviewBoard credentials are valid when testing tools

---

## Updating Registration

If you need to update the server configuration (e.g., after redeployment):

```bash
# Get current server ID
curl -X GET 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server' \
  -H "x-litellm-api-key: $LITELLM_API_KEY" | jq '.[] | select(.server_name=="reviewboard_netapp") | .server_id'

# Update registration
curl -X PUT 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server' \
  -H 'Content-Type: application/json' \
  -H "x-litellm-api-key: $LITELLM_API_KEY" \
  -H 'litellm-changed-by: your-username' \
  -d '{
    "server_id": "YOUR_SERVER_ID",
    "url": "https://new-mcp-reviewboard.ai.eng.netapp.com/mcp",
    "description": "Updated after redeployment"
  }'
```

---

## Removing Registration

To remove the server from LiteLLM:

```bash
# Delete server (check LiteLLM API docs for exact endpoint)
# Typically: DELETE /v1/mcp/server/{server_id}
```

---

## Quick Reference

### Registration Checklist

- [ ] Server deployed and healthy
- [ ] Health endpoint responding
- [ ] Registration payload prepared
- [ ] LiteLLM API key obtained
- [ ] Registration POST successful
- [ ] Server appears in list
- [ ] Health check shows "healthy"
- [ ] All 17 tools visible
- [ ] End-to-end test successful

### Key URLs

- **Server Health**: https://mcp-reviewboard.ai.eng.netapp.com/health
- **Server Endpoint**: https://mcp-reviewboard.ai.eng.netapp.com/mcp (POST)
- **LiteLLM Registry**: https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server
- **LiteLLM Tools**: https://llm-proxy-api.ai.eng.netapp.com/mcp-rest/tools/list

### Required Headers (when testing server directly)

```
Authorization: Bearer YOUR_REVIEWBOARD_API_TOKEN
X-ReviewBoard-URL: https://reviewboard.netapp.com
Content-Type: application/json
```

---

## Questions for Infrastructure Team

Before proceeding with deployment and registration, I'd like to clarify a few infrastructure details:

1. **Deployment Environment**: Are the MCP services deployed using Docker containers? I'd like to understand the containerization strategy to ensure our deployment approach aligns with existing infrastructure.

2. **User Authentication Flow**: I'm trying to understand how user authentication works with the LiteLLM Proxy. Specifically, when we register our service with the configuration shown above (including `auth_type: "bearer_token"` and `extra_headers: ["X-ReviewBoard-URL"]`), does the authentication get configured automatically, or are there additional setup steps required on the LiteLLM side?

3. **Service Infrastructure**: Could you provide some context on where these services are hosted? I'm curious whether there are dedicated machines or clusters that the LiteLLM proxy routes requests to, which would help me better understand the network topology and any potential routing considerations.

Understanding these details will help ensure smooth integration with the existing infrastructure and proper configuration of our ReviewBoard MCP server.

---

## Support

For issues with:
- **Server deployment**: Check GitHub Actions logs and deployment docs
- **LiteLLM registration**: Contact LiteLLM admin or check LiteLLM docs
- **ReviewBoard API**: Verify credentials and API token permissions

---

## Automation Note

Currently, manual registration is required because GitHub Actions does not have access to the LiteLLM proxy API. In the future, if access is granted, this process can be automated in the CI/CD pipeline.

---

Last Updated: 2025-10-29
