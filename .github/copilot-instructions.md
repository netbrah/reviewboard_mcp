# ReviewBoard MCP Server - AI Agent Instructions

## Project Overview
TypeScript-based MCP (Model Context Protocol) server providing natural language interface to ReviewBoard API. Supports **dual deployment modes**: stdio (local) and HTTP streaming (production). Currently on branch `convert-to-http` migrating from stdio-only to HTTP+SSE transport.

## Architecture: Two Parallel Implementations

### stdio Mode (`src/index.ts`) ✅ PRODUCTION
- Uses `@modelcontextprotocol/sdk` with `StdioServerTransport`
- Local process per client, reads stdin/writes stdout
- Config via environment variables or VS Code prompts
- Tool registration: `server.tool(name, description, schema, handler)`
- Entry: `npm start` → runs `node build/index.js`

### HTTP Mode (`src/index-http.ts`) ⚠️ IN DEVELOPMENT
- Uses Express + `SSEServerTransport` for web service deployment
- Multi-client via Server-Sent Events (SSE)
- Authentication via HTTP headers per-request
- Target: LiteLLM proxy integration (like jira_oss server)
- Entry: `npm run start:http` → runs `node build/index-http.js`

**Key Insight**: Both modes share `src/reviewboard-client.ts` - core API integration logic. Modes differ only in transport/auth layers.

## Core Components

### ReviewBoardClient (`src/reviewboard-client.ts`)
- Axios-based HTTP client wrapping ReviewBoard REST API v5.0.6+
- Handles 3 auth types: API token (Bearer), Basic auth, session cookies
- **17 public methods** map to MCP tools (e.g., `getReviewRequest()`, `getDiffRevisions()`, `analyzeCommentResolution()`)
- Returns typed interfaces: `ReviewRequest`, `Review`, `Diff`, etc.
- XML patch parsing via `xml2js` for unified diffs

### Tool Registration Pattern
All 17 tools follow identical structure:
```typescript
server.tool(
  "tool_name",
  "Description for AI",
  { param: z.type().describe("...") },  // Zod schema
  async (params) => {
    const client = ensureClient();  // Get initialized client
    const result = await client.method(params);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);
```

## Critical Developer Workflows

### Build & Test
```bash
npm run build          # TypeScript → build/ (stdio + HTTP)
npm test               # Runs all test suites via ./scripts/run-tests.sh
npm run test:revision  # Test specific feature (revision tracking)
```

**Test Pattern**: All tests use `.env.test` (copy from `.env.test.template`) for credentials. Test files source this automatically via scripts.

### Local Development (stdio)
1. Set `REVIEWBOARD_BASE_URL` and `REVIEWBOARD_API_TOKEN` in environment
2. `npm start` - server outputs to stderr, MCP protocol to stdout
3. VS Code connects via `.vscode/mcp.json` (uses `${input:...}` for secure prompts)

### HTTP Development (current focus)
1. `npm run dev:http` - build + run HTTP server on port 3000
2. Test: `curl http://localhost:3000/health`
3. SSE endpoint: `GET /mcp/sse` (needs `Authorization` + `X-ReviewBoard-URL` headers)

## Project-Specific Conventions

### Tool Naming & Organization
Tools organized by capability (see `docs/TOOLS.md` for full list):
- **Discovery**: `get_review_requests`, `search`
- **Diffs**: `get_full_diff_patch`, `get_diff_revisions`
- **Comments**: `get_comprehensive_comments_analysis`, `analyze_comment_resolution`
- **Revisions**: `compare_revisions`, `get_file_revision_history`

**Critical**: Tool names use snake_case (MCP convention), but TypeScript uses camelCase. Client methods map 1:1 to tools.

### Error Handling Pattern
Tools catch errors and return formatted error text (not throw):
```typescript
catch (error) {
  return {
    content: [{ type: "text", text: `Error: ${error.message}` }]
  };
}
```
Ensures graceful degradation - AI sees error as tool output.

### Natural Language Support
Tools designed for conversational queries (see `docs/NATURAL-LANGUAGE-QUESTIONS.md`):
- "Show me review 858846" → `get_review_request`
- "What changed between revisions 5 and 6?" → `compare_revisions` or `get_diff_revisions(includePatchDiffs: true)`
- "Were comments addressed?" → `analyze_comment_resolution`

