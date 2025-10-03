#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function getCompletePatch() {
  console.log("🔗 Connecting to ReviewBoard MCP Server...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"]
  });

  const client = new Client({
    name: "reviewboard-patch-client",
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

    console.log("\n📄 Getting complete unified diff patch for review request 902199...");

    // Get the full diff patch
    const patchResult = await client.callTool({
      name: "get_full_diff_patch",
      arguments: {
        reviewRequestId: 902199
      }
    });

    console.log("\n=== COMPLETE UNIFIED DIFF PATCH ===");
    console.log(patchResult.content[0].text);
    console.log("=== END OF PATCH ===");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("\n🏁 Disconnected from MCP server");
  }
}

getCompletePatch().catch(console.error);
