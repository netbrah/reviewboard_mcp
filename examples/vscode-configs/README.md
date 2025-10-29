# VS Code MCP Configuration Examples

This directory contains example VS Code MCP configurations for connecting to the ReviewBoard MCP server in different modes.

## Files

- `mcp-direct.json` - Direct connection to MCP server via stdio (local development)
- `mcp-proxy.json` - Connection via LLM proxy (production)
- `mcp-docker-local.json` - Connection to local Docker container (airlock testing)

## Usage

1. Choose the appropriate configuration file for your use case
2. Copy the relevant section to your `.vscode/mcp.json`
3. VS Code will securely prompt for credentials when the server starts
4. Credentials are never stored in the configuration file

## Configuration Locations

VS Code looks for MCP configuration in:
- Workspace: `.vscode/mcp.json` (project-specific)
- User: `~/.vscode/mcp.json` (global)

## Use Cases

### mcp-direct.json - Local Development
Use when developing locally with Node.js installed:
- ✅ No Docker needed
- ✅ Fastest iteration (direct process)
- ✅ Easy debugging with VS Code
- ❌ Requires Node.js 20+ and build step
- ❌ Different from production deployment

### mcp-docker-local.json - Airlock Testing
Use when testing in airlock environment with Docker:
- ✅ Tests actual Docker deployment
- ✅ Same as production (HTTP/SSE transport)
- ✅ No Node.js installation needed
- ✅ Easy to share with team
- ❌ Requires Docker running locally

### mcp-proxy.json - Production Use
Use when accessing via LLM proxy in production:
- ✅ Centralized authentication
- ✅ Access control via LiteLLM
- ✅ Production-ready
- ✅ Team collaboration
- ❌ Requires LLM proxy access
- ❌ Additional credential (LLM API key)

## Security Notes

- ✅ Use `"password": true` for sensitive inputs (API tokens, keys)
- ✅ Credentials are prompted at runtime, not stored
- ✅ Add `.vscode/mcp.json` to `.gitignore` if you customize it
- ❌ Never commit actual credentials to version control
- ❌ Never use hardcoded values for secrets

## Switching Between Modes

You can have multiple server configurations and switch between them:

```json
{
  "mcpServers": {
    "reviewboard-direct": { ... },
    "reviewboard-proxy": { ... },
    "reviewboard-docker": { ... }
  }
}
```

VS Code allows you to enable/disable individual servers without removing their configuration.

## Quick Start

### For Local Development:
```bash
npm install && npm run build
# Use mcp-direct.json config
```

### For Airlock Testing:
```bash
docker build -t reviewboard-mcp:test .
docker run -d --name reviewboard-mcp-test -p 3000:3000 reviewboard-mcp:test
# Use mcp-docker-local.json config
```

### For Production Use:
```bash
# Server must be deployed and registered with LiteLLM
# Use mcp-proxy.json config
```

## See Also

- [LLM-PROXY-AUTHENTICATION.md](../LLM-PROXY-AUTHENTICATION.md) - Complete authentication guide
- [AIRLOCK-TESTING.md](../AIRLOCK-TESTING.md) - Airlock testing guide
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Deployment instructions
- [TESTING-HTTP.md](../TESTING-HTTP.md) - HTTP testing guide
