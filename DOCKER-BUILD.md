# Docker Build Instructions

## RHEL 9 Compatible Build

This project uses Red Hat Universal Base Image (UBI) 9 with Node.js 20 for RHEL 9 compatibility. This ensures the Docker image can be built and run seamlessly in RHEL 9 environments.

## Two Approaches

You can build the Docker image using either approach:

### Approach 1: Build Locally, Copy to Docker (Current)

**Pros:** Faster Docker builds, no npm issues in container, RHEL 9 compatible  
**Cons:** Requires local build first

```bash
# 1. Install dependencies and build locally
npm install
npm run build

# 2. Build Docker image (copies pre-built files into RHEL 9 UBI container)
docker build -t reviewboard-mcp:latest .

# 3. Test
docker run -d --name reviewboard-mcp-test -p 3000:3000 reviewboard-mcp:latest
curl http://localhost:3000/health
```

### Approach 2: Build Inside Docker (Alternative)

If you prefer building inside the container using RHEL 9 UBI:

```dockerfile
FROM registry.access.redhat.com/ubi9/nodejs-20:latest

USER 0
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

# Set ownership for non-root user
RUN chown -R 1001:0 /app && chmod -R g=u /app

USER 1001

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
- ✅ More reliable (avoids npm bugs in containers)
- ✅ Faster builds (build happens once on host)
- ✅ Works with CI/CD caching
- ✅ **RHEL 9 UBI based for compatibility with RHEL 9 airlock environments**

## Base Image

The Dockerfile uses `registry.access.redhat.com/ubi9/nodejs-20:latest` which provides:
- ✅ RHEL 9 Universal Base Image (UBI) - fully compatible with RHEL 9
- ✅ Node.js 20 LTS pre-installed
- ✅ Minimal security vulnerabilities
- ✅ Red Hat support and updates
- ✅ Non-root user (1001) for security best practices

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) automatically:
1. Runs builds in RHEL 9 UBI containers for consistency
2. `npm ci` - Install dependencies
3. `npm run build` - Build TypeScript locally
4. `docker build` - Build image with pre-built files using RHEL 9 UBI
5. `docker push` - Push to registry

This ensures `build/` and `node_modules/` exist before Docker copies them, and all builds use RHEL 9 compatible environments.
