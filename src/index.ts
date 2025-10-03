#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ReviewBoardClient } from "./reviewboard-client.js";

// Server configuration schema
const ConfigSchema = z.object({
  baseUrl: z.string().url(),
  username: z.string().optional(),
  password: z.string().optional(),
  apiToken: z.string().optional(),
});

type Config = z.infer<typeof ConfigSchema>;

// Initialize the MCP server
const server = new McpServer({
  name: "reviewboard-mcp-server",
  version: "1.0.0",
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
});

let reviewBoardClient: ReviewBoardClient | null = null;

// Helper function to ensure client is initialized
function ensureClient(): ReviewBoardClient {
  if (!reviewBoardClient) {
    throw new Error("ReviewBoard client not initialized. Please provide configuration.");
  }
  return reviewBoardClient;
}

// Auto-initialize from environment variables
async function autoInitialize(): Promise<void> {
  const baseUrl = process.env.REVIEWBOARD_BASE_URL;
  const apiToken = process.env.REVIEWBOARD_API_TOKEN;
  const username = process.env.REVIEWBOARD_USERNAME;
  const password = process.env.REVIEWBOARD_PASSWORD;

  if (!baseUrl) {
    console.error("⚠️  REVIEWBOARD_BASE_URL not set. Client will need manual initialization.");
    return;
  }

  if (!apiToken && (!username || !password)) {
    console.error("⚠️  No authentication credentials found. Set REVIEWBOARD_API_TOKEN or REVIEWBOARD_USERNAME/REVIEWBOARD_PASSWORD.");
    return;
  }

  try {
    console.error(`🔄 Initializing ReviewBoard client for ${baseUrl}...`);

    const config: Config = {
      baseUrl,
      username,
      password,
      apiToken,
    };

    reviewBoardClient = new ReviewBoardClient(config);

    // Test the connection
    await reviewBoardClient.getApiRoot();

    console.error(`✅ Successfully connected to ReviewBoard at ${baseUrl}`);
    if (apiToken) {
      console.error(`   Authentication: API Token (${apiToken.substring(0, 10)}...)`);
    } else {
      console.error(`   Authentication: Username/Password (${username})`);
    }
  } catch (error) {
    console.error(`❌ Failed to connect to ReviewBoard at ${baseUrl}:`);
    console.error(`   Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    console.error(`   The server will continue running, but tools will fail until initialized.`);
    reviewBoardClient = null;
  }
}

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

// Tool: Get files in a diff for a review request
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
            text: `Error fetching full diff patch: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  }
);

// Tool: Get repositories
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
            text: JSON.stringify({
              error: true,
              message: `Error fetching comprehensive analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
              all_comments: {
                diff_comments: [],
                general_comments: [],
                file_attachment_comments: [],
                screenshot_comments: [],
                total_comments: 0
              },
              annotated_files: {},
              summary: {
                files_with_diff_comments: 0,
                total_diff_comments: 0,
                total_general_comments: 0,
                total_file_attachment_comments: 0,
                total_screenshot_comments: 0,
                overall_total_comments: 0
              }
            }, null, 2),
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

// Tool: Search functionality
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

// ============================================================================
// REVISION & HISTORY TOOLS (New capabilities for tracking changes)
// ============================================================================

// Tool: Get all diff revisions
server.tool(
  "get_diff_revisions",
  "List all diff revisions with summary and optionally include full patch differences between consecutive revisions",
  {
    reviewRequestId: z.number().describe("ID of the review request"),
    includePatchDiffs: z.boolean().optional().describe("Include full patch differences between consecutive revisions (default: false)"),
  },
  async ({ reviewRequestId, includePatchDiffs }) => {
    try {
      const client = ensureClient();
      const revisions = await client.getDiffRevisions(reviewRequestId, includePatchDiffs || false);

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

// Tool: Get file at specific revision
server.tool(
  "get_file_at_revision",
  "Get file content from a specific revision - e.g., 'Show file X from 2 revisions ago'",
  {
    reviewRequestId: z.number().describe("ID of the review request"),
    filePath: z.string().describe("Path of the file to retrieve"),
    revisionNumber: z.number().describe("Revision number (1 = first revision)"),
    type: z.enum(["original", "patched"]).optional().default("patched").describe("Get original (before) or patched (after) version"),
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

// Tool: Get review request history
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

// Tool: Get file revision history with patches
server.tool(
  "get_file_revision_history",
  "Get comprehensive revision history for a specific file including patch diffs between consecutive revisions - shows how the file changed from revision to revision",
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
  "Analyze whether comments were addressed in subsequent revisions - answers 'Were all comments addressed?' or 'Did the author fix the issues?'",
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

// Resource: ReviewBoard API documentation
server.resource(
  "reviewboard://api-docs",
  "reviewboard://api-docs",
  {
    description: "ReviewBoard API documentation and endpoints",
    mimeType: "application/json"
  },
  async () => {
    const apiDocs = {
      name: "ReviewBoard API",
      description: "REST API for ReviewBoard code review platform",
      endpoints: {
        review_requests: "GET /api/review-requests/ - List review requests",
        review_request: "GET /api/review-requests/{id}/ - Get specific review request",
        reviews: "GET /api/review-requests/{id}/reviews/ - Get reviews for a review request",
        diffs: "GET /api/review-requests/{id}/diffs/ - Get diffs for a review request",
        repositories: "GET /api/repositories/ - List repositories",
        users: "GET /api/users/ - List users",
        search: "GET /api/search/ - Search functionality",
      },
      authentication: {
        methods: ["API Token", "Username/Password"],
        headers: {
          api_token: "Authorization: token <api_token>",
          basic_auth: "Authorization: Basic <base64_encoded_credentials>",
        },
      },
    };

    return {
      contents: [
        {
          uri: "reviewboard://api-docs",
          text: JSON.stringify(apiDocs, null, 2),
          mimeType: "application/json"
        }
      ]
    };
  }
);

// Prompt: Review request analysis
server.prompt(
  "analyze-review-request",
  "Analyze a review request for potential issues and improvements",
  {
    reviewRequestId: z.string().describe("ID of the review request to analyze")
  },
  async ({ reviewRequestId }) => {
    const messages = [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Please analyze the review request #${reviewRequestId}.

First, use the get_review_request tool to fetch the review request details, then get_reviews to fetch any existing reviews, and get_full_diff_patch to examine the code changes.

Provide an analysis covering:
1. Summary of the changes
2. Code quality assessment
3. Potential issues or concerns
4. Suggestions for improvement
5. Compliance with best practices

Be thorough but concise in your analysis.`,
        },
      },
    ];

    return { messages };
  }
);

