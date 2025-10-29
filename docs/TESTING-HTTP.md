# Testing HTTP Streaming Version

## Local Testing

### 1. Install Dependencies

```bash
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Start HTTP Server

```bash
# Default: http://localhost:3000
npm run start:http

# Or specify port
PORT=8080 npm run start:http
```

### 4. Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "reviewboard-mcp-server",
  "version": "1.0.0",
  "timestamp": "2025-10-28T12:34:56.789Z"
}
```

### 5. Test SSE Connection

You'll need to provide ReviewBoard credentials:

```bash
# Using API Token
curl -X GET http://localhost:3000/mcp/sse \
  -H "Authorization: Bearer YOUR_REVIEWBOARD_API_TOKEN" \
  -H "X-ReviewBoard-URL: https://reviewboard.netapp.com" \
  -N
```

Expected: SSE stream connection established (keeps connection open)

### 6. Test with MCP Client

Create a simple test script (`test-http-client.js`):

```javascript
import { EventSource } from 'eventsource';

const API_TOKEN = process.env.REVIEWBOARD_API_TOKEN || 'your_token';
const BASE_URL = process.env.REVIEWBOARD_BASE_URL || 'https://reviewboard.netapp.com';
const SERVER_URL = 'http://localhost:3000';

async function testMcpServer() {
  console.log('Testing MCP Server (HTTP)...\n');

  // Test health check
  const healthResponse = await fetch(`${SERVER_URL}/health`);
  const health = await healthResponse.json();
  console.log('Health check:', health);

  // Test SSE connection
  const eventSource = new EventSource(`${SERVER_URL}/mcp/sse`, {
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'X-ReviewBoard-URL': BASE_URL,
    },
  });

  eventSource.onopen = () => {
    console.log('✅ SSE connection established');
  };

  eventSource.onmessage = (event) => {
    console.log('Message:', event.data);
  };

  eventSource.onerror = (error) => {
    console.error('❌ SSE error:', error);
    eventSource.close();
  };

  // Send test message (list tools)
  setTimeout(async () => {
    try {
      const response = await fetch(`${SERVER_URL}/mcp/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
          'X-ReviewBoard-URL': BASE_URL,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        }),
      });

      const result = await response.json();
      console.log('Tools list:', result);
    } catch (error) {
      console.error('Error sending message:', error);
    }

    eventSource.close();
  }, 2000);
}

testMcpServer().catch(console.error);
```

Run:
```bash
node test-http-client.js
```

## Docker Testing

### 1. Build Docker Image

```bash
docker build -t reviewboard-mcp-server:test .
```

### 2. Run Container

```bash
docker run -p 3000:3000 reviewboard-mcp-server:test
```

### 3. Test Endpoints

```bash
# Health check
curl http://localhost:3000/health

# SSE endpoint
curl -X GET http://localhost:3000/mcp/sse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-ReviewBoard-URL: https://reviewboard.netapp.com" \
  -N
```

## Integration Testing with LiteLLM Proxy (Local)

If you have a local LiteLLM proxy instance:

### 1. Register Server

```bash
curl -X POST http://localhost:4000/v1/mcp/server \
  -H 'Content-Type: application/json' \
  -H 'x-litellm-api-key: YOUR_API_KEY' \
  -d '{
    "server_name": "reviewboard_local",
    "description": "Local ReviewBoard MCP server for testing",
    "url": "http://host.docker.internal:3000/mcp/",
    "transport": "http",
    "auth_type": "authorization",
    "mcp_access_groups": ["test"]
  }'
```

### 2. List Tools via Proxy

```bash
curl 'http://localhost:4000/mcp-rest/tools/list?server_id=reviewboard_local' \
  -H 'x-litellm-api-key: YOUR_API_KEY'
```

### 3. Test Tool via Chat Completion

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'x-litellm-api-key: YOUR_API_KEY' \
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "Get review request 858846 from ReviewBoard"
      }
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_review_request",
          "server": "reviewboard_local"
        }
      }
    ]
  }'
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=8080 npm run start:http
```

### CORS Issues

If testing from browser, CORS is enabled. Check logs for CORS errors.

### Authentication Fails

1. **Verify API token**:
   ```bash
   curl -H "Authorization: token YOUR_TOKEN" \
        https://reviewboard.netapp.com/api/
   ```

2. **Check ReviewBoard URL**:
   - Must be accessible from server
   - Include protocol (https://)
   - No trailing slash

3. **Check header format**:
   - API Token: `Authorization: Bearer YOUR_TOKEN`
   - Username/Password: `Authorization: Basic BASE64(user:pass)`

### SSE Connection Drops

- Check for aggressive timeouts in proxies/gateways
- Verify network stability
- Check server logs for errors

## Performance Testing

### Load Test with Apache Bench

```bash
# Health endpoint
ab -n 1000 -c 10 http://localhost:3000/health

# SSE connections (requires special setup)
# Use a tool like `hey` instead:
npm install -g hey
hey -n 100 -c 5 -H "Authorization: Bearer TOKEN" http://localhost:3000/mcp/sse
```

### Monitor Resource Usage

```bash
# Docker stats
docker stats reviewboard-mcp-server

# Process stats (if running directly)
ps aux | grep node
top -p <PID>
```

## Next Steps

Once local testing passes:
1. Deploy to staging environment
2. Test via LiteLLM proxy in staging
3. Verify all tools work correctly
4. Deploy to production
5. Register with production LiteLLM proxy

## Comparison: stdio vs HTTP

| Test | stdio | HTTP Streaming |
|------|-------|----------------|
| Local dev | ✅ Easy | ⚠️ Requires server |
| Scaling | ❌ One process per client | ✅ Shared service |
| Deployment | ❌ Complex | ✅ Standard web service |
| Monitoring | ⚠️ Per-client | ✅ Centralized |
| Authentication | Environment | HTTP headers |

**Recommendation**: Use stdio for local development, HTTP streaming for production.
