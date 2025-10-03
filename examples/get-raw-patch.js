#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function getRawPatch() {
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

    // Step 1: Get the files that changed
    console.log("\n📁 Getting files for review request 902199...");
    const filesResult = await client.callTool({
      name: "get_diff_files",
      arguments: {
        reviewRequestId: 902199
      }
    });

    const filesData = JSON.parse(filesResult.content[0].text);

    console.log("=== FILES CHANGED ===");
    if (filesData.files && filesData.files.length > 0) {
      filesData.files.forEach((file, index) => {
        console.log(`\n${index + 1}. File: ${file.source_file}`);
        console.log(`   File Diff ID: ${file.id}`);
        console.log(`   Source Revision: ${file.source_revision}`);
        console.log(`   Dest Detail: ${file.dest_detail}`);
        console.log(`   Binary: ${file.binary || false}`);

        if (file.extra_data) {
          console.log(`   Lines Added: ${file.extra_data.insert_count || 0}`);
          console.log(`   Lines Deleted: ${file.extra_data.delete_count || 0}`);
          console.log(`   Lines Replaced: ${file.extra_data.replace_count || 0}`);
          console.log(`   Total Lines: ${file.extra_data.total_line_count || 0}`);
        }
      });

      // Step 2: Get raw patch for each file
      console.log("\n📄 Getting raw patch content...");

      for (let i = 0; i < filesData.files.length; i++) {
        const file = filesData.files[i];
        console.log(`\n=== RAW PATCH FOR ${file.source_file} ===`);

        try {
          // Get the diff revision from the original diff call
          const diffResult = await client.callTool({
            name: "get_diff",
            arguments: {
              reviewRequestId: 902199
            }
          });

          const diffData = JSON.parse(diffResult.content[0].text);
          const diffRevision = diffData.diff.revision;

          console.log(`Using diff revision: ${diffRevision}, file diff ID: ${file.id}`);

          // Try to get the raw patch
          const patchResult = await client.callTool({
            name: "get_file_patch",
            arguments: {
              reviewRequestId: 902199,
              diffRevision: diffRevision,
              fileDiffId: file.id
            }
          });

          console.log("Raw patch content:");
          console.log("==================");
          console.log(patchResult.content[0].text);
          console.log("==================");

        } catch (error) {
          console.log(`❌ Error getting patch for ${file.source_file}: ${error.message}`);

          // Fallback: try to get the diff context for the whole review
          console.log("\n🔄 Trying to get diff context for entire review...");
          try {
            const contextResult = await client.callTool({
              name: "get_diff_context",
              arguments: {
                reviewRequestId: 902199
              }
            });

            console.log("Diff context:");
            console.log("=============");
            console.log(contextResult.content[0].text);
            console.log("=============");
          } catch (contextError) {
            console.log(`❌ Error getting diff context: ${contextError.message}`);
          }
        }
      }

    } else {
      console.log("No files found in diff");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("\n🏁 Disconnected from MCP server");
  }
}

getRawPatch().catch(console.error);
