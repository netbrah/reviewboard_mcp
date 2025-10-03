#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function debugFileContent() {
  console.log("🔍 Debugging file content retrieval...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"]
  });

  const client = new Client({
    name: "debug-file-content",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log("Connected to MCP server");

    // Initialize
    await client.callTool({
      name: 'initialize_reviewboard',
      arguments: {
        baseUrl: 'https://reviewboard.netapp.com',
        apiToken: process.env.REVIEWBOARD_API_TOKEN
      }
    });

    const reviewRequestId = 882166;

    // Get diff files to see what file IDs are available
    console.log("\\n1. Getting diff files...");
    const diffFilesResult = await client.callTool({
      name: 'get_diff_files',
      arguments: { reviewRequestId }
    });

    const diffFiles = JSON.parse(diffFilesResult.content[0].text);
    console.log(`Found ${diffFiles.files.length} files in latest diff:`);

    diffFiles.files.forEach((file, index) => {
      console.log(`   ${index + 1}. File ID: ${file.id}, Path: ${file.source_file}`);
    });

    // Try to get file content using existing tools
    if (diffFiles.files.length > 0) {
      const firstFile = diffFiles.files[0];
      console.log(`\\n2. Testing file content retrieval for file ${firstFile.id}...`);

      try {
        const originalFileResult = await client.callTool({
          name: 'get_original_file',
          arguments: {
            reviewRequestId: reviewRequestId,
            diffRevision: 2, // Latest diff revision
            fileDiffId: firstFile.id
          }
        });

        const originalContent = originalFileResult.content[0].text;
        console.log(`✅ Original file content retrieved (${originalContent.length} characters)`);
        console.log(`First 200 chars: ${originalContent.substring(0, 200)}...`);

      } catch (error) {
        console.log(`❌ Failed to get original file: ${error.message}`);

        // Try patched file
        try {
          const patchedFileResult = await client.callTool({
            name: 'get_patched_file',
            arguments: {
              reviewRequestId: reviewRequestId,
              diffRevision: 2,
              fileDiffId: firstFile.id
            }
          });

          const patchedContent = patchedFileResult.content[0].text;
          console.log(`✅ Patched file content retrieved (${patchedContent.length} characters)`);
          console.log(`First 200 chars: ${patchedContent.substring(0, 200)}...`);

        } catch (patchError) {
          console.log(`❌ Failed to get patched file: ${patchError.message}`);
        }
      }
    }

    // Check all diff revisions
    console.log("\\n3. Checking all diff revisions...");
    const diffsResult = await client.callTool({
      name: 'get_diffs',
      arguments: { reviewRequestId }
    });

    const diffs = JSON.parse(diffsResult.content[0].text);
    console.log(`Found ${diffs.diffs.length} diff revisions:`);

    for (const diff of diffs.diffs) {
      console.log(`\\n   Diff ${diff.id} (revision ${diff.revision}):`);

      try {
        const filesResult = await client.callTool({
          name: 'get_diff_files',
          arguments: {
            reviewRequestId: reviewRequestId,
            diffRevision: diff.id
          }
        });

        const files = JSON.parse(filesResult.content[0].text);
        console.log(`     ${files.files.length} files in this diff`);

        if (files.files.length > 0) {
          const testFile = files.files[0];
          console.log(`     Testing file ${testFile.id}: ${testFile.source_file}`);

          try {
            const contentResult = await client.callTool({
              name: 'get_patched_file',
              arguments: {
                reviewRequestId: reviewRequestId,
                diffRevision: diff.id,
                fileDiffId: testFile.id
              }
            });

            const content = contentResult.content[0].text;
            if (content && content.length > 0 && !content.includes("Error")) {
              console.log(`     ✅ Content available (${content.length} chars)`);
              console.log(`     First line: ${content.split('\\n')[0].substring(0, 100)}...`);
            } else {
              console.log(`     ❌ No content or error: ${content.substring(0, 100)}...`);
            }
          } catch (contentError) {
            console.log(`     ❌ Content error: ${contentError.message}`);
          }
        }
      } catch (filesError) {
        console.log(`     ❌ Files error: ${filesError.message}`);
      }
    }

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
  }
}

debugFileContent();
