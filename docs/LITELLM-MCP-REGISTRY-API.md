# LiteLLM MCP Server Registry API Reference

## Overview

This document provides detailed information about the LiteLLM Proxy's MCP Server Registry APIs based on the actual OpenAPI specification (v1.79.0).

**Important**: These APIs are for **registering and managing MCP servers** in the LiteLLM proxy's database. They are NOT the actual MCP protocol implementation (which your ReviewBoard server implements).

## Base URL

```
https://llm-proxy-api.ai.eng.netapp.com
```

## Authentication

All requests require API key authentication via header:

```
x-litellm-api-key: YOUR_API_KEY
```

## API Endpoints

### 1. Register New MCP Server

**Endpoint**: `POST /v1/mcp/server`

**Purpose**: Register a new MCP server in the LiteLLM proxy registry.

**Request Headers**:
```
Content-Type: application/json
x-litellm-api-key: YOUR_API_KEY
litellm-changed-by: username (optional, for audit trail)
```

**Request Body** (`NewMCPServerRequest`):
```json
{
  "server_id": "optional-custom-id",
  "server_name": "reviewboard_netapp",
  "alias": "reviewboard",
  "description": "NetApp ReviewBoard MCP server - Natural language interface for code reviews",
  "transport": "sse",
  "auth_type": "bearer_token",
  "url": "https://mcp-reviewboard.ai.eng.netapp.com/mcp/",
  "mcp_info": {
    "logo_url": "app/static/icons/ReviewBoard.png",
    "token_prefix": "Bearer",
    "requires_username": false,
    "source": "ReviewBoard",
    "server_name": "reviewboard_netapp",
    "description": "Natural language interface for ReviewBoard code reviews"
  },
  "mcp_access_groups": ["reviewboard", "engineering"],
  "allowed_tools": [],
  "extra_headers": ["X-ReviewBoard-URL"],
  "command": null,
  "args": [],
  "env": {}
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `server_id` | string | No | Custom ID (auto-generated if omitted) |
| `server_name` | string | No | Unique name for the server |
| `alias` | string | No | Short alias for easier reference |
| `description` | string | No | Human-readable description |
| `transport` | enum | Yes | Transport type: `"sse"`, `"http"`, or `"stdio"` |
| `auth_type` | enum | No | Auth type: `"none"`, `"api_key"`, `"bearer_token"`, `"basic"`, `"authorization"`, `"oauth2"` |
| `url` | string | No | Server URL (required for `sse`/`http` transport) |
| `mcp_info` | object | No | Additional metadata (logo, token prefix, etc.) |
| `mcp_access_groups` | array | Yes | Access control groups (default: empty array) |
| `allowed_tools` | array | No | Whitelist of allowed tool names (empty = all allowed) |
| `extra_headers` | array | No | Additional headers required by server |
| `command` | string | No | Command to start server (for `stdio` transport) |
| `args` | array | Yes | Command arguments (default: empty array) |
| `env` | object | Yes | Environment variables (default: empty object) |

**Transport Types**:
- `"sse"` - Server-Sent Events (HTTP streaming) - **Use this for web services**
- `"http"` - Standard HTTP requests
- `"stdio"` - Standard input/output (for local processes)

**Auth Types**:
- `"bearer_token"` - Use `Authorization: Bearer <token>` header - **Recommended for ReviewBoard**
- `"api_key"` - Use `X-API-Key: <key>` header
- `"basic"` - Use `Authorization: Basic <base64>` header
- `"authorization"` - Generic Authorization header
- `"oauth2"` - OAuth2 flow
- `"none"` - No authentication required

**Response** (`LiteLLM_MCPServerTable`):
```json
{
  "server_id": "550e8400-e29b-41d4-a716-446655440000",
  "server_name": "reviewboard_netapp",
  "alias": "reviewboard",
  "description": "NetApp ReviewBoard MCP server...",
  "url": "https://mcp-reviewboard.ai.eng.netapp.com/mcp/",
  "transport": "sse",
  "auth_type": "bearer_token",
  "created_at": "2025-10-28T12:34:56.789Z",
  "created_by": "admin",
  "updated_at": "2025-10-28T12:34:56.789Z",
  "updated_by": "admin",
  "teams": [],
  "mcp_access_groups": ["reviewboard"],
  "allowed_tools": [],
  "extra_headers": ["X-ReviewBoard-URL"],
  "mcp_info": { ... },
  "status": "unknown",
  "last_health_check": null,
  "health_check_error": null,
  "command": null,
  "args": [],
  "env": {}
}
```

**Status Codes**:
- `201` - Created successfully
- `422` - Validation error (check request body)
- `401` - Authentication failed
- `403` - Permission denied

**Example**:
```bash
curl -X POST 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server' \
  -H 'Content-Type: application/json' \
  -H 'x-litellm-api-key: YOUR_API_KEY' \
  -d '{
    "server_name": "reviewboard_netapp",
    "alias": "reviewboard",
    "description": "ReviewBoard MCP server",
    "transport": "sse",
    "auth_type": "bearer_token",
    "url": "https://mcp-reviewboard.ai.eng.netapp.com/mcp/",
    "mcp_access_groups": ["reviewboard"],
    "extra_headers": ["X-ReviewBoard-URL"]
  }'
