# Deployment Guide - ReviewBoard MCP Server (HTTP Streaming)

## Overview

This guide covers deploying the ReviewBoard MCP Server as a web service with HTTP streaming (SSE) transport.

## ⚠️ IMPORTANT: Manual LiteLLM Registration Required

**LiteLLM proxy registration MUST be done manually** after deployment. GitHub Actions and automated CI/CD pipelines do not have access to the LiteLLM proxy API.

➡️ **See [MANUAL-LITELLM-REGISTRATION.md](./MANUAL-LITELLM-REGISTRATION.md) for complete registration instructions.**

## Prerequisites

- Docker or Node.js 20+
- Access to deploy on your infrastructure (e.g., Kubernetes, Cloud Run, VM)
- **LiteLLM API key** (for manual registration after deployment)
- ReviewBoard API access (for testing)

## Quick Start (Docker)

### 1. Build Docker Image

```bash
# Build the image
docker build -t reviewboard-mcp-server:latest .

# Test locally
docker run -p 3000:3000 reviewboard-mcp-server:latest
```

### 2. Test Locally

```bash
# Health check
curl http://localhost:3000/health

# Test with credentials
curl -X GET http://localhost:3000/mcp/sse \
  -H "Authorization: Bearer YOUR_REVIEWBOARD_API_TOKEN" \
  -H "X-ReviewBoard-URL: https://reviewboard.netapp.com"
```

### 3. Push to Registry

```bash
# Tag for your registry
docker tag reviewboard-mcp-server:latest your-registry/reviewboard-mcp-server:latest

# Push
docker push your-registry/reviewboard-mcp-server:latest
```

## Deployment Options

### Option 1: Kubernetes Deployment

Create `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reviewboard-mcp-server
  namespace: mcp-servers
spec:
  replicas: 2
  selector:
    matchLabels:
      app: reviewboard-mcp-server
  template:
    metadata:
      labels:
        app: reviewboard-mcp-server
    spec:
      containers:
      - name: server
        image: your-registry/reviewboard-mcp-server:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: PORT
          value: "3000"
        - name: HOST
          value: "0.0.0.0"
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: reviewboard-mcp-server
  namespace: mcp-servers
spec:
  selector:
    app: reviewboard-mcp-server
  ports:
  - port: 80
    targetPort: 3000
    name: http
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: reviewboard-mcp-server
  namespace: mcp-servers
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - mcp-reviewboard.ai.eng.netapp.com
    secretName: reviewboard-mcp-tls
  rules:
  - host: mcp-reviewboard.ai.eng.netapp.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: reviewboard-mcp-server
            port:
              number: 80
```

Deploy:
```bash
kubectl apply -f k8s-deployment.yaml
```

### Option 2: Docker Compose (Simple Deployment)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  reviewboard-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - HOST=0.0.0.0
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
```

Deploy:
```bash
docker-compose up -d
```

### Option 3: Direct Node.js (VM Deployment)

1. **Install Node.js 20+**:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Clone and build**:
```bash
git clone <your-repo>
cd reviewboard_mcp
npm install
npm run build
```

3. **Create systemd service** (`/etc/systemd/system/reviewboard-mcp.service`):
```ini
[Unit]
Description=ReviewBoard MCP Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/reviewboard_mcp
Environment="PORT=3000"
Environment="HOST=0.0.0.0"
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node build/index-http.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

4. **Start service**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable reviewboard-mcp
sudo systemctl start reviewboard-mcp
```

## Register with LiteLLM Proxy

Once deployed, register your server:

```bash
curl -X 'POST' \
  'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server' \
  -H 'accept: application/json' \
  -H 'x-litellm-api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "server_name": "reviewboard_netapp",
    "alias": "reviewboard",
    "description": "NetApp ReviewBoard MCP server - Natural language interface for code reviews",
    "url": "https://mcp-reviewboard.ai.eng.netapp.com/mcp/",
    "transport": "sse",
    "auth_type": "bearer_token",
    "mcp_info": {
      "logo_url": "app/static/icons/ReviewBoard.png",
      "token_prefix": "Bearer",
      "requires_username": false,
      "source": "ReviewBoard",
      "server_name": "reviewboard_netapp",
      "description": "Natural language interface for ReviewBoard code reviews with comprehensive analysis"
    },
    "mcp_access_groups": ["reviewboard"],
    "allowed_tools": [],
    "extra_headers": ["X-ReviewBoard-URL"]
  }'
```

### Verify Registration

```bash
# List all registered MCP servers
curl -X GET 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server' \
  -H 'accept: application/json' \
  -H 'x-litellm-api-key: YOUR_API_KEY'

# Expected response: array of LiteLLM_MCPServerTable objects
# [
#   {
#     "server_id": "uuid",
#     "server_name": "reviewboard_netapp",
#     "alias": "reviewboard",
#     "url": "https://mcp-reviewboard.ai.eng.netapp.com/mcp/",
#     "transport": "sse",
#     "auth_type": "bearer_token",
#     "status": "healthy",
#     "last_health_check": "2025-10-28T12:34:56.789Z",
#     ...
#   }
# ]

