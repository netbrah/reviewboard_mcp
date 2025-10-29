# MCP Streamable HTTP Transport - Specification Review

## Status: ⚠️ NEEDS VERIFICATION

This document tracks our review of the official MCP Streamable HTTP specification and validation of our implementation.

**Specification URL:** https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http

**Date:** 2025-10-29

---

## Current Implementation Analysis

### What We Implemented

Our HTTP transport implementation in `src/index-http.ts`:

1. **Express HTTP Server**: Standard Express.js web server
2. **SSE Transport**: Using `@modelcontextprotocol/sdk/server/sse.js`
3. **Endpoints**:
   - `GET /health` - Health check
   - `GET /mcp/sse` - SSE connection endpoint
   - `POST /mcp/message` - Message handling
   - `GET /` - API info

4. **Authentication**: Per-request via HTTP headers
   - `Authorization: Bearer <token>`
   - `X-ReviewBoard-URL: <url>`

5. **Architecture**: Per-connection MCP server instances

### Code Pattern Used

```typescript
// Create SSE transport
const transport = new SSEServerTransport("/mcp/message", res);

// Create MCP server instance
const mcpServer = createMcpServer(reviewBoardClient);

// Connect server to transport
await mcpServer.connect(transport);
```

---

## Specification Review Checklist

### 🔲 Transport Layer

- [ ] Verify SSE is the correct transport type for "streamable HTTP"
- [ ] Check if endpoint paths match spec requirements
- [ ] Validate HTTP methods (GET for SSE, POST for messages)
- [ ] Confirm connection initialization handshake
- [ ] Review message format requirements

### 🔲 Message Protocol

- [ ] Verify JSON-RPC 2.0 message format
- [ ] Check if message framing is correct
- [ ] Validate error handling patterns
- [ ] Review timeout requirements
- [ ] Check connection lifecycle management

### 🔲 Authentication & Headers

- [ ] Verify if custom headers are spec-compliant
- [ ] Check authentication header format
- [ ] Review if per-request auth is standard pattern
- [ ] Validate credential extraction method

### 🔲 Session Management

- [ ] Verify per-connection server instances are correct approach
- [ ] Check session ID generation and tracking
- [ ] Review connection cleanup procedures
- [ ] Validate resource cleanup on disconnect

### 🔲 Tool Registration

- [ ] Verify tool registration API matches spec
- [ ] Check if `server.tool()` is correct method
- [ ] Review schema format (Zod → JSON Schema)
- [ ] Validate tool response format

---

## Questions to Answer from Spec

1. **Transport Type**: Is "Streamable HTTP" the same as SSE, or is it a different protocol?

2. **Endpoint Structure**: What should the exact endpoint paths be?
   - Current: `/mcp/sse` and `/mcp/message`
   - Spec requirement: TBD

3. **Message Format**: What's the exact JSON-RPC 2.0 format required?
   - Tool calls
   - Tool responses
   - Error messages

4. **Authentication**: Is custom header authentication spec-compliant?
   - Do we need OAuth2?
   - Is Bearer token sufficient?
   - Should credentials be in message payload vs headers?

5. **Connection Lifecycle**:
   - Handshake requirements
   - Keep-alive mechanisms
   - Disconnect handling
   - Reconnection logic

6. **Tool Protocol**:
   - Tool listing format
   - Tool invocation format
   - Tool response format
   - Error reporting

---

## Implementation Concerns

### Potential Issues

1. **SSEServerTransport Constructor**
   ```typescript
   const transport = new SSEServerTransport("/mcp/message", res);
   ```
   - Is `/mcp/message` the correct message endpoint?
   - Should it match a specific pattern?

2. **Per-Connection Server Instances**
   ```typescript
   const mcpServer = createMcpServer(reviewBoardClient);
   await mcpServer.connect(transport);
   ```
   - Is creating a new McpServer per connection correct?
   - Should we have a singleton server?
   - How does this affect tool registration?

3. **Authentication Flow**
   ```typescript
   const credentials = extractCredentials(req);
   const reviewBoardClient = new ReviewBoardClient(credentials);
   const mcpServer = createMcpServer(reviewBoardClient);
   ```
   - Should authentication happen during handshake?
   - Should credentials be passed in JSON-RPC messages?

4. **Message Endpoint**
   ```typescript
   app.post("/mcp/message", async (req: Request, res: Response) => {
     res.status(405).json({ error: "Method not allowed" });
   });
   ```
   - Why is this returning 405?
   - Should SSEServerTransport handle this automatically?

---

## SDK API Verification Needed

### SSEServerTransport API

From `@modelcontextprotocol/sdk/server/sse.d.ts`:

