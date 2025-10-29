#!/usr/bin/env node
/**
 * ReviewBoard MCP Server - HTTP Streaming (SSE) Transport
 *
 * This version uses HTTP with Server-Sent Events (SSE) instead of stdio,
 * allowing deployment as a web service that can be registered with LiteLLM proxy.
 */

import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { ReviewBoardClient } from "./reviewboard-client.js";// Server configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

// Express app setup
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // SSE requires this
}));
app.use(cors());
app.use(express.json());

// MCP Server instance - will be created per-connection
function createMcpServer(reviewBoardClient: ReviewBoardClient): McpServer {
  const server = new McpServer({
    name: "reviewboard-mcp-server",
    version: "1.0.0",
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  });

  // Register all tools with the server
  // Tool: Get review requests
  server.tool(
    "get_review_requests",
    "Get a list of review requests",
    {
      status: z.enum(["pending", "submitted", "discarded", "all"]).optional().describe("Filter by status"),
      repository: z.string().optional().describe("Filter by repository name"),
      user: z.string().optional().describe("Filter by user"),
      limit: z.number().min(1).max(200).default(25).describe("Number of results to return"),
    },
    async ({ status, repository, user, limit = 25 }) => {
      try {
        const reviewRequests = await reviewBoardClient.getReviewRequests({
          status,
          repository,
          user,
          limit,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(reviewRequests, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching review requests: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Get review request details
  server.tool(
    "get_review_request",
    "Get details of a specific review request",
    {
      reviewRequestId: z.number().describe("ID of the review request"),
    },
    async ({ reviewRequestId }) => {
      try {
        const reviewRequest = await reviewBoardClient.getReviewRequest(reviewRequestId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(reviewRequest, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching review request: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Add all other tools... (abbreviated for brevity, copy from stdio version)
  // [The rest of the tools would be added here using the same pattern]

  return server;
}

// Store active sessions
const activeSessions = new Map<string, { client: ReviewBoardClient; server: McpServer }>();

/**
 * Extract ReviewBoard credentials from HTTP request
 */
function extractCredentials(req: Request): {
  baseUrl: string;
  apiToken?: string;
  username?: string;
  password?: string;
} {
  // Base URL from environment or header
  const baseUrl = req.headers["x-reviewboard-url"] as string || process.env.REVIEWBOARD_BASE_URL;

  if (!baseUrl) {
    throw new Error("ReviewBoard base URL not provided");
  }

  // Authentication from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new Error("Authorization header required");
  }

  // Support different auth types
  if (authHeader.startsWith("Bearer ")) {
    // API Token
    const apiToken = authHeader.substring(7);
    return { baseUrl, apiToken };
  } else if (authHeader.startsWith("Basic ")) {
    // Username/Password (base64 encoded)
    const credentials = Buffer.from(authHeader.substring(6), "base64").toString();
    const [username, password] = credentials.split(":");
    return { baseUrl, username, password };
  } else if (authHeader.startsWith("Token ")) {
    // Alternative token format
    const apiToken = authHeader.substring(6);
    return { baseUrl, apiToken };
  }

  throw new Error("Unsupported authentication type");
}

/**
 * Get or create ReviewBoard client for this session
 */
function getClient(sessionId: string, credentials: ReturnType<typeof extractCredentials>): ReviewBoardClient {
  let client = activeClients.get(sessionId);

  if (!client) {
    client = new ReviewBoardClient(credentials);
    activeClients.set(sessionId, client);
  }

  return client;
}

// ============================================================================
// Register all MCP tools with the server
// ============================================================================

// Tool: Get review requests
mcpServer.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  const sessionId = (request as any).sessionId || "default";

  try {
    // Get credentials from request context
    const credentials = (request as any).credentials;
    const client = getClient(sessionId, credentials);

    switch (name) {
      case "get_review_requests": {
        const { status, repository, user, limit = 25 } = args as any;
        const reviewRequests = await client.getReviewRequests({
          status,
          repository,
          user,
          limit,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(reviewRequests, null, 2) }],
        };
      }

      case "get_review_request": {
        const { reviewRequestId } = args as any;
        const reviewRequest = await client.getReviewRequest(reviewRequestId);
        return {
          content: [{ type: "text", text: JSON.stringify(reviewRequest, null, 2) }],
        };
      }

      case "get_reviews": {
        const { reviewRequestId } = args as any;
        const reviews = await client.getReviews(reviewRequestId);
        return {
          content: [{ type: "text", text: JSON.stringify(reviews, null, 2) }],
        };
      }

      case "get_diff_files": {
        const { reviewRequestId, diffRevision } = args as any;
        const files = await client.getDiffFiles(reviewRequestId, diffRevision);
        return {
          content: [{ type: "text", text: JSON.stringify(files, null, 2) }],
        };
      }

      case "get_full_diff_patch": {
        const { reviewRequestId, diffRevision } = args as any;
        const patch = await client.getFullDiffPatch(reviewRequestId, diffRevision);
        return {
          content: [{ type: "text", text: patch }],
        };
      }

      case "get_comprehensive_comments_analysis": {
        const { reviewRequestId } = args as any;
        const analysis = await client.getComprehensiveCommentsAnalysis(reviewRequestId);
        return {
          content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }],
        };
      }

      case "get_repositories": {
        const { limit = 25 } = args as any;
        const repositories = await client.getRepositories(limit);
        return {
          content: [{ type: "text", text: JSON.stringify(repositories, null, 2) }],
        };
      }

      case "get_users": {
        const { limit = 25 } = args as any;
        const users = await client.getUsers(limit);
        return {
          content: [{ type: "text", text: JSON.stringify(users, null, 2) }],
        };
      }

      case "search": {
        const { query, username } = args as any;
        const results = await client.search(query, username);
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }

      case "get_diff_revisions": {
        const { reviewRequestId, includePatchDiffs } = args as any;
        const revisions = await client.getDiffRevisions(reviewRequestId, includePatchDiffs || false);
        return {
          content: [{ type: "text", text: JSON.stringify(revisions, null, 2) }],
        };
      }

      case "get_revision_summary": {
        const { reviewRequestId, revision } = args as any;
        const summary = await client.getRevisionSummary(reviewRequestId, revision);
        return {
          content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
        };
      }

      case "get_file_at_revision": {
        const { reviewRequestId, filePath, revisionNumber, type = "patched" } = args as any;
        const fileContent = await client.getFileAtRevision(reviewRequestId, filePath, revisionNumber, type);
        return {
          content: [{ type: "text", text: JSON.stringify(fileContent, null, 2) }],
        };
      }

      case "get_review_history": {
        const { reviewRequestId } = args as any;
        const history = await client.getReviewRequestHistory(reviewRequestId);
        return {
          content: [{ type: "text", text: JSON.stringify(history, null, 2) }],
        };
      }

      case "compare_revisions": {
        const { reviewRequestId, fromRevision, toRevision } = args as any;
        const comparison = await client.compareRevisions(reviewRequestId, fromRevision, toRevision);
        return {
          content: [{ type: "text", text: JSON.stringify(comparison, null, 2) }],
        };
      }

      case "get_file_history": {
        const { reviewRequestId, filePath } = args as any;
        const history = await client.getFileHistory(reviewRequestId, filePath);
        return {
          content: [{ type: "text", text: JSON.stringify(history, null, 2) }],
        };
      }

      case "get_file_revision_history": {
        const { reviewRequestId, filePath } = args as any;
        const history = await client.getFileRevisionHistory(reviewRequestId, filePath);
        return {
          content: [{ type: "text", text: JSON.stringify(history, null, 2) }],
        };
      }

      case "analyze_comment_resolution": {
        const { reviewRequestId } = args as any;
        const analysis = await client.analyzeCommentResolution(reviewRequestId);
        return {
          content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
});

// List available tools
mcpServer.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "get_review_requests",
        description: "Get a list of review requests",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["pending", "submitted", "discarded", "all"],
              description: "Filter by status",
            },
            repository: { type: "string", description: "Filter by repository name" },
            user: { type: "string", description: "Filter by user" },
            limit: { type: "number", minimum: 1, maximum: 200, default: 25 },
          },
        },
      },
      {
        name: "get_review_request",
        description: "Get details of a specific review request",
        inputSchema: {
          type: "object",
          properties: {
            reviewRequestId: { type: "number", description: "ID of the review request" },
          },
          required: ["reviewRequestId"],
        },
      },
      {
        name: "get_reviews",
        description: "Get reviews for a specific review request",
        inputSchema: {
          type: "object",
          properties: {
            reviewRequestId: { type: "number", description: "ID of the review request" },
          },
          required: ["reviewRequestId"],
        },
      },
      {
        name: "get_diff_files",
        description: "Get the files changed in a diff for a specific review request",
        inputSchema: {
          type: "object",
          properties: {
            reviewRequestId: { type: "number", description: "ID of the review request" },
            diffRevision: { type: "number", description: "Specific diff revision (latest if not specified)" },
          },
          required: ["reviewRequestId"],
        },
      },
      {
        name: "get_full_diff_patch",
        description: "Get the complete unified diff patch for a review request",
        inputSchema: {
          type: "object",
          properties: {
            reviewRequestId: { type: "number", description: "ID of the review request" },
            diffRevision: { type: "number", description: "Specific diff revision (latest if not specified)" },
          },
          required: ["reviewRequestId"],
        },
      },
      {
        name: "get_comprehensive_comments_analysis",
        description: "Get comprehensive analysis of all comments with file content annotations",
        inputSchema: {
          type: "object",
          properties: {
            reviewRequestId: { type: "number", description: "ID of the review request" },
          },
          required: ["reviewRequestId"],
        },
      },
      {
        name: "get_repositories",
        description: "Get a list of repositories",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", minimum: 1, maximum: 200, default: 25 },
          },
        },
      },
      {
        name: "get_users",
        description: "Get a list of users",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", minimum: 1, maximum: 200, default: 25 },
          },
        },
      },
      {
        name: "search",
        description: "Search across ReviewBoard content",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            username: { type: "string", description: "Search within specific user's content" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_diff_revisions",
        description: "List all diff revisions with summary and optionally include full patch differences between consecutive revisions",
        inputSchema: {
          type: "object",
          properties: {
            reviewRequestId: { type: "number", description: "ID of the review request" },
            includePatchDiffs: { type: "boolean", description: "Include full patch differences between consecutive revisions (default: false)" },
          },
          required: ["reviewRequestId"],
        },
      },
      {
        name: "get_revision_summary",
        description: "Get detailed summary of a specific revision including files changed and statistics",
        inputSchema: {
          type: "object",
          properties: {
            reviewRequestId: { type: "number", description: "ID of the review request" },
            revision: { type: "number", description: "Revision number to summarize" },
          },
          required: ["reviewRequestId", "revision"],
        },
      },
      {
        name: "get_file_at_revision",
        description: "Get file content from a specific revision",
        inputSchema: {
          type: "object",
          properties: {
            reviewRequestId: { type: "number", description: "ID of the review request" },
            filePath: { type: "string", description: "Path of the file to retrieve" },
            revisionNumber: { type: "number", description: "Revision number (1 = first revision)" },
            type: { type: "string", enum: ["original", "patched"], default: "patched" },
          },
          required: ["reviewRequestId", "filePath", "revisionNumber"],
        },
      },
      {
        name: "get_review_history",
        description: "Get complete change history of the review request - who changed what and when",
        inputSchema: {
          type: "object",
          properties: {
            reviewRequestId: { type: "number", description: "ID of the review request" },
          },
          required: ["reviewRequestId"],
        },
      },
      {
        name: "compare_revisions",
        description: "Compare two revisions to see what changed between them",
        inputSchema: {
          type: "object",
          properties: {
            reviewRequestId: { type: "number", description: "ID of the review request" },
            fromRevision: { type: "number", description: "Starting revision number" },
            toRevision: { type: "number", description: "Ending revision number" },
          },
          required: ["reviewRequestId", "fromRevision", "toRevision"],
        },
      },
      {
        name: "get_file_history",
        description: "Track how a specific file evolved across all revisions",
        inputSchema: {
          type: "object",
          properties: {
            reviewRequestId: { type: "number", description: "ID of the review request" },
            filePath: { type: "string", description: "Path of the file to track" },
          },
          required: ["reviewRequestId", "filePath"],
        },
      },
      {
        name: "get_file_revision_history",
        description: "Get comprehensive revision history for a specific file including patch diffs between consecutive revisions",
        inputSchema: {
          type: "object",
          properties: {
            reviewRequestId: { type: "number", description: "ID of the review request" },
            filePath: { type: "string", description: "Path of the file to track (supports partial matching)" },
          },
          required: ["reviewRequestId", "filePath"],
        },
      },
      {
        name: "analyze_comment_resolution",
        description: "Analyze whether comments were addressed in subsequent revisions",
        inputSchema: {
          type: "object",
          properties: {
            reviewRequestId: { type: "number", description: "ID of the review request" },
          },
          required: ["reviewRequestId"],
        },
      },
    ],
  };
});

