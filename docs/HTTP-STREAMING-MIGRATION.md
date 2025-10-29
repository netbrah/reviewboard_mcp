# Converting ReviewBoard MCP Server to HTTP Streaming

## Overview

This document explains how to convert the ReviewBoard MCP server from **stdio transport** to **HTTP streaming (SSE)** transport, similar to the Jira OSS implementation.

## Architecture

### Current Architecture (stdio)
```
VS Code Extension
    ↓ (stdio)
MCP Server Process (Node.js)
    ↓ (HTTP)
ReviewBoard API
```

### Target Architecture (HTTP Streaming)
```
LiteLLM Proxy
    ↓ (HTTP/SSE)
MCP Server Web Service (Node.js + Express)
    ↓ (HTTP)
ReviewBoard API
```

## Key Differences

| Aspect | stdio Transport | HTTP Streaming (SSE) Transport |
|--------|----------------|-------------------------------|
| **Protocol** | Standard I/O (stdin/stdout) | HTTP with Server-Sent Events |
| **Deployment** | Local process per client | Web service (one instance, many clients) |
| **Registration** | Local config (`mcp.json`) | Central registry (LiteLLM proxy) |
| **Authentication** | Environment variables | HTTP headers (Bearer token, etc.) |
| **Scaling** | One process per client | Shared service |

## Implementation Steps

### 1. Add HTTP Server Dependencies

```bash
npm install express @fastify/sse-plugin cors helmet
npm install --save-dev @types/express @types/cors
```

### 2. Create HTTP Transport Layer

The MCP SDK supports SSE transport out of the box. You need to:
- Replace `StdioServerTransport` with `SSEServerTransport`
- Add Express.js web server
- Handle HTTP endpoints for MCP protocol

### 3. Update Authentication

**Before (stdio):**
```typescript
// From environment variables
const apiToken = process.env.REVIEWBOARD_API_TOKEN;
```

**After (HTTP):**
```typescript
// From HTTP Authorization header
const authHeader = req.headers.authorization;
const token = authHeader?.replace('Bearer ', '');
```

### 4. Add Health Check Endpoint

Required for LiteLLM proxy integration:
```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});
```

### 5. Register with LiteLLM Proxy

Use the `/v1/mcp/server` API to register your server:
```bash
curl -X 'POST' \
  'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server' \
  -H 'accept: application/json' \
  -H 'x-litellm-api-key: your_key' \
  -H 'Content-Type: application/json' \
  -d '{
    "server_name": "reviewboard_netapp",
    "description": "NetApp ReviewBoard MCP server",
    "url": "https://mcp-reviewboard.ai.eng.netapp.com/mcp/",
    "transport": "http",
    "auth_type": "authorization",
    "mcp_info": {
      "logo_url": "app/static/icons/ReviewBoard.png",
      "token_prefix": "Bearer",
      "requires_username": false,
      "source": "ReviewBoard",
      "server_name": "reviewboard_netapp",
      "description": "NetApp ReviewBoard MCP server"
    },
    "mcp_access_groups": ["reviewboard"]
  }'
```

## Reference Implementation: Jira OSS

The Jira OSS server you mentioned likely:
1. Uses Express.js or similar web framework
2. Implements SSE endpoints for MCP protocol
3. Handles authentication via HTTP headers
4. Exposes `/health` endpoint for monitoring
5. Registered in LiteLLM proxy with `transport: "http"`

## Next Steps

See `HTTP-STREAMING-IMPLEMENTATION.md` for the complete code implementation.

## Testing

Once deployed, test with:
```bash
# Health check
curl https://mcp-reviewboard.ai.eng.netapp.com/health

# Test tool listing (via LiteLLM proxy)
curl 'https://llm-proxy-api.ai.eng.netapp.com/mcp-rest/tools/list?server_id=your_server_id' \
  -H 'x-litellm-api-key: your_key'
```

## Deployment Options

1. **Docker Container** (recommended)
2. **Kubernetes Pod**
3. **VM with systemd service**
4. **Cloud Run / Lambda** (serverless)

See `DEPLOYMENT.md` for detailed deployment guide.
