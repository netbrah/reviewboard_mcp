#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testImprovedCommentsFixed() {
  console.log("🔍 Testing improved comments with correct API token...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"]
  });

  const client = new Client({
    name: "test-improved",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log("Connected to MCP server");

    // Initialize with proper API token from environment
    console.log("\n1. Initializing ReviewBoard client...");
    const initResult = await client.callTool({
      name: 'initialize_reviewboard',
      arguments: {
        baseUrl: 'https://reviewboard.netapp.com',
        apiToken: process.env.REVIEWBOARD_API_TOKEN
      }
    });
    console.log("✅ Initialization successful");

    // Test the comments function with the original review request
    console.log("\n2. Testing comments function for review 882166...");
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

      console.log("\n=== COMMENTS BY FILE ===");
      for (const [fileName, comments] of Object.entries(data.comments_by_file)) {
        console.log(`\n📁 ${fileName}`);
        console.log(`   ${comments.length} comments`);

        comments.forEach((comment, index) => {
          console.log(`   Comment ${index + 1}:`);
          console.log(`     • ID: ${comment.id}`);
          console.log(`     • Line: ${comment.first_line}${comment.num_lines > 1 ? `-${comment.first_line + comment.num_lines - 1}` : ''}`);
          console.log(`     • Author: ${comment.review_info?.user || 'Unknown'}`);
          console.log(`     • Text: ${comment.text.substring(0, 100)}...`);
          if (comment.links?.filediff?.href) {
            console.log(`     • FileID from link: ${comment.links.filediff.href.match(/files\/(\d+)\//)?.[1] || 'N/A'}`);
          }
        });
      }

      console.log('\n=== SUMMARY ===');
      console.log(`Total comments: ${data.total_comments}`);
      console.log(`Files with comments: ${data.files_with_comments.length}`);
      console.log(`Files with unknown mapping: ${data.files_with_comments.filter(f => f.includes('Unknown')).length}`);
    }

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
    console.log("Client closed");
  }
}

testImprovedCommentsFixed();
