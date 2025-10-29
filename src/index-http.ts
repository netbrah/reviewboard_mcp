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
import { ReviewBoardClient } from "./reviewboard-client.js";

// Server configuration
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

  throw new Error("Unsupported authentication type. Use 'Bearer <token>', 'Token <token>', or 'Basic <base64>' format.");
}

/**
 * Create and configure an MCP server instance with all tools registered
 * This is called once per SSE connection
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
  // Tool Registration - All 17 tools
  // ============================================================================

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
        const client = ensureClient();
        const reviewRequest = await client.getReviewRequest(reviewRequestId);

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

  // Tool: Get reviews for a review request
  server.tool(
    "get_reviews",
    "Get reviews for a specific review request",
    {
      reviewRequestId: z.number().describe("ID of the review request"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching reviews: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Get diff files
  server.tool(
    "get_diff_files",
    "Get the files changed in a diff for a specific review request",
    {
      reviewRequestId: z.number().describe("ID of the review request"),
      diffRevision: z.number().optional().describe("Specific diff revision (latest if not specified)"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching diff files: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Get full diff patch
  server.tool(
    "get_full_diff_patch",
    "Get the complete unified diff patch for a review request",
    {
      reviewRequestId: z.number().describe("ID of the review request"),
      diffRevision: z.number().optional().describe("Specific diff revision (latest if not specified)"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching diff patch: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Get comprehensive comments analysis
  server.tool(
    "get_comprehensive_comments_analysis",
    "Get comprehensive analysis of all comments with file content annotations",
    {
      reviewRequestId: z.number().describe("ID of the review request"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting comments analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Get repositories
  server.tool(
    "get_repositories",
    "Get a list of repositories",
    {
      limit: z.number().min(1).max(200).default(25).describe("Number of results to return"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching repositories: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Get users
  server.tool(
    "get_users",
    "Get a list of users",
    {
      limit: z.number().min(1).max(200).default(25).describe("Number of results to return"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching users: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Search
  server.tool(
    "search",
    "Search across ReviewBoard content",
    {
      query: z.string().describe("Search query"),
      username: z.string().optional().describe("Search within specific user's content"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error performing search: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Get diff revisions
  server.tool(
    "get_diff_revisions",
    "List all diff revisions with summary and optionally include full patch differences between consecutive revisions",
    {
      reviewRequestId: z.number().describe("ID of the review request"),
      includePatchDiffs: z.boolean().optional().default(false).describe("Include full patch differences between consecutive revisions"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching diff revisions: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Get revision summary
  server.tool(
    "get_revision_summary",
    "Get detailed summary of a specific revision including files changed and statistics",
    {
      reviewRequestId: z.number().describe("ID of the review request"),
      revision: z.number().describe("Revision number to summarize"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching revision summary: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Get file at revision
  server.tool(
    "get_file_at_revision",
    "Get file content from a specific revision",
    {
      reviewRequestId: z.number().describe("ID of the review request"),
      filePath: z.string().describe("Path of the file to retrieve"),
      revisionNumber: z.number().describe("Revision number (1 = first revision)"),
      type: z.enum(["original", "patched"]).optional().default("patched").describe("Type of file to retrieve"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching file at revision: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Get review history
  server.tool(
    "get_review_history",
    "Get complete change history of the review request - who changed what and when",
    {
      reviewRequestId: z.number().describe("ID of the review request"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching review history: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Compare revisions
  server.tool(
    "compare_revisions",
    "Compare two revisions to see what changed between them",
    {
      reviewRequestId: z.number().describe("ID of the review request"),
      fromRevision: z.number().describe("Starting revision number"),
      toRevision: z.number().describe("Ending revision number"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error comparing revisions: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Get file history
  server.tool(
    "get_file_history",
    "Track how a specific file evolved across all revisions",
    {
      reviewRequestId: z.number().describe("ID of the review request"),
      filePath: z.string().describe("Path of the file to track"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching file history: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Get file revision history
  server.tool(
    "get_file_revision_history",
    "Get comprehensive revision history for a specific file including patch diffs between consecutive revisions",
    {
      reviewRequestId: z.number().describe("ID of the review request"),
      filePath: z.string().describe("Path of the file to track (supports partial matching)"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching file revision history: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool: Analyze comment resolution
  server.tool(
    "analyze_comment_resolution",
    "Analyze whether comments were addressed in subsequent revisions",
    {
      reviewRequestId: z.number().describe("ID of the review request"),
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error analyzing comment resolution: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

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
  const sessionId = Math.random().toString(36).substring(7);
  console.log(`[${sessionId}] New SSE connection`);

  try {
    // Extract and validate credentials
    const credentials = extractCredentials(req);

    // Test connection to ReviewBoard
    const reviewBoardClient = new ReviewBoardClient(credentials);
    await reviewBoardClient.getApiRoot();

    console.log(`[${sessionId}] Authenticated for ReviewBoard: ${credentials.baseUrl}`);

    // Create MCP server instance with all tools registered
    const mcpServer = createMcpServer(reviewBoardClient);

    // Create SSE transport
    const transport = new SSEServerTransport("/mcp/message", res);

    // Connect MCP server to transport
    await mcpServer.connect(transport);

    console.log(`[${sessionId}] Session connected and ready`);

    // Cleanup on disconnect
    res.on("close", () => {
      console.log(`[${sessionId}] Session disconnected`);
    });

  } catch (error) {
    console.error(`[${sessionId}] SSE connection error:`, error);
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
    documentation: "https://github.com/netbrah/reviewboard_mcp",
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
app.listen(Number(PORT), HOST, () => {
  console.log("🚀 ReviewBoard MCP Server (HTTP Streaming)");
  console.log(`📡 Listening on http://${HOST}:${PORT}`);
  console.log(`🔗 SSE endpoint: http://${HOST}:${PORT}/mcp/sse`);
  console.log(`💚 Health check: http://${HOST}:${PORT}/health`);
  console.log("");
  console.log("Ready to accept connections!");
  console.log("");
  console.log("Expected HTTP headers:");
  console.log("  Authorization: Bearer <reviewboard-api-token>");
  console.log("  X-ReviewBoard-URL: https://reviewboard.example.com");
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
