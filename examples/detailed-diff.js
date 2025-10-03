#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function getDetailedDiffFromReviewBoard() {
  console.log("🔗 Connecting to ReviewBoard MCP Server...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"]
  });

  const client = new Client({
    name: "reviewboard-test-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log("✅ Connected to MCP server");

    // Step 1: Initialize ReviewBoard connection
    console.log("🔧 Initializing ReviewBoard connection...");

    const apiToken = process.env.REVIEWBOARD_API_TOKEN;
    if (!apiToken) {
      throw new Error("No API token provided. Set REVIEWBOARD_API_TOKEN environment variable.");
    }

    const initResult = await client.callTool({
      name: "initialize_reviewboard",
      arguments: {
        baseUrl: "https://reviewboard.netapp.com",
        apiToken: apiToken
      }
    });

    console.log("Init result:", initResult.content[0].text);

    // Step 2: Get the diff (which includes file details)
    console.log("📄 Fetching detailed diff for review request 902199...");
    const diffResult = await client.callTool({
      name: "get_diff",
      arguments: {
        reviewRequestId: 902199
      }
    });

    const diffData = JSON.parse(diffResult.content[0].text);
    console.log("\n=== DIFF SUMMARY ===");
    console.log(`Diff ID: ${diffData.diff.id}`);
    console.log(`Revision: ${diffData.diff.revision}`);
    console.log(`Timestamp: ${diffData.diff.timestamp}`);

    // Try to get file list from the diff
    console.log("\n=== ATTEMPTING TO GET FILE DETAILS ===");

    // The diff metadata shows we need to call the files API
    // Let's make a direct API call to get the files
    if (diffData.diff.links.files) {
      console.log("Files endpoint:", diffData.diff.links.files.href);

      // For now, let's get the review request details to see what files changed
      console.log("\n=== REVIEW REQUEST SUMMARY ===");
      const reviewRequest = await client.callTool({
        name: "get_review_request",
        arguments: {
          reviewRequestId: 902199
        }
      });

      const reviewData = JSON.parse(reviewRequest.content[0].text);
      console.log(`Summary: ${reviewData.review_request.summary}`);
      console.log(`Description: ${reviewData.review_request.description}`);
      console.log(`Status: ${reviewData.review_request.status}`);
      console.log(`Branch: ${reviewData.review_request.branch}`);
      console.log(`Bug: ${reviewData.review_request.bugs_closed.join(', ')}`);
      console.log(`Approved: ${reviewData.review_request.approved}`);
      console.log(`Ship It Count: ${reviewData.review_request.ship_it_count}`);

      console.log("\n=== TARGET REVIEWERS ===");
      reviewData.review_request.target_people.forEach(person => {
        console.log(`- ${person.title}`);
      });

      console.log("\n=== TARGET GROUPS ===");
      reviewData.review_request.target_groups.forEach(group => {
        console.log(`- ${group.title}`);
      });
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("🏁 Disconnected from MCP server");
  }
}

getDetailedDiffFromReviewBoard().catch(console.error);