# Health check all MCP servers
curl -X GET 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server/health' \
  -H 'accept: application/json' \
  -H 'x-litellm-api-key: YOUR_API_KEY'

# List tools from all servers (or specific server_id)
curl -X GET 'https://llm-proxy-api.ai.eng.netapp.com/mcp-rest/tools/list?server_id=YOUR_SERVER_ID' \
  -H 'accept: application/json' \
  -H 'x-litellm-api-key: YOUR_API_KEY'

# Expected response:
# {
#   "tools": [
#     {
#       "name": "get_review_request",
#       "description": "Get details of a specific review request...",
#       "inputSchema": {...},
#       "mcp_info": {
#         "server_name": "reviewboard_netapp",
#         "logo_url": "app/static/icons/ReviewBoard.png"
#       }
#     },
#     ...
#   ],
#   "error": null,
#   "message": "Successfully retrieved tools"
# }
```

### Update Existing Server

```bash
# Update server configuration (e.g., change URL after redeployment)
curl -X PUT 'https://llm-proxy-api.ai.eng.netapp.com/v1/mcp/server' \
  -H 'accept: application/json' \
  -H 'x-litellm-api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "server_id": "YOUR_SERVER_ID",
    "url": "https://new-mcp-reviewboard.ai.eng.netapp.com/mcp/",
    "description": "Updated description"
  }'
```

## Authentication Flow

### For End Users

Users need to provide their ReviewBoard credentials when using the MCP server:

1. **API Token** (recommended):
   ```
   Authorization: Bearer YOUR_REVIEWBOARD_API_TOKEN
   X-ReviewBoard-URL: https://reviewboard.netapp.com
   ```

2. **Username/Password**:
   ```
   Authorization: Basic BASE64(username:password)
   X-ReviewBoard-URL: https://reviewboard.netapp.com
   ```

### How LiteLLM Proxy Handles This

The LiteLLM proxy will:
1. Accept user credentials in chat requests
2. Forward them to your MCP server in HTTP headers
3. Your server creates a ReviewBoard client per session
4. All tool calls use the user's credentials

## Monitoring

### Health Checks

```bash
# Direct health check
curl https://mcp-reviewboard.ai.eng.netapp.com/health

# Expected response
{
  "status": "healthy",
  "service": "reviewboard-mcp-server",
  "version": "1.0.0",
  "timestamp": "2025-10-28T12:34:56.789Z"
}
```

### Logs

**Kubernetes**:
```bash
kubectl logs -f deployment/reviewboard-mcp-server -n mcp-servers
```

**Docker Compose**:
```bash
docker-compose logs -f reviewboard-mcp
```

**Systemd**:
```bash
journalctl -u reviewboard-mcp -f
```

## Security Considerations

1. **HTTPS Only**: Always deploy behind HTTPS (use ingress/load balancer with TLS)
2. **Credentials**: User credentials are passed per-request, never stored
3. **Rate Limiting**: Consider adding rate limiting at the ingress level
4. **Network Security**: Restrict access to ReviewBoard API from MCP server IPs only
5. **Headers**: All sensitive data in headers, not query strings

## Scaling

The server is stateless (credentials per-request), so you can:
- Scale horizontally: Add more replicas in Kubernetes
- Use load balancer: Round-robin across instances
- Auto-scale: Based on CPU/memory/request rate

## Troubleshooting

### Server won't start
- Check logs for port conflicts
- Verify Node.js version >= 20
- Ensure build completed: `npm run build`

### Health check failing
- Verify server is listening: `netstat -tulpn | grep 3000`
- Check firewall rules
- Test locally: `curl http://localhost:3000/health`

### Authentication errors
- Verify ReviewBoard API token is valid
- Check ReviewBoard URL is accessible from server
- Test direct API call: `curl -H "Authorization: token YOUR_TOKEN" https://reviewboard.netapp.com/api/`

### SSE connection issues
- Ensure client supports Server-Sent Events
- Check for proxy/gateway timeouts (SSE is long-lived)
- Verify no aggressive connection timeouts

## Next Steps

1. **Deploy to your infrastructure** using one of the methods above
2. **Register with LiteLLM proxy** using the provided curl command
3. **Test tools** via the proxy's REST API
4. **Configure access groups** to control who can use the server
5. **Monitor** logs and health checks

## Support

For issues or questions:
- Check logs first
- Verify health endpoint responds
- Test ReviewBoard API access directly
- Review LiteLLM proxy configuration

## References

- [MCP SDK Documentation](https://modelcontextprotocol.io/)
- [LiteLLM Proxy Docs](https://docs.litellm.ai/docs/proxy/)
- [ReviewBoard API Docs](https://www.reviewboard.org/docs/manual/latest/webapi/)