// Prompt: Code review template
server.prompt(
  "code-review-template",
  "Generate a structured code review template",
  {
    reviewRequestId: z.string().describe("ID of the review request to review")
  },
  async ({ reviewRequestId }) => {
    const messages = [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Create a comprehensive code review for review request #${reviewRequestId}.

First, fetch the review request details and examine the full diff patch. Then provide a structured review with:

## Summary
- Brief description of changes
- Impact assessment

## Code Quality
- Architecture and design patterns
- Code clarity and maintainability
- Performance considerations

## Issues Found
- Critical issues (if any)
- Minor issues and suggestions
- Style and formatting notes

## Testing
- Test coverage assessment
- Suggestions for additional tests

## Security
- Security implications
- Potential vulnerabilities

## Recommendations
- Approval status recommendation
- Required changes before merge
- Optional improvements

Please be constructive and specific in your feedback.`,
        },
      },
    ];

    return { messages };
  }
);

// Main server execution
async function main() {
  console.error("🚀 ReviewBoard MCP Server starting...");
  console.error("");

  // Auto-initialize from environment variables
  await autoInitialize();
  console.error("");

  const transport = new StdioServerTransport();

  try {
    await server.connect(transport);
    console.error("✅ ReviewBoard MCP Server running on stdio");
    console.error("");
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Handle process termination
process.on("SIGINT", async () => {
  console.error("Received SIGINT, shutting down gracefully...");
  await server.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.error("Received SIGTERM, shutting down gracefully...");
  await server.close();
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