// ============================================================================
// HTTP Endpoints
// ============================================================================

// Health check endpoint (required for LiteLLM proxy)
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "reviewboard-mcp-server",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Main MCP endpoint using SSE
app.get("/mcp/sse", async (req: Request, res: Response) => {
  console.log("New SSE connection");

  try {
    // Extract and validate credentials
    const credentials = extractCredentials(req);

    // Test connection to ReviewBoard
    const testClient = new ReviewBoardClient(credentials);
    await testClient.getApiRoot();

    console.log(`Authenticated for ReviewBoard: ${credentials.baseUrl}`);

    // Create SSE transport
    const transport = new SSEServerTransport("/mcp/message", res);

    // Store credentials in session
    const sessionId = Math.random().toString(36).substring(7);

    // Attach credentials to future requests (hacky but works with current SDK)
    transport.onMessage = ((originalHandler) => {
      return async (message: any) => {
        message.credentials = credentials;
        message.sessionId = sessionId;
        return originalHandler.call(transport, message);
      };
    })(transport.onMessage);

    // Connect MCP server to transport
    await mcpServer.connect(transport);

    console.log(`Session ${sessionId} connected`);

    // Cleanup on disconnect
    res.on("close", () => {
      console.log(`Session ${sessionId} disconnected`);
      activeClients.delete(sessionId);
    });

  } catch (error) {
    console.error("SSE connection error:", error);
    res.status(401).json({
      error: "Authentication failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Message endpoint for SSE transport
app.post("/mcp/message", async (req: Request, res: Response) => {
  // This is handled by SSEServerTransport
  res.status(405).json({ error: "Method not allowed" });
});

// Root endpoint - provide API info
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "ReviewBoard MCP Server",
    version: "1.0.0",
    transport: "http-sse",
    endpoints: {
      health: "/health",
      sse: "/mcp/sse",
    },
    documentation: "https://github.com/yourusername/reviewboard_mcp",
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found",
    message: `Endpoint ${req.path} not found`,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log("🚀 ReviewBoard MCP Server (HTTP Streaming)");
  console.log(`📡 Listening on http://${HOST}:${PORT}`);
  console.log(`🔗 SSE endpoint: http://${HOST}:${PORT}/mcp/sse`);
  console.log(`💚 Health check: http://${HOST}:${PORT}/health`);
  console.log("");
  console.log("Ready to accept connections!");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down gracefully...");
  process.exit(0);
});
