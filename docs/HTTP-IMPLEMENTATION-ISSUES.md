# CRITICAL: HTTP Implementation Issues Found

## Status: 🚨 REQUIRES IMMEDIATE FIX

After reviewing the official MCP SDK documentation (node_modules/@modelcontextprotocol/sdk/README.md), our HTTP implementation has **critical issues** that must be fixed before deployment.

---

## Key Issues Identified

### 1. ❌ WRONG TRANSPORT CLASS

**Our Implementation:**
```typescript
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
```

**Correct (per SDK docs):**
```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
```

**Impact:** We're using the **deprecated SSE transport** instead of the modern **Streamable HTTP transport**.

---

### 2. ❌ WRONG ENDPOINT PATTERN

**Our Implementation:**
```typescript
app.get("/mcp/sse", async (req, res) => {
  const transport = new SSEServerTransport("/mcp/message", res);
  // ...
});
```

**Correct (per SDK docs):**
```typescript
app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });
  // ...
  await transport.handleRequest(req, res, req.body);
});
```

**Impact:** 
- Wrong HTTP method (GET vs POST)
- Wrong endpoint path (/mcp/sse vs /mcp)
- Wrong transport initialization
- Missing proper request handling

---

### 3. ❌ WRONG TRANSPORT INITIALIZATION

**Our Implementation:**
```typescript
const transport = new SSEServerTransport("/mcp/message", res);
await mcpServer.connect(transport);
```

**Correct (per SDK docs):**
```typescript
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
  enableJsonResponse: true
});

res.on('close', () => {
  transport.close();
});

await server.connect(transport);
await transport.handleRequest(req, res, req.body);
```

**Impact:**
- Missing sessionIdGenerator config
- Missing enableJsonResponse flag
- Missing transport.close() cleanup
- Missing transport.handleRequest() call

---

### 4. ❌ WRONG TOOL REGISTRATION API

**Our Implementation:**
```typescript
server.tool("toolName", "description", zodSchema, handler);
```

**Correct (per SDK docs):**
```typescript
server.registerTool("toolName", {
  title: "Display Name",
  description: "Description",
  inputSchema: zodSchema,
  outputSchema: zodOutputSchema
}, handler);
```

**Impact:**
- Using old/deprecated API
- Missing title field for UI display
- Missing outputSchema for type safety

---

## SDK Deprecation Notice

From the SDK README:

> **Note**: The SSE transport is now deprecated in favor of Streamable HTTP. New implementations should use Streamable HTTP, and existing SSE implementations should plan to migrate.

**We built against the wrong transport from the start!**

---

## Correct Implementation Pattern

Based on SDK documentation, here's the correct pattern:

```typescript
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const app = express();
app.use(express.json());

// Create server once (can be reused)
const server = new McpServer({
  name: 'reviewboard-mcp-server',
  version: '1.0.0'
});

// Register tools with NEW API
server.registerTool(
  'get_review_request',
  {
    title: 'Get Review Request',
    description: 'Get details of a specific review request',
    inputSchema: { reviewRequestId: z.number() },
    outputSchema: { /* ... */ }
  },
  async ({ reviewRequestId }) => {
    // ...
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result  // NEW: Structured output
    };
  }
);

// HTTP endpoint - POST to /mcp
app.post('/mcp', async (req, res) => {
  try {
    // Create new transport per request (stateless mode)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    res.on('close', () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      });
    }
  }
});

const port = parseInt(process.env.PORT || '3000');
app.listen(port, () => {
  console.log(`MCP Server running on http://localhost:${port}/mcp`);
});
```

---

## Authentication Considerations

The SDK docs don't show authentication in the basic examples. For our ReviewBoard use case, we need to:

1. **Extract credentials from request headers** (before creating transport)
2. **Create ReviewBoard client with those credentials**
3. **Pass client to tool handlers** (via closure or context)

**Options:**

### Option A: Per-request client (stateless)
```typescript
app.post('/mcp', async (req, res) => {
  // Extract credentials
  const credentials = extractCredentials(req);
  const reviewBoardClient = new ReviewBoardClient(credentials);
  
  // Create server with client in closure
  const server = createMcpServer(reviewBoardClient);
  
  // ... rest of handling
});
```

### Option B: Session management
Use the SDK's session management features (see README section "With Session Management").

---

## Migration Tasks

- [ ] Replace `SSEServerTransport` with `StreamableHTTPServerTransport`
- [ ] Change endpoint from `GET /mcp/sse` to `POST /mcp`
- [ ] Update transport initialization with proper config
- [ ] Add `transport.handleRequest()` call
- [ ] Update all `server.tool()` to `server.registerTool()`
- [ ] Add `title` field to all tools
- [ ] Add `outputSchema` to all tools
- [ ] Add `structuredContent` to tool responses
- [ ] Update authentication flow for StreamableHTTP
- [ ] Test with MCP Inspector
- [ ] Update documentation

---

## Testing Strategy

After fixes, test with:

1. **MCP Inspector** (official testing tool):
   ```bash
   npx @modelcontextprotocol/inspector
   # Connect to: http://localhost:3000/mcp
   ```

2. **Claude Code**:
   ```bash
   claude mcp add --transport http reviewboard http://localhost:3000/mcp
   ```

3. **VS Code**:
   ```bash
   code --add-mcp '{"name":"reviewboard","type":"http","url":"http://localhost:3000/mcp"}'
   ```

---

## LiteLLM Registration Impact

Our LiteLLM registration payload needs updating:

**Current:**
```json
{
  "transport": "sse",
  "url": "https://example.com/mcp/"
}
```

**Should be:**
```json
{
  "transport": "sse",  // LiteLLM may still call it "sse" for compatibility
  "url": "https://example.com/mcp"  // No trailing slash, POST endpoint
}
```

**Note:** LiteLLM's transport type "sse" may refer to the protocol concept, not the deprecated SDK transport. Need to verify with LiteLLM docs.

---

## Urgent Actions

1. ✅ **STOP** - Don't deploy current HTTP implementation
2. ⚠️ **FIX** - Rewrite using StreamableHTTPServerTransport
3. 🧪 **TEST** - Use MCP Inspector for validation
4. 📝 **UPDATE** - Fix all documentation
5. ✅ **VERIFY** - Test with LiteLLM proxy

---

## References

- **SDK README**: `/node_modules/@modelcontextprotocol/sdk/README.md`
- **Streamable HTTP Section**: Lines 552-633
- **Session Management**: Lines 636-726
- **Tool Registration**: Lines 159-252
- **MCP Specification**: https://modelcontextprotocol.io/specification/latest

---

**Priority:** 🔴 **CRITICAL**  
**Status:** 🚧 **BLOCKED FOR DEPLOYMENT**  
**ETA:** 2-3 hours to fix and test  
**Risk:** High - Current implementation won't work with MCP clients

---

**Next Steps:**
1. Rewrite `src/index-http.ts` using correct transport
2. Update tool registration to new API
3. Test with MCP Inspector
4. Update all docs
5. Test with LiteLLM
