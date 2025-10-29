# ReviewBoard MCP Server - HTTP Streaming
# RHEL 9 compatible using Red Hat Universal Base Image (UBI)
# Copy pre-built artifacts and node_modules from host

FROM registry.access.redhat.com/ubi9/nodejs-20:latest

WORKDIR /app

# Switch to root to set up application
USER 0

# Copy everything needed
COPY package*.json ./
COPY build ./build
COPY node_modules ./node_modules

# Set ownership to the default user (1001)
RUN chown -R 1001:0 /app && \
    chmod -R g=u /app

# Switch back to non-root user for security
USER 1001

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the HTTP server
CMD ["node", "build/index-http.js"]
