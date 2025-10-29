# Docker Build Instructions

## Two Approaches

You can build the Docker image using either approach:

### Approach 1: Build Locally, Copy to Docker (Current)

**Pros:** Faster Docker builds, no npm issues in container  
**Cons:** Requires local build first

```bash
# 1. Install dependencies and build locally
npm install
npm run build

# 2. Build Docker image (copies pre-built files)
docker build -t reviewboard-mcp:latest .

# 3. Test
docker run -d --name reviewboard-mcp-test -p 3000:3000 reviewboard-mcp:latest
curl http://localhost:3000/health
```

### Approach 2: Build Inside Docker (Alternative)

If you prefer building inside the container:

```dockerfile
FROM node:20-slim
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "build/index-http.js"]
```

Then just:
```bash
docker build -t reviewboard-mcp:latest .
```

**Note:** This approach may encounter npm issues in some environments.

## Current Dockerfile

The current Dockerfile uses Approach 1 (copy pre-built files) because:
- ✅ More reliable (avoids npm bugs in Alpine/containers)
- ✅ Faster builds (build happens once on host)
- ✅ Works with CI/CD caching

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) automatically:
1. `npm ci` - Install dependencies
2. `npm run build` - Build TypeScript locally
3. `docker build` - Build image with pre-built files
4. `docker push` - Push to registry

This ensures `build/` and `node_modules/` exist before Docker copies them.
