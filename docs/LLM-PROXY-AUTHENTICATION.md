# LLM Proxy Authentication Guide

## Overview

This guide explains how to authenticate and use the ReviewBoard MCP server through the LLM proxy infrastructure at NetApp. The LLM proxy provides a centralized gateway for accessing MCP servers with standardized authentication and access control.

## Authentication Architecture

### Two Connection Modes

The ReviewBoard MCP server supports two distinct connection modes:

1. **Direct Connection** (Local Development)
   - Connect directly to the MCP server
   - Use environment variables or VS Code prompts for credentials
   - Best for local development and testing

2. **LLM Proxy Connection** (Production)
   - Connect through the LLM proxy at `https://llm-proxy-api.ai.eng.netapp.com`
   - Standardized authentication with `x-litellm-api-key`
   - Service-specific auth via custom headers
   - Best for production use and team collaboration

---

## Direct Connection (Local Development)

### How It Works

```
User → MCP Client → ReviewBoard MCP Server → ReviewBoard API
```

### Authentication Headers

When connecting directly to the ReviewBoard MCP server:

```http
Authorization: Bearer YOUR_REVIEWBOARD_API_TOKEN
X-ReviewBoard-URL: https://reviewboard.netapp.com
```

### VS Code Configuration (.vscode/mcp.json)

```json
{
  "servers": {
    "reviewboard": {
      "command": "node",
      "args": ["/absolute/path/to/reviewboard_mcp/build/index.js"],
      "env": {
        "REVIEWBOARD_BASE_URL": "${input:reviewboard_base_url}",
        "REVIEWBOARD_API_TOKEN": "${input:reviewboard_api_token}"
      }
    }
  },
  "inputs": [
    {
      "id": "reviewboard_base_url",
      "type": "promptString",
      "description": "ReviewBoard Base URL (e.g., https://reviewboard.netapp.com)"
    },
    {
      "id": "reviewboard_api_token",
      "type": "promptString",
      "description": "ReviewBoard API Token",
      "password": true
    }
  ]
}
```

**Note**: VS Code securely prompts for credentials when the server starts, with API token input masked.

---

## LLM Proxy Connection (Production)

### How It Works

```
User → MCP Client → LLM Proxy → ReviewBoard MCP Server → ReviewBoard API
         ↓              ↓              ↓
   Provides       Validates      Extracts service
   credentials    proxy auth     credentials
```

### Authentication Flow

1. **User Authentication with LLM Proxy**
   - User sends `x-litellm-api-key: Bearer user=${username}&key=${llm_key}`
   - LLM proxy validates user credentials and access groups
   - User must be in `reviewboard` or `engineering` access group

2. **Service Authentication**
   - User also sends `x-mcp-reviewboard-authorization: Bearer ${reviewboard_api_token}`
   - LLM proxy forwards this to the ReviewBoard MCP server as `Authorization` header
   - User must also send `x-reviewboard-url: https://reviewboard.netapp.com`

3. **Server Processing**
   - ReviewBoard MCP server receives `Authorization: Bearer ${reviewboard_api_token}`
   - Server receives `X-ReviewBoard-URL: https://reviewboard.netapp.com`
   - Server creates ReviewBoard client with these credentials
   - All tool calls use the user's ReviewBoard credentials

### Authentication Headers (via LLM Proxy)

When connecting through the LLM proxy:

```http
# LLM Proxy Authentication
x-litellm-api-key: Bearer user=${username}&key=${llm_key}

# ReviewBoard Service Authentication
x-mcp-reviewboard-authorization: Bearer ${reviewboard_api_token}
x-reviewboard-url: https://reviewboard.netapp.com
```

### Header Transformation

The LLM proxy transforms headers before forwarding to the MCP server:

**Client sends to LLM Proxy:**
```http
x-litellm-api-key: Bearer user=johndoe&key=sk-1234...
x-mcp-reviewboard-authorization: Bearer rbp_abc123xyz...
x-reviewboard-url: https://reviewboard.netapp.com
```

**LLM Proxy forwards to MCP Server:**
```http
Authorization: Bearer rbp_abc123xyz...
X-ReviewBoard-URL: https://reviewboard.netapp.com
```

### VS Code Configuration (.vscode/mcp.json) - via LLM Proxy

