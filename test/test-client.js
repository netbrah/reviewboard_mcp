#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

async function testMCPServer() {
  console.log("🧪 Testing ReviewBoard MCP Server...");

  // Spawn the MCP server process
  const serverProcess = spawn("node", ["build/index.js"], {
    stdio: ["pipe", "pipe", "inherit"]
  });

  // Create client transport using the server's stdio
  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"]
  });

  const client = new Client({
    name: "test-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log("✅ Connected to MCP server");

    // Test listing tools
    const tools = await client.listTools();
    console.log("🔧 Available tools:", tools.tools.map(t => t.name));

    // Test listing resources
    const resources = await client.listResources();
    console.log("📚 Available resources:", resources.resources.map(r => r.name));

    // Test listing prompts
    const prompts = await client.listPrompts();
    console.log("💭 Available prompts:", prompts.prompts.map(p => p.name));

    // Test reading the API docs resource
    try {
      const apiDocs = await client.readResource({ uri: "reviewboard://api-docs" });
      console.log("📖 API docs resource loaded successfully");
      console.log("   Content length:", apiDocs.contents[0].text.length, "characters");
    } catch (error) {
      console.error("❌ Failed to read API docs:", error.message);
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    await client.close();
    serverProcess.kill();
    console.log("🏁 Test completed");
  }
}

testMCPServer().catch(console.error);
