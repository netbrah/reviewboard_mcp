#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testProperWorkflow() {
  console.log("🔍 Testing proper MCP workflow...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"]
  });

  const client = new Client({
    name: "test-workflow",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log("Connected to MCP server");

    // Step 1: Initialize the client (match the working debug script pattern)
    console.log("\n1. Initializing ReviewBoard client...");
    const initResult = await client.callTool({
      name: 'initialize_reviewboard',
      arguments: {
        baseUrl: 'https://reviewboard.netapp.com',
        apiToken: 'f4064a8b8a9a1e0d29d7a8a0f3a7d5b9f1c2e3d4'
      }
    });
    console.log("✅ Initialization result:", initResult.content[0].text);

    // Step 2: Test a simple API call
    console.log("\n2. Testing basic review request call...");
    const reviewResult = await client.callTool({
      name: 'get_review_request',
      arguments: {
        reviewRequestId: 882166
      }
    });
    console.log("✅ Review request call works!");

    // Step 3: Test the comments function (with old parameters if it still uses ensureClient)
    console.log("\n3. Testing comments function...");
    const commentsResult = await client.callTool({
      name: 'get_diff_comments_by_file',
      arguments: {
        reviewRequestId: 882166
      }
    });

    const data = JSON.parse(commentsResult.content[0].text);

    if (data.error) {
      console.log("❌ Error in comments function:", data.message);
    } else {
      console.log("✅ Comments function works!");
      console.log(`Files with comments: ${data.files_with_comments.length}`);
      console.log(`Total comments: ${data.total_comments}`);
      console.log(`Files mapped: ${data.debug_info?.total_files_mapped || 'Unknown'}`);

      // Show first few file names
      console.log("Files with comments:");
      data.files_with_comments.slice(0, 3).forEach(file => {
        console.log(`  - ${file} (${data.comments_by_file[file].length} comments)`);
      });
    }

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
    console.log("Client closed");
  }
}

testProperWorkflow();
