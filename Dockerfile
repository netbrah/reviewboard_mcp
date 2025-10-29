# ReviewBoard MCP Server - HTTP Streaming
# Copy pre-built artifacts and node_modules from host

FROM node:20-slim

WORKDIR /app

# Copy everything needed
COPY package*.json ./
COPY build ./build
COPY node_modules ./node_modules

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the HTTP server
CMD ["node", "build/index-http.js"]
