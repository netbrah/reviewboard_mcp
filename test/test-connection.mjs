#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testConnection() {
  console.log("🔍 Testing basic connection...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"]
  });

  const client = new Client({
    name: "test-connection",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log("Connected to MCP server");

    // Test basic API call with same credentials that worked before
    const result = await client.callTool({
      name: 'get_review_request',
      arguments: {
        baseUrl: 'https://reviewboard.netapp.com',
        username: 'palanisd',
        apiToken: 'f4064a8b8a9a1e0d29d7a8a0f3a7d5b9f1c2e3d4',
        reviewRequestId: 882166
      }
    });

    console.log("✅ Basic API call works!");
    console.log("Now testing the improved comments function...");

    // Test the improved comments function
    const commentsResult = await client.callTool({
      name: 'get_diff_comments_by_file',
      arguments: {
        baseUrl: 'https://reviewboard.netapp.com',
        username: 'palanisd',
        apiToken: 'f4064a8b8a9a1e0d29d7a8a0f3a7d5b9f1c2e3d4',
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

testConnection();