```

---

### 2. List All MCP Servers

**Endpoint**: `GET /v1/mcp/server`

**Purpose**: Retrieve list of all registered MCP servers with associated teams.

**Request Headers**:
```
x-litellm-api-key: YOUR_API_KEY
```

**Response**: Array of `LiteLLM_MCPServerTable` objects

**Example**:
```bash
curl -X GET 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server' \
  -H 'x-litellm-api-key: YOUR_API_KEY'
```

**Example Response**:
```json
[
  {
    "server_id": "550e8400-e29b-41d4-a716-446655440000",
    "server_name": "reviewboard_netapp",
    "alias": "reviewboard",
    "url": "https://mcp-reviewboard.ai.eng.netapp.com/mcp/",
    "transport": "sse",
    "auth_type": "bearer_token",
    "status": "healthy",
    "last_health_check": "2025-10-28T13:45:00.000Z",
    "health_check_error": null,
    ...
  },
  {
    "server_id": "660e8400-e29b-41d4-a716-446655440001",
    "server_name": "jira_oss",
    "alias": "jira",
    "url": "https://mcp-jira-oss.ai.eng.netapp.com/mcp/",
    "transport": "sse",
    "status": "healthy",
    ...
  }
]
```

---

### 3. Update MCP Server

**Endpoint**: `PUT /v1/mcp/server`

**Purpose**: Update configuration of an existing MCP server.

**Request Headers**:
```
Content-Type: application/json
x-litellm-api-key: YOUR_API_KEY
litellm-changed-by: username (optional)
```

**Request Body** (`UpdateMCPServerRequest`):
```json
{
  "server_id": "550e8400-e29b-41d4-a716-446655440000",
  "server_name": "reviewboard_netapp",
  "alias": "reviewboard",
  "description": "Updated description",
  "url": "https://new-mcp-reviewboard.ai.eng.netapp.com/mcp/",
  "transport": "sse",
  "auth_type": "bearer_token",
  "mcp_info": { ... },
  "mcp_access_groups": ["reviewboard", "engineering"],
  "command": null,
  "args": [],
  "env": {}
}
```

**Note**: `server_id` is **required** to identify which server to update.

**Response** (`LiteLLM_MCPServerTable`): Updated server object

**Status Codes**:
- `202` - Accepted and updated
- `404` - Server not found
- `422` - Validation error
- `401` - Authentication failed

**Example**:
```bash
curl -X PUT 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server' \
  -H 'Content-Type: application/json' \
  -H 'x-litellm-api-key: YOUR_API_KEY' \
  -d '{
    "server_id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://new-url.com/mcp/",
    "description": "Updated after redeployment"
  }'
