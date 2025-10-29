# Quick Reference: MCP Server Deployment

## Understanding the Architecture

### What are the LiteLLM APIs?
The `/v1/mcp/server` APIs are **registry/management APIs** that:
- ✅ Register MCP servers in the proxy's database
- ✅ Store metadata (URL, auth type, access groups)
- ✅ Tell the proxy where to find your server
- ❌ **NOT** the actual MCP server implementation

### What is Your MCP Server?
Your code in this repository **IS** the actual server that:
- ✅ Implements MCP protocol (tools, resources, prompts)
- ✅ Integrates with ReviewBoard API
- ✅ Executes business logic for each tool
- ✅ Returns results to clients

### How They Connect
```
┌─────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User   │────▶│ LiteLLM Proxy│────▶│  Your MCP    │────▶│ ReviewBoard  │
│ (Claude)│     │  (Registry)  │     │    Server    │     │     API      │
└─────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                      ▲                      ▲
                      │                      │
                Looks up URL          Executes tools
                from registry         and returns data
```

## Two Modes

### Mode 1: stdio (Current - Working ✅)
```bash
# Local development / VS Code
npm start
```
- **Use for**: Local development, testing
- **Runs**: As local process per client
- **Auth**: Environment variables
- **Config**: `.vscode/mcp.json` (local)

### Mode 2: HTTP Streaming (Target - Needs SDK Fixes ⚠️)
```bash
# Production web service
npm run start:http
```
- **Use for**: Team deployment, production
- **Runs**: As shared web service
- **Auth**: HTTP headers per-request
- **Config**: LiteLLM proxy registry

## Files Created for HTTP Mode

```
reviewboard_mcp/
├── src/index-http.ts              # HTTP server (needs SDK API fixes)
├── Dockerfile                     # Container build
├── docker-compose.yml             # Simple deployment
├── k8s-deployment.yaml            # Kubernetes full stack
└── docs/
    ├── HTTP-MIGRATION-SUMMARY.md   # Complete overview
    ├── HTTP-STREAMING-MIGRATION.md # Architecture concepts
    ├── DEPLOYMENT.md               # Deploy guide
    └── TESTING-HTTP.md             # Testing guide
```

## Quick Commands

### Local Testing (stdio)
```bash
npm install
npm run build
npm start  # stdio mode
```

### HTTP Server (when fixed)
```bash
npm run start:http                    # Start HTTP server
curl http://localhost:3000/health     # Health check
```

### Docker Deployment
```bash
docker build -t reviewboard-mcp .
docker run -p 3000:3000 reviewboard-mcp
```

### Docker Compose
```bash
docker-compose up -d
docker-compose logs -f
```

### Kubernetes
```bash
kubectl apply -f k8s-deployment.yaml
kubectl get pods -n mcp-servers
kubectl logs -f deployment/reviewboard-mcp-server -n mcp-servers
```

## Registration with LiteLLM

Once deployed, register your server:

```bash
curl -X POST \
  https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server \
  -H 'x-litellm-api-key: YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "server_name": "reviewboard_netapp",
    "url": "https://mcp-reviewboard.ai.eng.netapp.com/mcp/",
    "transport": "http",
    "auth_type": "authorization",
    "mcp_info": {
      "token_prefix": "Bearer",
      "source": "ReviewBoard"
    }
  }'
```

## Testing

### Test Direct (HTTP)
```bash
# Health
curl https://mcp-reviewboard.ai.eng.netapp.com/health

# SSE connection
curl -X GET https://mcp-reviewboard.ai.eng.netapp.com/mcp/sse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-ReviewBoard-URL: https://reviewboard.netapp.com" \
  -N
```

### Test via Proxy
```bash
# List all servers
curl https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server \
  -H 'x-litellm-api-key: YOUR_KEY'

# List tools
curl 'https://llm-proxy-api.ai.eng.netapp.com/mcp-rest/tools/list' \
  -H 'x-litellm-api-key: YOUR_KEY'
```

## Current Status

| Component | Status |
|-----------|--------|
| stdio implementation | ✅ Working |
| Documentation | ✅ Complete |
| Docker configuration | ✅ Ready |
| Kubernetes manifests | ✅ Ready |
| Dependencies added | ✅ Installed |
| HTTP implementation | ⚠️ Needs SDK API fixes |

## Next Steps

1. **Fix `src/index-http.ts`** - Correct MCP SDK API calls for SSE transport
2. **Test locally** - `npm run start:http` and verify tools work
3. **Deploy** - Choose Docker, Compose, or Kubernetes
4. **Register** - Use the curl command above
5. **Verify** - Test tools via LiteLLM proxy

## Key Files to Read

1. **`HTTP-CONVERSION-STATUS.md`** - Complete status and next steps
2. **`docs/HTTP-MIGRATION-SUMMARY.md`** - Full architecture explanation
3. **`docs/DEPLOYMENT.md`** - Step-by-step deployment guide

## Questions?

- **"Can I use it now?"** - Yes, stdio mode works locally
- **"When HTTP mode?"** - After fixing SDK API issues in `index-http.ts`
- **"How do I deploy?"** - Docker/Kubernetes configs are ready
- **"How do I register?"** - Use the curl command after deployment
- **"Like Jira OSS?"** - Exactly the same pattern!

---

**Bottom Line**: Everything is prepared except fixing the MCP SDK API usage in the HTTP implementation. Once that's done, you can deploy and register just like Jira OSS.
