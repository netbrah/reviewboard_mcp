#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testDifferentReview() {
  console.log("🔍 Testing with different review request...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"]
  });

  const client = new Client({
    name: "test-different",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log("Connected to MCP server");

    // Initialize with proper API token from environment
    console.log("\n0. Initializing ReviewBoard client...");
    const initResult = await client.callTool({
      name: 'initialize_reviewboard',
      arguments: {
        baseUrl: 'https://reviewboard.netapp.com',
        apiToken: process.env.REVIEWBOARD_API_TOKEN
      }
    });
    console.log("Initialization result:", initResult.content[0].text);

    // Try the review requests list first (might be less restricted)
    console.log("\n1. Getting review requests list...");
    const listResult = await client.callTool({
      name: 'get_review_requests',
      arguments: {}
    });

    const listData = JSON.parse(listResult.content[0].text);
    console.log(`Found ${listData.review_requests?.length || 0} review requests`);

    if (listData.review_requests && listData.review_requests.length > 0) {
      const firstReview = listData.review_requests[0];
      console.log(`First review: ID ${firstReview.id}, summary: ${firstReview.summary?.substring(0, 50)}...`);

      // Test with this review
      console.log(`\n2. Testing review request ${firstReview.id}...`);
      const reviewResult = await client.callTool({
        name: 'get_review_request',
        arguments: {
          reviewRequestId: firstReview.id
        }
      });
      console.log(`✅ Review ${firstReview.id} accessible`);
    }

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
    console.log("Client closed");
  }
}

testDifferentReview();