```json
{
  "mcpServers": {
    "reviewboard": {
      "url": "https://llm-proxy-api.ai.eng.netapp.com/mcp/reviewboard_netapp",
      "transport": "sse",
      "headers": {
        "x-litellm-api-key": "${input:llm_api_key}",
        "x-mcp-reviewboard-authorization": "Bearer ${input:reviewboard_api_token}",
        "x-reviewboard-url": "${input:reviewboard_base_url}"
      }
    }
  },
  "inputs": [
    {
      "id": "llm_api_key",
      "type": "promptString",
      "description": "LLM Proxy API Key (format: Bearer user=username&key=sk-...)",
      "password": true
    },
    {
      "id": "reviewboard_api_token",
      "type": "promptString",
      "description": "ReviewBoard API Token (e.g., rbp_...)",
      "password": true
    },
    {
      "id": "reviewboard_base_url",
      "type": "promptString",
      "description": "ReviewBoard Base URL (e.g., https://reviewboard.netapp.com)"
    }
  ]
}
```

---

## Obtaining Credentials

### LLM Proxy API Key

1. Go to your LLM proxy portal
2. Navigate to API Keys section
3. Generate a new key with MCP access
4. You'll need:
   - **Username**: Your corporate username (e.g., `john.doe`)
   - **API Key**: Generated key (e.g., `sk-1234567890abcdef...`)

**Important**: Keep your LLM API key secure. It provides access to all MCP servers you're authorized for.

**Note**: In VS Code config, you provide username and key separately as `${input:username}` and `${input:llm_key}`. They are automatically combined into: `Bearer user=${username}&key=${llm_key}`

### ReviewBoard API Token

1. Log into ReviewBoard at https://reviewboard.netapp.com
2. Navigate to **My Account** → **API Tokens**
3. Click **Generate a new API token**
4. Give it a descriptive name (e.g., "MCP Server Access")
5. Set appropriate permissions (at minimum: read access)
6. Copy the token (starts with `rbp_...`)

**Important**: API tokens provide full access to ReviewBoard with your permissions. Never share them or commit them to code.

---

## Access Control

### LLM Proxy Access Groups

The ReviewBoard MCP server is configured with these access groups:
- `reviewboard` - Primary access group for ReviewBoard users
- `engineering` - Secondary access group for engineering team

**To get access:**
1. Contact your LLM proxy administrator
2. Request access to the `reviewboard` or `engineering` group
3. Wait for approval
4. Verify access by listing available MCP servers

### ReviewBoard Permissions

Your ReviewBoard API token inherits your ReviewBoard user permissions:
- **Read access** - View review requests, diffs, comments
- **Write access** - Create comments, update reviews (if server supports it)
- **Admin access** - Administrative operations (if needed)

Ensure your ReviewBoard account has appropriate permissions for the repositories you need to access.

---

## Security Best Practices

### Credential Management

1. **Never commit credentials** to version control
   - Use `.env` files locally (add to `.gitignore`)
   - Use VS Code secure prompts (credentials not stored in config)
   - Use secrets management in CI/CD

2. **Rotate credentials regularly**
   - Change API tokens every 90 days
   - Regenerate immediately if compromised

3. **Use minimal permissions**
   - ReviewBoard tokens: Grant only necessary permissions
   - LLM proxy keys: Request only needed access groups

### Network Security

1. **Always use HTTPS** - All connections must be encrypted
2. **No credentials in URLs** - Use headers, never query parameters
3. **Verify TLS certificates** - Ensure proper certificate validation

### Monitoring

1. **Monitor API usage** - Check for unusual patterns
2. **Review access logs** - Audit who accessed what and when
3. **Alert on failures** - Set up alerts for authentication failures

---

## Troubleshooting

### "Authentication failed" errors

**Problem**: 401 Unauthorized

**Solutions**:
1. Verify LLM API key format: `Bearer user=${username}&key=sk-...`
2. Check you're in the correct access group (`reviewboard` or `engineering`)
3. Verify your LLM API key is still valid (not expired/revoked)
4. Test LLM proxy access: `curl -H "x-litellm-api-key: YOUR_KEY" https://llm-proxy-api.ai.eng.netapp.com/v1/models`

### "ReviewBoard authentication failed" errors

**Problem**: Can't access ReviewBoard API

**Solutions**:
1. Verify ReviewBoard API token is correct
2. Test direct access: `curl -H "Authorization: token YOUR_TOKEN" https://reviewboard.netapp.com/api/`
3. Check token hasn't been revoked in ReviewBoard settings
4. Verify ReviewBoard URL is correct (no trailing slash in base URL)

### "Access denied to ReviewBoard server" errors

**Problem**: 403 Forbidden from LiteLLM proxy

**Solutions**:
1. Verify you're in the `reviewboard` or `engineering` access group
2. Contact your LLM proxy administrator to grant access
3. Check if the server is enabled in the LiteLLM registry
4. Verify MCP server registration is active and healthy

### "Server not found" errors

**Problem**: Can't find ReviewBoard MCP server