```typescript
export class SSEServerTransport {
  constructor(endpoint: string, response: Response);
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
  // ... other methods
}
```

**Questions:**
- What is the `endpoint` parameter for?
- How does message routing work?
- Is the Response object from Express compatible?

### McpServer API

```typescript
export class McpServer {
  constructor(config: ServerConfig);
  tool(name: string, description: string, schema: ZodSchema, handler: Handler): void;
  connect(transport: Transport): Promise<void>;
  // ... other methods
}
```

**Questions:**
- Can we create multiple instances?
- Does `connect()` handle all message routing?
- How are tools exposed after connection?

---

## Testing Strategy

Once spec is reviewed, we need to test:

1. **Spec Compliance Testing**
   ```bash
   # Test against official MCP test suite (if exists)
   npm run test:spec-compliance
   ```

2. **Tool Invocation Testing**
   ```bash
   # Verify JSON-RPC format
   curl -X POST http://localhost:3000/mcp/message \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
   ```

3. **SSE Connection Testing**
   ```bash
   # Verify SSE stream format
   curl -N http://localhost:3000/mcp/sse \
     -H "Authorization: Bearer TOKEN" \
     -H "X-ReviewBoard-URL: https://reviewboard.example.com"
   ```

4. **LiteLLM Compatibility**
   - Test with actual LiteLLM proxy
   - Verify registration works
   - Test tool invocation through proxy

---

## Action Items

### Immediate (Before Deployment)

1. **Read Full Specification**
   - Access spec at https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http
   - Document all requirements
   - Note any deviations in current implementation

2. **Verify SDK Usage**
   - Review `@modelcontextprotocol/sdk` documentation
   - Check example implementations
   - Validate our API usage

3. **Test Against Spec**
   - Create spec compliance tests
   - Verify message formats
   - Test edge cases

### Code Updates (If Needed)

Based on spec review, we may need to:

1. Update endpoint paths
2. Change authentication flow
3. Modify message handling
4. Fix SSEServerTransport usage
5. Update tool registration
6. Adjust error handling

### Documentation Updates

1. Update HTTP-MIGRATION-SUMMARY.md with spec references
2. Add spec compliance section to DEPLOYMENT.md
3. Document any spec-specific requirements
4. Add spec validation to testing docs

---

## Reference Implementation Search

Look for reference implementations:

1. **Official Examples**
   - MCP SDK examples
   - Reference implementations from spec authors

2. **Community Implementations**
   - Other MCP servers using HTTP transport
   - LiteLLM MCP server examples
   - Jira OSS server implementation

3. **SDK Tests**
   - Unit tests in `@modelcontextprotocol/sdk`
   - Integration test examples

---

## Spec Review Template

When reviewing the spec, document:

### Transport Layer
- [ ] Protocol: _____
- [ ] Endpoints: _____
- [ ] Methods: _____
- [ ] Headers: _____

### Message Format
- [ ] Content-Type: _____
- [ ] Encoding: _____
- [ ] Framing: _____

### Authentication
- [ ] Method: _____
- [ ] Location: _____
- [ ] Format: _____

### Tool Protocol
- [ ] Discovery: _____
- [ ] Invocation: _____
- [ ] Response: _____

### Error Handling
- [ ] Error codes: _____
- [ ] Error format: _____
- [ ] Recovery: _____

---

## Next Steps

1. **Access Specification** (REQUIRED)
   - Direct browser access
   - Download if available
   - Request access if needed

2. **Complete Review**
   - Fill in all checklist items
   - Document findings
   - Identify gaps

3. **Update Implementation**
   - Fix any spec violations
   - Add missing features
   - Update tests

4. **Validate Changes**
   - Test locally
   - Test with LiteLLM
   - Run full test suite

5. **Document Compliance**
   - Add spec reference to docs
   - Note implementation decisions
   - Document any deviations (with justification)

---

## Notes

- Specification URL appears to use a date-based versioning (2025-06-18)
- This may be a future specification - verify if current SDK implements it
- May need to check SDK version compatibility
- Consider if we need to upgrade SDK version

---

## Completion Status

- [ ] Specification accessed and reviewed
- [ ] Implementation validated against spec
- [ ] Gaps identified and documented
- [ ] Code updates completed (if needed)
- [ ] Tests updated to validate spec compliance
- [ ] Documentation updated with spec references
- [ ] Changes tested locally
- [ ] Changes tested with LiteLLM integration
- [ ] Ready for deployment

---

**Last Updated:** 2025-10-29  
**Reviewer:** GitHub Copilot Agent  
**Status:** Awaiting specification access  
**Priority:** HIGH - Required before production deployment
