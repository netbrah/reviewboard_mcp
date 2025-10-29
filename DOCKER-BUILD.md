# Docker Build Instructions

## Important: Build Locally First

Due to npm issues in Docker builds, you must build the TypeScript locally before building the Docker image.

### Build Steps

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Build TypeScript locally
npm run build

# 3. Build Docker image (copies pre-built files and node_modules)
docker build -t reviewboard-mcp:latest .

# 4. Test the image
docker run -d --name reviewboard-mcp-test -p 3000:3000 reviewboard-mcp:latest
curl http://localhost:3000/health

# 5. Clean up
docker stop reviewboard-mcp-test
docker rm reviewboard-mcp-test
```

### Why?

The Dockerfile now uses a simple approach:
- Copies `build/` directory (must exist before Docker build)
- Copies `node_modules/` directory (must exist before Docker build)
- No npm install in Docker (avoids npm bugs)

This approach:
- ✅ Faster builds (no npm install in Docker)
- ✅ Reliable (no npm bugs)
- ✅ Smaller final image (only production deps)
- ❌ Requires local build first

### CI/CD

In GitHub Actions:
1. `npm ci` - Install dependencies
2. `npm run build` - Build TypeScript
3. `docker build` - Build image with pre-built files
4. `docker push` - Push to registry

This is already configured in `.github/workflows/ci-cd.yml`.
