#!/usr/bin/env node
/**
 * ReviewBoard MCP Server - HTTP Streaming (Streamable HTTP) Transport
 *
 * This version uses the modern Streamable HTTP transport (POST /mcp endpoint)
 * for deployment as a web service that can be registered with LiteLLM proxy.
 *
 * Based on official MCP SDK documentation and examples.
 */

import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { ReviewBoardClient } from "./reviewboard-client.js";

// Server configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

// Express app setup
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Required for SSE streams
}));
app.use(cors({
  origin: '*', // Configure appropriately for production
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'mcp-session-id', 'Authorization', 'X-ReviewBoard-URL']
}));
app.use(express.json());

/**
 * Extract ReviewBoard credentials from HTTP request
 */
function extractCredentials(req: Request): {
  baseUrl: string;
  apiToken?: string;
  username?: string;
  password?: string;
} {
  // Base URL from custom header or environment
  const baseUrl = (req.headers["x-reviewboard-url"] as string) || process.env.REVIEWBOARD_BASE_URL;

  if (!baseUrl) {
    throw new Error("ReviewBoard base URL not provided. Use X-ReviewBoard-URL header or REVIEWBOARD_BASE_URL environment variable.");
  }

  // Authentication from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new Error("Authorization header required");
  }

  // Support different auth types
  if (authHeader.startsWith("Bearer ")) {
    const apiToken = authHeader.substring(7);
    return { baseUrl, apiToken };
  } else if (authHeader.startsWith("Basic ")) {
    const credentials = Buffer.from(authHeader.substring(6), "base64").toString();
    const [username, password] = credentials.split(":");
    return { baseUrl, username, password };
  } else if (authHeader.startsWith("Token ")) {
    const apiToken = authHeader.substring(6);
    return { baseUrl, apiToken };
  }

  throw new Error("Unsupported authentication type. Use 'Bearer <token>', 'Token <token>', or 'Basic <base64>' format.");
}