## Integration Points

### External Dependencies
- **ReviewBoard API**: REST API at `${REVIEWBOARD_BASE_URL}/api/` (v5.0.6+)
  - Auth: `Authorization: token <api_token>` or Basic auth
  - Rate limiting: Handle 429 responses (not currently implemented)
- **MCP SDK**: `@modelcontextprotocol/sdk@^1.0.0` - protocol implementation
- **LiteLLM Proxy** (HTTP mode target): Registry API at `/v1/mcp/server` for server registration
  - See `docs/LITELLM-MCP-REGISTRY-API.md` for complete API reference from OpenAPI spec
  - Transport type: `"sse"` (not "http")
  - Auth type: `"bearer_token"` for ReviewBoard API tokens
  - Extra headers: `["X-ReviewBoard-URL"]` required for per-request ReviewBoard URL

### Deployment Targets (HTTP mode)
- Docker: `docker build -t reviewboard-mcp .` (see `Dockerfile`)
- Kubernetes: `kubectl apply -f k8s-deployment.yaml` (includes Ingress, HPA, PDB)
- Docker Compose: `docker-compose up -d` (simple single-node)

**Registration with LiteLLM**: After deployment, POST to `/v1/mcp/server` with server URL, transport type, auth type (see `docs/DEPLOYMENT.md` for curl example).

## Data Flows

### stdio Request Flow
```
VS Code → stdin → McpServer → server.tool() → ReviewBoardClient → axios → ReviewBoard API
                                    ↓
                            stdout ← JSON result
```

### HTTP Request Flow (target)
```
LiteLLM Proxy → SSE connection → Express(/mcp/sse) → McpServer → ReviewBoardClient
       ↓                                                              ↓
  User credentials                                            ReviewBoard API
  (HTTP headers)                                                     ↓
       ↓                                                      SSE stream ← JSON
  Tool execution
```

**Key Difference**: HTTP mode must extract credentials from request headers (per-session), not environment.

## Current Branch: convert-to-http

### What's Done
- ✅ HTTP infrastructure (Express, CORS, Helmet)
- ✅ Deployment configs (Docker, K8s, Compose)
- ✅ Documentation (5 new docs in `docs/`)
- ✅ Dependencies installed

### What's Needed
- ⚠️ `src/index-http.ts` MCP SDK API corrections
  - `SSEServerTransport` initialization needs review
  - Session management for per-client ReviewBoardClient instances
  - All 17 tools need copying from stdio version
- Test HTTP server locally before deployment
- Deploy and register with LiteLLM proxy

### Key Files for HTTP Work
- `src/index-http.ts` - HTTP server implementation (incomplete)
- `docs/HTTP-MIGRATION-SUMMARY.md` - Architecture comparison
- `HTTP-CONVERSION-STATUS.md` - Current status and next steps
- Reference `jira_oss` implementation patterns (similar architecture)

## Documentation Structure
- `README.md` - User-facing overview (dual-mode operation)
- `docs/TOOLS.md` - All 17 tools with schemas and examples
- `docs/ENHANCEMENTS.md` - Revision tracking feature details
- `docs/DEPLOYMENT.md` - Production deployment guide
- `docs/LITELLM-MCP-REGISTRY-API.md` - Complete LiteLLM Registry API reference from OpenAPI spec
- `HTTP-CONVERSION-STATUS.md` - Migration status (AI reference)
- `test/README.md` - Test suite organization

## Common Tasks

**Add new tool**:
1. Add method to `ReviewBoardClient`
2. Register tool in both `index.ts` and `index-http.ts`
3. Add test in `test/test-*.js`
4. Update `docs/TOOLS.md`

**Fix HTTP implementation**:
1. Check MCP SDK docs for `SSEServerTransport` examples
2. Review stdio version tool registration pattern
3. Ensure per-request credential extraction works
4. Test with `curl` against `/mcp/sse` endpoint

**Debug ReviewBoard API issues**:
1. Check `examples/debug-*.js` scripts for API exploration
2. Use `examples/explore-reviewboard-api.js` to test endpoints
3. Enable axios debug: `axios.interceptors.request.use(config => console.log(config))`
