#!/usr/bin/env node

/**
 * Comprehensive ReviewBoard API Explorer
 *
 * This script tests ALL available ReviewBoard API endpoints to understand:
 * - What data structures exist
 * - What capabilities are available
 * - What new tools we should create
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from 'fs';

const REVIEW_REQUEST_ID = 882166;

async function exploreAPI() {
  console.log("🔍 COMPREHENSIVE REVIEWBOARD API EXPLORATION");
  console.log("=" .repeat(60));

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"],
    env: {
      REVIEWBOARD_BASE_URL: process.env.REVIEWBOARD_BASE_URL || "https://reviewboard.netapp.com",
      REVIEWBOARD_API_TOKEN: process.env.REVIEWBOARD_API_TOKEN
    }
  });

  const client = new Client({
    name: "reviewboard-api-explorer",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  const results = {
    timestamp: new Date().toISOString(),
    reviewRequestId: REVIEW_REQUEST_ID,
    endpoints: {},
    suggestedTools: []
  };

  try {
    await client.connect(transport);
    console.log("✅ Connected to MCP server\n");

    // ========================================================================
    // SECTION 1: CHANGES & REVISIONS (History tracking)
    // ========================================================================
    console.log("📋 SECTION 1: CHANGES & REVISIONS");
    console.log("-".repeat(60));

    // Get all diffs (revisions)
    console.log("\n1. Getting all diffs/revisions...");
    try {
      const response = await client.request({
        method: "tools/call",
        params: {
          name: "get_review_request",
          arguments: { reviewRequestId: REVIEW_REQUEST_ID }
        }
      });

      const reviewData = JSON.parse(response.content[0].text);
      const reviewRequest = reviewData.review_request;

      // Get diffs list
      if (reviewRequest.links?.diffs) {
        console.log(`   📊 Found diffs link: ${reviewRequest.links.diffs.href}`);
        results.endpoints.diffs_list = {
          endpoint: reviewRequest.links.diffs.href,
          purpose: "List all diff revisions for a review request",
          available: true,
          suggestedTool: "get_diff_revisions"
        };
      }

      // Get changes
      if (reviewRequest.links?.changes) {
        console.log(`   📝 Found changes link: ${reviewRequest.links.changes.href}`);
        results.endpoints.changes = {
          endpoint: reviewRequest.links.changes.href,
          purpose: "Get history of changes made to the review request",
          available: true,
          suggestedTool: "get_review_request_history"
        };
      }

      // Get last update
      if (reviewRequest.links?.last_update) {
        console.log(`   🕐 Found last_update link: ${reviewRequest.links.last_update.href}`);
        results.endpoints.last_update = {
          endpoint: reviewRequest.links.last_update.href,
          purpose: "Get the most recent update timestamp",
          available: true,
          suggestedTool: "get_last_update"
        };
      }

      results.endpoints.review_request_full = {
        sample: reviewRequest,
        hasChangesHistory: !!reviewRequest.links?.changes,
        hasDiffsList: !!reviewRequest.links?.diffs,
        hasLastUpdate: !!reviewRequest.links?.last_update
      };

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // ========================================================================
    // SECTION 2: COMMITS (for git/hg repos)
    // ========================================================================
    console.log("\n\n📦 SECTION 2: COMMITS");
    console.log("-".repeat(60));

    console.log("\n2. Checking for commit information...");
    try {
      // Try to get diff with commits info
      const diffResponse = await client.request({
        method: "tools/call",
        params: {
          name: "get_diff_files",
          arguments: { reviewRequestId: REVIEW_REQUEST_ID }
        }
      });

      const diffData = JSON.parse(diffResponse.content[0].text);

      // Check if there's a commits link
      if (diffData.links?.commits) {
        console.log(`   ✅ Commits available: ${diffData.links.commits.href}`);
        results.endpoints.commits = {
          endpoint: diffData.links.commits.href,
          purpose: "Get commit messages and metadata for each diff revision",
          available: true,
          suggestedTool: "get_commits"
        };
      } else {
        console.log(`   ℹ️  No commits link found (might not be git/hg based)`);
        results.endpoints.commits = {
          available: false,
          reason: "Not a git/hg repository or no commits attached"
        };
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // ========================================================================
    // SECTION 3: FILE HISTORY (per-file across revisions)
    // ========================================================================
    console.log("\n\n📁 SECTION 3: FILE CONTENT ACROSS REVISIONS");
    console.log("-".repeat(60));

    console.log("\n3. Testing file content access across revisions...");
    try {
      const filesResponse = await client.request({
        method: "tools/call",
        params: {
          name: "get_diff_files",
          arguments: { reviewRequestId: REVIEW_REQUEST_ID }
        }
      });

      const filesData = JSON.parse(filesResponse.content[0].text);

      if (filesData.files && filesData.files.length > 0) {
        const firstFile = filesData.files[0];
        console.log(`   📄 Testing with file: ${firstFile.source_file}`);
        console.log(`   📄 File ID: ${firstFile.id}`);

        results.endpoints.file_across_revisions = {
          purpose: "Access original/patched file content from specific revisions",
          available: true,
          endpoints: {
            original: firstFile.links?.original_file?.href,
            patched: firstFile.links?.patched_file?.href
          },
          suggestedTool: "get_file_at_revision"
        };

        console.log(`   ✅ Can access file content at different revisions`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // ========================================================================
    // SECTION 4: STATUS UPDATES (CI/CD integration)
    // ========================================================================
    console.log("\n\n🔧 SECTION 4: STATUS UPDATES & CI/CD");
    console.log("-".repeat(60));

    console.log("\n4. Checking for status updates (CI/CD results)...");
    try {
      const reviewResponse = await client.request({
        method: "tools/call",
        params: {
          name: "get_review_request",
          arguments: { reviewRequestId: REVIEW_REQUEST_ID }
        }
      });

      const reviewData = JSON.parse(reviewResponse.content[0].text);
      const reviewRequest = reviewData.review_request;

      if (reviewRequest.links?.status_updates) {
        console.log(`   ✅ Status updates available: ${reviewRequest.links.status_updates.href}`);
        results.endpoints.status_updates = {
          endpoint: reviewRequest.links.status_updates.href,
          purpose: "Get CI/CD build results, lint checks, test status",
          available: true,
          suggestedTool: "get_status_updates"
        };
      } else {
        console.log(`   ℹ️  No status updates found`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // ========================================================================
    // SECTION 5: SCREENSHOTS & FILE ATTACHMENTS
    // ========================================================================
    console.log("\n\n🖼️  SECTION 5: SCREENSHOTS & FILE ATTACHMENTS");
    console.log("-".repeat(60));

    console.log("\n5. Checking for screenshots and file attachments...");
    try {
      const reviewResponse = await client.request({
        method: "tools/call",
        params: {
          name: "get_review_request",
          arguments: { reviewRequestId: REVIEW_REQUEST_ID }
        }
      });

      const reviewData = JSON.parse(reviewResponse.content[0].text);
      const reviewRequest = reviewData.review_request;

      if (reviewRequest.links?.screenshots) {
        console.log(`   📷 Screenshots available: ${reviewRequest.links.screenshots.href}`);
        results.endpoints.screenshots = {
          endpoint: reviewRequest.links.screenshots.href,
          purpose: "Get screenshots attached to review",
          available: true,
          suggestedTool: "get_screenshots"
        };
      }

      if (reviewRequest.links?.file_attachments) {
        console.log(`   📎 File attachments available: ${reviewRequest.links.file_attachments.href}`);
        results.endpoints.file_attachments = {
          endpoint: reviewRequest.links.file_attachments.href,
          purpose: "Get non-diff files attached to review",
          available: true,
          suggestedTool: "get_file_attachments"
        };
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // ========================================================================
    // SECTION 6: REVIEW GROUPS & PEOPLE
    // ========================================================================
    console.log("\n\n👥 SECTION 6: REVIEWERS & GROUPS");
    console.log("-".repeat(60));

    console.log("\n6. Analyzing reviewer information...");
    try {
      const reviewResponse = await client.request({
        method: "tools/call",
        params: {
          name: "get_review_request",
          arguments: { reviewRequestId: REVIEW_REQUEST_ID }
        }
      });

      const reviewData = JSON.parse(reviewResponse.content[0].text);
      const reviewRequest = reviewData.review_request;

      console.log(`   👤 Target people: ${reviewRequest.target_people?.length || 0}`);
      console.log(`   👥 Target groups: ${reviewRequest.target_groups?.length || 0}`);
      console.log(`   ✅ Approved: ${reviewRequest.approved}`);
      console.log(`   🚢 Ship It count: ${reviewRequest.ship_it_count}`);

      results.endpoints.reviewer_info = {
        available: true,
        data: {
          target_people: reviewRequest.target_people,
          target_groups: reviewRequest.target_groups,
          approved: reviewRequest.approved,
          ship_it_count: reviewRequest.ship_it_count
        },
        suggestedTool: "get_reviewer_summary"
      };

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // ========================================================================
    // ANALYSIS & SUGGESTIONS
    // ========================================================================
    console.log("\n\n💡 SUGGESTED NEW MCP TOOLS");
    console.log("=".repeat(60));

    const suggestions = [
      {
        name: "get_diff_revisions",
        description: "List all diff revisions with summary",
        useCases: ["How many revisions?", "What changed in each revision?"],
        priority: "HIGH",
        implementation: "GET /api/review-requests/{id}/diffs/"
      },
      {
        name: "get_revision_summary",
        description: "Get detailed summary of a specific revision",
        useCases: ["Summarize revision 2", "What files changed in rev 3?"],
        priority: "HIGH",
        implementation: "GET /api/review-requests/{id}/diffs/{revision}/"
      },
      {
        name: "get_file_at_revision",
        description: "Get file content at specific revision",
        useCases: ["Show file X from 2 revisions ago", "Compare file across revisions"],
        priority: "HIGH",
        implementation: "GET /api/review-requests/{id}/diffs/{revision}/files/{file_id}/patched-file/"
      },
      {
        name: "get_review_history",
        description: "Get complete change history of review request",
        useCases: ["Show me the history", "What changed over time?"],
        priority: "MEDIUM",
        implementation: "GET /api/review-requests/{id}/changes/"
      },
      {
        name: "get_commits",
        description: "Get commit messages for each revision",
        useCases: ["Show commit messages", "Summarize all commits"],
        priority: "MEDIUM",
        implementation: "GET /api/review-requests/{id}/diffs/{revision}/commits/"
      },
      {
        name: "compare_revisions",
        description: "Compare two specific revisions",
        useCases: ["What changed between rev 1 and 3?", "Diff rev 2 vs 4"],
        priority: "MEDIUM",
        implementation: "Composite: get both revisions and compare"
      },
      {
        name: "get_status_updates",
        description: "Get CI/CD build status and checks",
        useCases: ["Did tests pass?", "What's the build status?"],
        priority: "LOW",
        implementation: "GET /api/review-requests/{id}/status-updates/"
      },
      {
        name: "get_file_history",
        description: "Track how a specific file evolved across revisions",
        useCases: ["Show history of file X", "How did this file change?"],
        priority: "LOW",
        implementation: "Composite: get file from all revisions"
      }
    ];

    results.suggestedTools = suggestions;

    suggestions.forEach((tool, index) => {
      console.log(`\n${index + 1}. ${tool.name} [${tool.priority}]`);
      console.log(`   📝 ${tool.description}`);
      console.log(`   💬 Use cases:`);
      tool.useCases.forEach(uc => console.log(`      - "${uc}"`));
      console.log(`   🔧 ${tool.implementation}`);
    });

    // ========================================================================
    // SAVE RESULTS
    // ========================================================================
    const outputFile = `reviewboard-api-exploration-${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n\n💾 Full exploration results saved to: ${outputFile}`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log("\n\n📊 EXPLORATION SUMMARY");
    console.log("=".repeat(60));

    const availableEndpoints = Object.values(results.endpoints).filter(e => e.available !== false).length;
    console.log(`✅ Discovered ${availableEndpoints} available API capabilities`);
    console.log(`💡 Suggested ${suggestions.length} new MCP tools`);

    console.log("\n🎯 RECOMMENDED PRIORITY");
    console.log("HIGH priority (implement first):");
    suggestions.filter(s => s.priority === "HIGH").forEach(s => {
      console.log(`   - ${s.name}: ${s.description}`);
    });

  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    console.error(error.stack);
  } finally {
    await client.close();
    console.log("\n🏁 Exploration complete");
  }
}

exploreAPI().catch(console.error);