```

---

### 4. Health Check All MCP Servers

**Endpoint**: `GET /v1/mcp/server/health`

**Purpose**: Perform health checks on all accessible MCP servers.

**Request Headers**:
```
x-litellm-api-key: YOUR_API_KEY
```

**Response**: Health status for all servers

**Example**:
```bash
curl -X GET 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server/health' \
  -H 'x-litellm-api-key: YOUR_API_KEY'
```

**Example Response**:
```json
{
  "servers": [
    {
      "server_id": "550e8400-e29b-41d4-a716-446655440000",
      "server_name": "reviewboard_netapp",
      "status": "healthy",
      "last_check": "2025-10-28T13:45:00.000Z",
      "response_time_ms": 234
    },
    {
      "server_id": "660e8400-e29b-41d4-a716-446655440001",
      "server_name": "jira_oss",
      "status": "unhealthy",
      "last_check": "2025-10-28T13:45:00.000Z",
      "error": "Connection timeout"
    }
  ]
}
```

---

### 5. List Tools from MCP Servers

**Endpoint**: `GET /mcp-rest/tools/list`

**Purpose**: List all available tools with information about the server they belong to.

**Request Headers**:
```
x-litellm-api-key: YOUR_API_KEY
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `server_id` | string | No | Filter tools for specific server ID |

**Response**:
```json
{
  "tools": [
    {
      "name": "get_review_request",
      "description": "Get details of a specific review request by ID",
      "inputSchema": {
        "type": "object",
        "properties": {
          "reviewRequestId": {
            "type": "number",
            "description": "The ID of the review request"
          }
        },
        "required": ["reviewRequestId"]
      },
      "mcp_info": {
        "server_name": "reviewboard_netapp",
        "logo_url": "app/static/icons/ReviewBoard.png"
      }
    },
    {
      "name": "search",
      "description": "Search for review requests using various filters",
      "inputSchema": { ... },
      "mcp_info": {
        "server_name": "reviewboard_netapp",
        "logo_url": "app/static/icons/ReviewBoard.png"
      }
    }
  ],
  "error": null,
  "message": "Successfully retrieved tools"
}
```

**Example**:
```bash
# List all tools from all servers
curl -X GET 'https://llm-proxy-api.ai.eng.netapp.com/mcp-rest/tools/list' \
  -H 'x-litellm-api-key: YOUR_API_KEY'

# List tools from specific server
curl -X GET 'https://llm-proxy-api.ai.eng.netapp.com/mcp-rest/tools/list?server_id=550e8400-e29b-41d4-a716-446655440000' \
  -H 'x-litellm-api-key: YOUR_API_KEY'
```

---

## MCP Server Status Values

The `status` field in `LiteLLM_MCPServerTable` has three possible values:

| Status | Description |
|--------|-------------|
| `"healthy"` | Server is accessible and responding correctly |
| `"unhealthy"` | Server is not accessible or returning errors |
| `"unknown"` | Health status has not been checked yet (default for new servers) |

---

## Best Practices

### 1. Registration

✅ **DO**:
- Use `"sse"` transport for web services
- Use `"bearer_token"` auth_type for API token authentication
- Provide `alias` for easier reference
- Add descriptive `mcp_info` with logo_url
- Specify `mcp_access_groups` for access control
- Include `extra_headers` if your server needs additional headers (e.g., `X-ReviewBoard-URL`)

❌ **DON'T**:
- Mix stdio transport with HTTP URL
- Leave `mcp_access_groups` empty without considering security
- Use generic descriptions

### 2. Updates

✅ **DO**:
- Update URL after redeployment
- Use `litellm-changed-by` header for audit trail
- Test health check after update

