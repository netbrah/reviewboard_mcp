#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function getDiffFromReviewBoard() {
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

    // Check for environment variables first
    const apiToken = process.env.REVIEWBOARD_API_TOKEN;
    const username = process.env.REVIEWBOARD_USERNAME;
    const password = process.env.REVIEWBOARD_PASSWORD;

    let authArgs = {
      baseUrl: "https://reviewboard.netapp.com"
    };

    if (apiToken) {
      authArgs.apiToken = apiToken;
      console.log("   Using API token from environment");
    } else if (username && password) {
      authArgs.username = username;
      authArgs.password = password;
      console.log("   Using username/password from environment");
    } else {
      throw new Error("No authentication provided. Set REVIEWBOARD_API_TOKEN or REVIEWBOARD_USERNAME/REVIEWBOARD_PASSWORD environment variables.");
    }

    const initResult = await client.callTool({
      name: "initialize_reviewboard",
      arguments: authArgs
    });

    console.log("Init result:", initResult.content[0].text);

    // Step 2: Get the specific review request details
    console.log("📋 Fetching review request 902199...");
    const reviewRequest = await client.callTool({
      name: "get_review_request",
      arguments: {
        reviewRequestId: 902199
      }
    });

    console.log("Review Request:", reviewRequest.content[0].text);

    // Step 3: Get the diff
    console.log("📄 Fetching diff for review request 902199...");
    const diffResult = await client.callTool({
      name: "get_diff",
      arguments: {
        reviewRequestId: 902199
      }
    });

    console.log("Diff:", diffResult.content[0].text);

  } catch (error) {
    console.error("❌ Error:", error.message);

    if (error.message.includes("not initialized")) {
      console.log("\n💡 To use this tool, you need to provide authentication credentials:");
      console.log("   Either set environment variables:");
      console.log("   export REVIEWBOARD_API_TOKEN='your-api-token'");
      console.log("   export REVIEWBOARD_USERNAME='your-username'");
      console.log("   export REVIEWBOARD_PASSWORD='your-password'");
      console.log("\n   Or modify the script to include your credentials directly.");
    }
  } finally {
    await client.close();
    console.log("🏁 Disconnected from MCP server");
  }
}

getDiffFromReviewBoard().catch(console.error);
