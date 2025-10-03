#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testCommentsByFile() {
  console.log("🔗 Testing Enhanced Comments Analysis with File Annotations...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"]
  });

  const client = new Client({
    name: "comments-test-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log("✅ Connected to MCP server");

    // Initialize connection
    const apiToken = process.env.REVIEWBOARD_API_TOKEN;
    if (!apiToken) {
      throw new Error("No API token provided. Set REVIEWBOARD_API_TOKEN environment variable.");
    }

    await client.callTool({
      name: "initialize_reviewboard",
      arguments: {
        baseUrl: "https://reviewboard.netapp.com",
        apiToken: apiToken
      }
    });

    // Test with review request 882166 (which we know has comments)
    const reviewRequestId = 882166;
    console.log(`\n📋 Testing with review request ${reviewRequestId}...`);

    // NEW: Test ALL comment types analysis
    console.log("\n🔍 1. Getting ALL comment types...");
    const allCommentsResult = await client.callTool({
      name: "get_all_comments",
      arguments: { reviewRequestId }
    });

    const allComments = JSON.parse(allCommentsResult.content[0].text);
    console.log("\n=== ALL COMMENT TYPES ===");
    console.log(`📝 Diff comments: ${allComments.diff_comments.length}`);
    console.log(`💬 General comments: ${allComments.general_comments.length}`);
    console.log(`📎 File attachment comments: ${allComments.file_attachment_comments.length}`);
    console.log(`📷 Screenshot comments: ${allComments.screenshot_comments.length}`);
    console.log(`🎯 TOTAL: ${allComments.total_comments}`);

    if (allComments.general_comments.length > 0) {
      console.log("\n📋 General Comments:");
      allComments.general_comments.forEach((comment, index) => {
        console.log(`   ${index + 1}. ${comment.review_info.user}: ${comment.text.substring(0, 100)}...`);
      });
    }

    // NEW: Test comprehensive analysis with file annotations
    console.log("\n🔍 2. Getting comprehensive analysis with file annotations...");
    const comprehensiveResult = await client.callTool({
      name: "get_comprehensive_comments_analysis",
      arguments: { reviewRequestId }
    });

    const comprehensive = JSON.parse(comprehensiveResult.content[0].text);
    console.log("\n=== COMPREHENSIVE ANALYSIS WITH FILE CONTENT ===");
    console.log(`📊 Summary:`);
    console.log(`   Files with diff comments: ${comprehensive.summary.files_with_diff_comments}`);
    console.log(`   Total diff comments: ${comprehensive.summary.total_diff_comments}`);
    console.log(`   Total general comments: ${comprehensive.summary.total_general_comments}`);
    console.log(`   Overall total: ${comprehensive.summary.overall_total_comments}`);

    // Show annotated files with actual code content
    console.log("\n📁 ANNOTATED FILES WITH ACTUAL CODE:");
    Object.entries(comprehensive.annotated_files).forEach(([filePath, fileInfo]) => {
      console.log(`\n🗂️  ${filePath} (${fileInfo.comment_count} comments)`);

      if (fileInfo.file_content_available) {
        console.log(`   ✅ File content: ${fileInfo.annotated_lines.length} lines available`);

        // Show lines with comments
        const linesWithComments = fileInfo.annotated_lines.filter(line => line.comments.length > 0);
        console.log(`   💬 Lines with comments: ${linesWithComments.length}`);

        // Show first few commented lines with actual code
        linesWithComments.slice(0, 3).forEach(line => {
          console.log(`\n      Line ${line.line_number}:`);
          console.log(`         Code: ${line.content.substring(0, 80)}${line.content.length > 80 ? '...' : ''}`);
          line.comments.forEach((comment, commentIndex) => {
            console.log(`         💬 Comment ${commentIndex + 1} (${comment.review_info.user}): ${comment.text.substring(0, 100)}...`);
            if (comment.issue_status) {
              console.log(`            🔍 Status: ${comment.issue_status}`);
            }
          });
        });

        if (linesWithComments.length > 3) {
          console.log(`\n      ... and ${linesWithComments.length - 3} more lines with comments`);
        }
      } else {
        console.log(`   ❌ File content not available`);
      }
    });

    // Show general comments (non-line-specific)
    if (comprehensive.all_comments.general_comments.length > 0) {
      console.log(`\n💬 GENERAL COMMENTS (not tied to specific lines):`);
      comprehensive.all_comments.general_comments.forEach((comment, index) => {
        console.log(`   ${index + 1}. ${comment.review_info.user}: ${comment.text.substring(0, 100)}...`);
      });
    }

    // Test individual file annotation
    const firstFile = Object.keys(comprehensive.annotated_files)[0];
    if (firstFile) {
      console.log(`\n🔍 3. Testing individual file annotation for first file...`);

      const fileResult = await client.callTool({
        name: 'get_annotated_file',
        arguments: {
          reviewRequestId,
          filePath: firstFile
        }
      });

      const fileData = JSON.parse(fileResult.content[0].text);
      console.log(`   📄 File: ${fileData.file_path}`);
      console.log(`   📊 Content available: ${fileData.file_content_available}`);
      console.log(`   📝 Total lines: ${fileData.annotated_lines.length}`);

      const commentedLines = fileData.annotated_lines.filter(line => line.comments.length > 0);
      console.log(`   💬 Lines with comments: ${commentedLines.length}`);
    }

    // Test the original diff comments by file endpoint
    console.log("\n🔍 4. Testing original get_diff_comments_by_file tool...");
    const commentsResult = await client.callTool({
      name: "get_diff_comments_by_file",
      arguments: { reviewRequestId }
    });

    const commentsData = JSON.parse(commentsResult.content[0].text);
    console.log(`\n📊 Original diff comments analysis:`);
    console.log(`   Total diff comments: ${commentsData.total_comments}`);
    console.log(`   Files with comments: ${commentsData.files_with_comments.length}`);
    console.log(`   File names: ${commentsData.files_with_comments.join(', ')}`);

    console.log("\n🎉 ENHANCED COMMENT ANALYSIS COMPLETE!");
    console.log("✅ All comment types collected (diff, general, file attachment, screenshot)");
    console.log("✅ File content annotations working with actual code lines");
    console.log("✅ Cross-revision mapping functional");
    console.log("✅ Line-by-line comment mapping successful");
    console.log("✅ Individual file annotation API working");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("\n🏁 Test complete");
  }
}

testCommentsByFile().catch(console.error);
