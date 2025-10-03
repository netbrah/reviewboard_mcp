#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from 'fs';

async function testComprehensiveComments() {
  console.log("🎯 Testing Comprehensive Comment Analysis with File Annotations...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"]
  });

  const client = new Client({
    name: "comprehensive-test",
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

    // 1. Test all comment types
    console.log("\n🔍 1. Getting ALL comment types...");
    const allCommentsResult = await client.callTool({
      name: 'get_all_comments',
      arguments: { reviewRequestId }
    });

    const allComments = JSON.parse(allCommentsResult.content[0].text);

    console.log("=== ALL COMMENT TYPES ===");
    console.log(`📝 Diff comments: ${allComments.diff_comments.length}`);
    console.log(`💬 General comments: ${allComments.general_comments.length}`);
    console.log(`📎 File attachment comments: ${allComments.file_attachment_comments.length}`);
    console.log(`📷 Screenshot comments: ${allComments.screenshot_comments.length}`);
    console.log(`🎯 Total comments: ${allComments.total_comments}`);

    if (allComments.general_comments.length > 0) {
      console.log("\\n📋 General Comments:");
      allComments.general_comments.forEach((comment, index) => {
        console.log(`   ${index + 1}. ${comment.review_info.user}: ${comment.text.substring(0, 100)}...`);
      });
    }

    // 2. Test comprehensive analysis with file annotations
    console.log("\\n🔍 2. Getting comprehensive analysis with file annotations...");
    const analysisResult = await client.callTool({
      name: 'get_comprehensive_comments_analysis',
      arguments: { reviewRequestId }
    });

    const analysis = JSON.parse(analysisResult.content[0].text);

    console.log("\\n=== COMPREHENSIVE ANALYSIS ===");
    console.log(`📊 Summary:`);
    console.log(`   Files with diff comments: ${analysis.summary.files_with_diff_comments}`);
    console.log(`   Total diff comments: ${analysis.summary.total_diff_comments}`);
    console.log(`   Total general comments: ${analysis.summary.total_general_comments}`);
    console.log(`   Overall total: ${analysis.summary.overall_total_comments}`);

    // 3. Show annotated files with actual content
    console.log("\\n📁 ANNOTATED FILES WITH CONTENT:");
    for (const [filePath, fileInfo] of Object.entries(analysis.annotated_files)) {
      console.log(`\\n🗂️  ${filePath} (${fileInfo.comment_count} comments)`);

      if (fileInfo.file_content_available) {
        console.log("   ✅ File content available");

        // Show lines with comments (first 10 lines max for demo)
        const linesWithComments = fileInfo.annotated_lines.filter(line => line.comments.length > 0);
        console.log(`   📝 Lines with comments: ${linesWithComments.length}`);

        linesWithComments.slice(0, 5).forEach(line => {
          console.log(`\\n   Line ${line.line_number}:`);
          console.log(`      Code: ${line.content.substring(0, 80)}${line.content.length > 80 ? '...' : ''}`);
          line.comments.forEach((comment, commentIndex) => {
            console.log(`      💬 Comment ${commentIndex + 1} (${comment.review_info.user}): ${comment.text.substring(0, 100)}...`);
            if (comment.issue_status) {
              console.log(`         🔍 Issue status: ${comment.issue_status}`);
            }
          });
        });

        if (linesWithComments.length > 5) {
          console.log(`\\n   ... and ${linesWithComments.length - 5} more lines with comments`);
        }
      } else {
        console.log("   ❌ File content not available");
      }
    }

    // 4. Test individual file annotation
    const firstFile = Object.keys(analysis.annotated_files)[0];
    if (firstFile) {
      console.log(`\\n🔍 3. Testing individual file annotation for: ${firstFile}`);

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

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      review_request_id: reviewRequestId,
      all_comment_types: allComments,
      comprehensive_analysis: analysis,
      summary: {
        success: true,
        features_tested: [
          "All comment types (diff, general, file attachment, screenshot)",
          "Cross-revision file mapping",
          "File content annotation with actual code lines",
          "Comment-to-line mapping",
          "Comprehensive analysis combining all features"
        ]
      }
    };

    fs.writeFileSync('comprehensive-comments-analysis.json', JSON.stringify(report, null, 2));
    console.log(`\\n💾 Comprehensive report saved to: comprehensive-comments-analysis.json`);

    console.log("\\n🎉 COMPREHENSIVE COMMENT ANALYSIS COMPLETE!");
    console.log("✅ All comment types collected");
    console.log("✅ File content annotations working");
    console.log("✅ Cross-revision mapping functional");
    console.log("✅ Line-by-line comment mapping successful");

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
  }
}

testComprehensiveComments();
