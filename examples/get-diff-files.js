#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function getFullDiffFromReviewBoard() {
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

    // Initialize ReviewBoard connection
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

    console.log("✅", initResult.content[0].text);

    // Get the files that changed in this diff
    console.log("\n📁 Fetching changed files for review request 902199...");
    const filesResult = await client.callTool({
      name: "get_diff_files",
      arguments: {
        reviewRequestId: 902199
      }
    });

    const filesData = JSON.parse(filesResult.content[0].text);

    console.log("\n=== FILES CHANGED ===");
    if (filesData.files && filesData.files.length > 0) {
      filesData.files.forEach((file, index) => {
        console.log(`\n${index + 1}. ${file.source_file} -> ${file.dest_file}`);
        console.log(`   Source revision: ${file.source_revision}`);
        console.log(`   Dest revision: ${file.dest_detail}`);
        console.log(`   Extra info: ${JSON.stringify(file.extra_data || {})}`);

        if (file.binary) {
          console.log("   [BINARY FILE]");
        } else {
          console.log(`   Status: ${file.status || 'modified'}`);
        }
      });

      console.log(`\n📊 Total files changed: ${filesData.files.length}`);
    } else {
      console.log("No files found in diff");
    }

    // Get review request summary
    console.log("\n=== REVIEW SUMMARY ===");
    const reviewRequest = await client.callTool({
      name: "get_review_request",
      arguments: {
        reviewRequestId: 902199
      }
    });

    const reviewData = JSON.parse(reviewRequest.content[0].text);
    console.log(`📋 ${reviewData.review_request.summary}`);
    console.log(`🔧 Bug: ${reviewData.review_request.bugs_closed.join(', ')}`);
    console.log(`✅ Status: ${reviewData.review_request.status} (approved: ${reviewData.review_request.approved})`);
    console.log(`🌿 Branch: ${reviewData.review_request.branch}`);

    if (reviewData.review_request.description) {
      console.log(`\n📝 Description:`);
      console.log(reviewData.review_request.description);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("\n🏁 Disconnected from MCP server");
  }
}

getFullDiffFromReviewBoard().catch(console.error);