❌ **DON'T**:
- Change transport type without redeploying server
- Modify `server_id` (it's the identifier)

### 3. Health Checks

✅ **DO**:
- Monitor health status regularly
- Investigate `health_check_error` when status is unhealthy
- Ensure your server implements `/health` endpoint

❌ **DON'T**:
- Ignore unhealthy status
- Assume health checks happen automatically (you may need to enable background checks)

### 4. Tool Listing

✅ **DO**:
- Use tool listing to verify all tools registered correctly
- Check `mcp_info` appears correctly in tool responses

❌ **DON'T**:
- Assume tools are available without verification

---

## Comparison: Registry API vs Your MCP Server

| Aspect | LiteLLM Registry API | Your ReviewBoard MCP Server |
|--------|---------------------|----------------------------|
| **Purpose** | Register/manage server metadata | Implement actual MCP protocol and tools |
| **Endpoints** | `/v1/mcp/server`, `/mcp-rest/tools/list` | `/health`, `/mcp/sse`, `/mcp/message` |
| **What it stores** | Server location, auth config, metadata | Nothing - stateless per request |
| **What it does** | CRUD operations on server registry | Execute tools, interact with ReviewBoard API |
| **Deployment** | Already deployed (LiteLLM proxy) | You need to deploy |

**Key Insight**:
- The Registry API is the **phone book** - it stores "where to find the ReviewBoard server"
- Your MCP server is the **actual implementation** - it does the work when called

---

## Complete Registration Example

```bash
#!/bin/bash

# Step 1: Register the server
SERVER_RESPONSE=$(curl -s -X POST 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server' \
  -H 'Content-Type: application/json' \
  -H 'x-litellm-api-key: YOUR_API_KEY' \
  -H 'litellm-changed-by: admin' \
  -d '{
    "server_name": "reviewboard_netapp",
    "alias": "reviewboard",
    "description": "NetApp ReviewBoard MCP server - Natural language interface for code reviews",
    "transport": "sse",
    "auth_type": "bearer_token",
    "url": "https://mcp-reviewboard.ai.eng.netapp.com/mcp/",
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
  }')

echo "Registration Response:"
echo $SERVER_RESPONSE | jq .

# Extract server_id
SERVER_ID=$(echo $SERVER_RESPONSE | jq -r '.server_id')
echo "Server ID: $SERVER_ID"

# Step 2: Verify health check
echo "\nPerforming health check..."
curl -X GET 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server/health' \
  -H 'x-litellm-api-key: YOUR_API_KEY' | jq .

# Step 3: List tools
echo "\nListing tools..."
curl -X GET "https://llm-proxy-api.ai.eng.netapp.com/mcp-rest/tools/list?server_id=$SERVER_ID" \
  -H 'x-litellm-api-key: YOUR_API_KEY' | jq '.tools[] | {name: .name, description: .description}'

echo "\nRegistration complete! Server ID: $SERVER_ID"
```

---

## Troubleshooting

### Registration Failed (422 Validation Error)

**Possible causes**:
- Missing required fields (`transport`)
- Invalid enum values (check `transport` or `auth_type`)
- Malformed JSON

**Solution**: Validate request body against schema above.

### Server Shows "unhealthy" Status

**Possible causes**:
- Server not accessible at specified URL
- `/health` endpoint not implemented
- Network/firewall issues
- Server crashed or not running

**Solution**:
1. Check server logs
2. Verify `/health` endpoint manually: `curl https://your-server/health`
3. Check network connectivity

### Tools Not Appearing

**Possible causes**:
- Server not fully started
- MCP protocol handshake failed
- Tools not properly registered in server code

**Solution**:
1. Check server logs for errors
2. Test SSE connection directly
3. Verify tool registration code in `src/index-http.ts`

---

## References

- [LiteLLM OpenAPI Spec](openapi.json) - Full API specification
- [MCP Protocol Documentation](https://modelcontextprotocol.io/) - Official MCP docs
- [LiteLLM Proxy Docs](https://docs.litellm.ai/docs/proxy/) - LiteLLM documentation