**Solutions**:
1. Verify server URL: `https://llm-proxy-api.ai.eng.netapp.com/mcp/reviewboard_netapp`
2. Check server is registered: `curl -H "x-litellm-api-key: YOUR_KEY" https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server`
3. Verify server health status shows "healthy"
4. Contact administrator if server is not listed

### Connection timeout errors

**Problem**: Requests time out

**Solutions**:
1. Check network connectivity to LLM proxy
2. Verify ReviewBoard is accessible from the MCP server's network
3. Check for firewall rules blocking connections
4. Verify MCP server is running and healthy: `curl https://mcp-reviewboard.ai.eng.netapp.com/health`

---

## Testing Your Setup

### Test Direct Connection

```bash
# 1. Test ReviewBoard API access
curl -H "Authorization: token YOUR_REVIEWBOARD_TOKEN" \
  https://reviewboard.netapp.com/api/

# 2. Test MCP server health
curl -H "Authorization: Bearer YOUR_REVIEWBOARD_TOKEN" \
  -H "X-ReviewBoard-URL: https://reviewboard.netapp.com" \
  https://mcp-reviewboard.ai.eng.netapp.com/health

# 3. Test MCP tool listing
curl -X POST https://mcp-reviewboard.ai.eng.netapp.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_REVIEWBOARD_TOKEN" \
  -H "X-ReviewBoard-URL: https://reviewboard.netapp.com" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### Test LLM Proxy Connection

```bash
# 1. Test LLM proxy access
curl -H "x-litellm-api-key: Bearer user=USERNAME&key=YOUR_LLM_KEY" \
  https://llm-proxy-api.ai.eng.netapp.com/v1/models

# 2. List MCP servers
curl -H "x-litellm-api-key: Bearer user=USERNAME&key=YOUR_LLM_KEY" \
  https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server

# 3. Test ReviewBoard MCP via proxy
# (This requires proper header forwarding setup in LiteLLM)
curl -X POST https://llm-proxy-api.ai.eng.netapp.com/mcp/reviewboard_netapp \
  -H "Content-Type: application/json" \
  -H "x-litellm-api-key: Bearer user=USERNAME&key=YOUR_LLM_KEY" \
  -H "x-mcp-reviewboard-authorization: Bearer YOUR_REVIEWBOARD_TOKEN" \
  -H "x-reviewboard-url: https://reviewboard.netapp.com" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

---

## Migration Guide

### From Direct Connection to LLM Proxy

If you're currently using direct connection and want to migrate to LLM proxy:

1. **Obtain LLM API Key**
   - Request access to LLM proxy
   - Generate API key
   - Verify access to `reviewboard` group

2. **Update VS Code Configuration**
   - Change from `command`/`args` to `url`/`transport`
   - Add LLM proxy headers
   - Update inputs for LLM API key

3. **Test Connection**
   - Verify you can list MCP servers
   - Verify you can list ReviewBoard tools
   - Test a simple tool call (e.g., `get_review_request`)

4. **Update Documentation**
   - Update team wikis with new connection method
   - Share LLM proxy access instructions
   - Document troubleshooting steps

---

## Quick Reference

### Authentication Headers Comparison

| Connection Type | Headers Required |
|----------------|------------------|
| **Direct** | `Authorization: Bearer ${rb_token}`<br>`X-ReviewBoard-URL: ${rb_url}` |
| **LLM Proxy** | `x-litellm-api-key: Bearer user=${user}&key=${llm_key}`<br>`x-mcp-reviewboard-authorization: Bearer ${rb_token}`<br>`x-reviewboard-url: ${rb_url}` |

### Server URLs

| Mode | URL |
|------|-----|
| **Direct Server** | `https://mcp-reviewboard.ai.eng.netapp.com` |
| **LLM Proxy** | `https://llm-proxy-api.ai.eng.netapp.com/mcp/reviewboard_netapp` |

### Required Credentials

| Credential | Purpose | Format |
|------------|---------|--------|
| **LLM API Key** | Authenticate with LLM proxy | `Bearer user=${username}&key=sk-...` |
| **ReviewBoard Token** | Authenticate with ReviewBoard | `rbp_...` or `Bearer rbp_...` |
| **ReviewBoard URL** | Specify ReviewBoard instance | `https://reviewboard.netapp.com` |

---

## Support

For issues with:
- **LLM Proxy access**: Contact LLM proxy administrator
- **ReviewBoard credentials**: Check ReviewBoard settings or contact ReviewBoard admin
- **MCP Server issues**: Check server health and logs, contact MCP server maintainer
- **Configuration help**: See examples in this guide or VS Code documentation

---

Last Updated: 2025-10-29