/**
 * Create and configure an MCP server instance with all tools registered
 */
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

  // Helper function to ensure client is available
  function ensureClient(): ReviewBoardClient {
    if (!reviewBoardClient) {
      throw new Error("ReviewBoard client not initialized");
    }
    return reviewBoardClient;
  }

  // ============================================================================
  // Tool Registration - All 17 tools using NEW API
  // ============================================================================

  // Tool: Get review requests
  server.registerTool(
    "get_review_requests",
    {
      title: "Get Review Requests",
      description: "Get a list of review requests with optional filtering",
      inputSchema: {
        status: z.enum(["pending", "submitted", "discarded", "all"]).optional().describe("Filter by status"),
        repository: z.string().optional().describe("Filter by repository name"),
        user: z.string().optional().describe("Filter by user"),
        limit: z.number().min(1).max(200).default(25).describe("Number of results to return"),
      },
    },
    async ({ status, repository, user, limit = 25 }) => {
      try {
        const client = ensureClient();
        const reviewRequests = await client.getReviewRequests({
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
          structuredContent: reviewRequests as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching review requests: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get review request details
  server.registerTool(
    "get_review_request",
    {
      title: "Get Review Request",
      description: "Get detailed information about a specific review request",
      inputSchema: {
        reviewRequestId: z.number().describe("ID of the review request"),
      },
    },
    async ({ reviewRequestId }) => {
      try {
        const client = ensureClient();
        const reviewRequest = await client.getReviewRequest(reviewRequestId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(reviewRequest, null, 2),
            },
          ],
          structuredContent: reviewRequest as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching review request: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get reviews for a review request
  server.registerTool(
    "get_reviews",
    {
      title: "Get Reviews",
      description: "Get all reviews for a specific review request",
      inputSchema: {
        reviewRequestId: z.number().describe("ID of the review request"),
      },
    },
    async ({ reviewRequestId }) => {
      try {
        const client = ensureClient();
        const reviews = await client.getReviews(reviewRequestId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(reviews, null, 2),
            },
          ],
          structuredContent: reviews as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching reviews: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get diff files
  server.registerTool(
    "get_diff_files",
    {
      title: "Get Diff Files",
      description: "Get the list of files changed in a diff",
      inputSchema: {
        reviewRequestId: z.number().describe("ID of the review request"),
        diffRevision: z.number().optional().describe("Specific diff revision (latest if not specified)"),
      },
    },
    async ({ reviewRequestId, diffRevision }) => {
      try {
        const client = ensureClient();
        const files = await client.getDiffFiles(reviewRequestId, diffRevision);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(files, null, 2),
            },
          ],
          structuredContent: files as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching diff files: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get full diff patch
  server.registerTool(
    "get_full_diff_patch",
    {
      title: "Get Full Diff Patch",
      description: "Get the complete unified diff patch for a review request",
      inputSchema: {
        reviewRequestId: z.number().describe("ID of the review request"),
        diffRevision: z.number().optional().describe("Specific diff revision (latest if not specified)"),
      },
    },
    async ({ reviewRequestId, diffRevision }) => {
      try {
        const client = ensureClient();
        const patch = await client.getFullDiffPatch(reviewRequestId, diffRevision);

        return {
          content: [
            {
              type: "text",
              text: patch,
            },
          ],
          structuredContent: { patch } as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching diff patch: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get comprehensive comments analysis
  server.registerTool(
    "get_comprehensive_comments_analysis",
    {
      title: "Get Comments Analysis",
      description: "Get comprehensive analysis of all comments with file content annotations",
      inputSchema: {
        reviewRequestId: z.number().describe("ID of the review request"),
      },
    },
    async ({ reviewRequestId }) => {
      try {
        const client = ensureClient();
        const analysis = await client.getComprehensiveCommentsAnalysis(reviewRequestId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(analysis, null, 2),
            },
          ],
          structuredContent: analysis as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting comments analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get repositories
  server.registerTool(
    "get_repositories",
    {
      title: "Get Repositories",
      description: "Get a list of repositories",
      inputSchema: {
        limit: z.number().min(1).max(200).default(25).describe("Number of results to return"),
      },
    },
    async ({ limit = 25 }) => {
      try {
        const client = ensureClient();
        const repositories = await client.getRepositories(limit);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(repositories, null, 2),
            },
          ],
          structuredContent: repositories as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching repositories: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get users
  server.registerTool(
    "get_users",
    {
      title: "Get Users",
      description: "Get a list of users",
      inputSchema: {
        limit: z.number().min(1).max(200).default(25).describe("Number of results to return"),
      },
    },
    async ({ limit = 25 }) => {
      try {
        const client = ensureClient();
        const users = await client.getUsers(limit);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(users, null, 2),
            },
          ],
          structuredContent: users as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching users: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Search
  server.registerTool(
    "search",
    {
      title: "Search",
      description: "Search across ReviewBoard content",
      inputSchema: {
        query: z.string().describe("Search query"),
        username: z.string().optional().describe("Search within specific user's content"),
      },
    },
    async ({ query, username }) => {
      try {
        const client = ensureClient();
        const results = await client.search(query, username);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
          structuredContent: results as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error performing search: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get diff revisions
  server.registerTool(
    "get_diff_revisions",
    {
      title: "Get Diff Revisions",
      description: "List all diff revisions with optional patch differences between consecutive revisions",
      inputSchema: {
        reviewRequestId: z.number().describe("ID of the review request"),
        includePatchDiffs: z.boolean().optional().default(false).describe("Include full patch differences between consecutive revisions"),
      },
    },
    async ({ reviewRequestId, includePatchDiffs = false }) => {
      try {
        const client = ensureClient();
        const revisions = await client.getDiffRevisions(reviewRequestId, includePatchDiffs);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(revisions, null, 2),
            },
          ],
          structuredContent: revisions as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching diff revisions: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get revision summary
  server.registerTool(
    "get_revision_summary",
    {
      title: "Get Revision Summary",
      description: "Get detailed summary of a specific revision including files changed and statistics",
      inputSchema: {
        reviewRequestId: z.number().describe("ID of the review request"),
        revision: z.number().describe("Revision number to summarize"),
      },
    },
    async ({ reviewRequestId, revision }) => {
      try {
        const client = ensureClient();
        const summary = await client.getRevisionSummary(reviewRequestId, revision);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summary, null, 2),
            },
          ],
          structuredContent: summary as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching revision summary: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get file at revision
  server.registerTool(
    "get_file_at_revision",
    {
      title: "Get File at Revision",
      description: "Get file content from a specific revision",
      inputSchema: {
        reviewRequestId: z.number().describe("ID of the review request"),
        filePath: z.string().describe("Path of the file to retrieve"),
        revisionNumber: z.number().describe("Revision number (1 = first revision)"),
        type: z.enum(["original", "patched"]).optional().default("patched").describe("Type of file to retrieve"),
      },
    },
    async ({ reviewRequestId, filePath, revisionNumber, type = "patched" }) => {
      try {
        const client = ensureClient();
        const fileContent = await client.getFileAtRevision(reviewRequestId, filePath, revisionNumber, type);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(fileContent, null, 2),
            },
          ],
          structuredContent: fileContent as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching file at revision: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get review history
  server.registerTool(
    "get_review_history",
    {
      title: "Get Review History",
      description: "Get complete change history of the review request",
      inputSchema: {
        reviewRequestId: z.number().describe("ID of the review request"),
      },
    },
    async ({ reviewRequestId }) => {
      try {
        const client = ensureClient();
        const history = await client.getReviewRequestHistory(reviewRequestId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(history, null, 2),
            },
          ],
          structuredContent: history as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching review history: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Compare revisions
  server.registerTool(
    "compare_revisions",
    {
      title: "Compare Revisions",
      description: "Compare two revisions to see what changed between them",
      inputSchema: {
        reviewRequestId: z.number().describe("ID of the review request"),
        fromRevision: z.number().describe("Starting revision number"),
        toRevision: z.number().describe("Ending revision number"),
      },
    },
    async ({ reviewRequestId, fromRevision, toRevision }) => {
      try {
        const client = ensureClient();
        const comparison = await client.compareRevisions(reviewRequestId, fromRevision, toRevision);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(comparison, null, 2),
            },
          ],
          structuredContent: comparison as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error comparing revisions: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get file history
  server.registerTool(
    "get_file_history",
    {
      title: "Get File History",
      description: "Track how a specific file evolved across all revisions",
      inputSchema: {
        reviewRequestId: z.number().describe("ID of the review request"),
        filePath: z.string().describe("Path of the file to track"),
      },
    },
    async ({ reviewRequestId, filePath }) => {
      try {
        const client = ensureClient();
        const history = await client.getFileHistory(reviewRequestId, filePath);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(history, null, 2),
            },
          ],
          structuredContent: history as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching file history: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get file revision history
  server.registerTool(
    "get_file_revision_history",
    {
      title: "Get File Revision History",
      description: "Get comprehensive revision history for a specific file including patch diffs",
      inputSchema: {
        reviewRequestId: z.number().describe("ID of the review request"),
        filePath: z.string().describe("Path of the file to track (supports partial matching)"),
      },
    },
    async ({ reviewRequestId, filePath }) => {
      try {
        const client = ensureClient();
        const history = await client.getFileRevisionHistory(reviewRequestId, filePath);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(history, null, 2),
            },
          ],
          structuredContent: history as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching file revision history: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Analyze comment resolution
  server.registerTool(
    "analyze_comment_resolution",
    {
      title: "Analyze Comment Resolution",
      description: "Analyze whether comments were addressed in subsequent revisions",
      inputSchema: {
        reviewRequestId: z.number().describe("ID of the review request"),
      },
    },
    async ({ reviewRequestId }) => {
      try {
        const client = ensureClient();
        const analysis = await client.analyzeCommentResolution(reviewRequestId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(analysis, null, 2),
            },
          ],
          structuredContent: analysis as any,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error analyzing comment resolution: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}

// ============================================================================
// HTTP Endpoints
// ============================================================================

// Health check endpoint (required for LiteLLM proxy and Kubernetes)
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "reviewboard-mcp-server",
    version: "1.0.0",
    transport: "streamable-http",
    timestamp: new Date().toISOString(),
  });
});

// Main MCP endpoint - POST /mcp
// This is the modern Streamable HTTP transport endpoint
app.post("/mcp", async (req: Request, res: Response) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] New MCP request`);

  try {
    // Extract and validate credentials from headers
    const credentials = extractCredentials(req);

    // Test connection to ReviewBoard
    const reviewBoardClient = new ReviewBoardClient(credentials);
    await reviewBoardClient.getApiRoot();

    console.log(`[${requestId}] Authenticated for ReviewBoard: ${credentials.baseUrl}`);

    // Create MCP server instance with all tools registered
    const mcpServer = createMcpServer(reviewBoardClient);

    // Create StreamableHTTP transport (stateless mode)
    // Use undefined sessionIdGenerator for stateless operation (recommended for most cases)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    // Cleanup on response close
    res.on("close", () => {
      transport.close().catch(err => {
        console.error(`[${requestId}] Error closing transport:`, err);
      });
    });

    // Connect MCP server to transport
    await mcpServer.connect(transport);

    // Handle the request using transport's handleRequest method
    // This handles all the protocol details automatically
    await transport.handleRequest(req, res, req.body);

    console.log(`[${requestId}] Request handled successfully`);

  } catch (error) {
    console.error(`[${requestId}] MCP request error:`, error);
    if (!res.headersSent) {
      res.status(error instanceof Error && error.message.includes("Authentication") ? 401 : 500).json({
        jsonrpc: "2.0",
        error: {
          code: error instanceof Error && error.message.includes("Authentication") ? -32000 : -32603,
          message: error instanceof Error ? error.message : "Internal server error"
        },
        id: null
      });
    }
  }
});

// Root endpoint - provide API info
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "ReviewBoard MCP Server",
    version: "1.0.0",
    transport: "streamable-http",
    protocol: "Model Context Protocol",
    endpoints: {
      health: "/health",
      mcp: "/mcp (POST)",
    },
    documentation: "https://github.com/netbrah/reviewboard_mcp",
    authentication: {
      type: "per-request",
      headers: {
        required: ["Authorization", "X-ReviewBoard-URL"],
        authorization_format: "Bearer <reviewboard-api-token>",
      },
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found",
    message: `Endpoint ${req.path} not found`,
    hint: "MCP endpoint is POST /mcp",
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error("Server error:", err);
  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
});

// Start server
app.listen(Number(PORT), HOST, () => {
  console.log("🚀 ReviewBoard MCP Server (Streamable HTTP Transport)");
  console.log(`📡 Listening on http://${HOST}:${PORT}`);
  console.log(`🔗 MCP endpoint: POST http://${HOST}:${PORT}/mcp`);
  console.log(`💚 Health check: GET http://${HOST}:${PORT}/health`);
  console.log("");
  console.log("✅ Using modern StreamableHTTPServerTransport");
  console.log("✅ All 17 tools registered with new API");
  console.log("");
  console.log("Required HTTP headers:");
  console.log("  Authorization: Bearer <reviewboard-api-token>");
  console.log("  X-ReviewBoard-URL: https://reviewboard.example.com");
  console.log("");
  console.log("Test with:");
  console.log("  npx @modelcontextprotocol/inspector");
  console.log("  Connect to: http://localhost:3000/mcp");
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
