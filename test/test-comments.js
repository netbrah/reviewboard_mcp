#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testCommentsByFile() {
  console.log("🔗 Testing Comments by File functionality...");

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

    // Get comprehensive review summary
    console.log("\n🔍 Getting comprehensive review summary...");
    const summaryResult = await client.callTool({
      name: "get_review_summary",
      arguments: { reviewRequestId }
    });

    const summary = JSON.parse(summaryResult.content[0].text);

    console.log("\n=== REVIEW SUMMARY ===");
    console.log(`📄 Title: ${summary.review_request.summary}`);
    console.log(`👤 Submitter: ${summary.review_request.links?.submitter?.title}`);
    console.log(`📊 Status: ${summary.review_request.status}`);
    console.log(`✅ Approved: ${summary.review_request.approved}`);
    console.log(`🚢 Ship It Count: ${summary.summary.ship_it_count}/${summary.summary.total_reviews}`);

    console.log("\n=== STATISTICS ===");
    console.log(`📁 Files Changed: ${summary.summary.files_changed}`);
    console.log(`💬 Total Comments: ${summary.summary.total_comments}`);
    console.log(`📝 Files with Comments: ${summary.summary.files_with_comments}`);

    console.log("\n=== REVIEWS ===");
    summary.reviews.forEach((review, index) => {
      const user = review.links?.user?.title || 'Unknown';
      const shipIt = review.ship_it ? '✅ Ship It' : '💭 Comment';
      console.log(`${index + 1}. ${user}: ${shipIt} (${review.timestamp})`);
      if (review.body_top) {
        console.log(`   "${review.body_top}"`);
      }
    });

    console.log("\n=== FILES CHANGED ===");
    summary.files_changed.forEach((file, index) => {
      const stats = file.extra_data;
      console.log(`${index + 1}. ${file.source_file}`);
      console.log(`   Status: ${file.status}`);
      console.log(`   Changes: +${stats?.insert_count || 0} -${stats?.delete_count || 0} lines`);
    });

    if (summary.summary.total_comments > 0) {
      console.log("\n=== COMMENTS BY FILE ===");
      Object.entries(summary.comments_by_file).forEach(([fileName, comments]) => {
        console.log(`\n📄 ${fileName} (${comments.length} comments)`);
        comments.forEach((comment, index) => {
          console.log(`   ${index + 1}. ${comment.review_info.user} (${comment.review_info.timestamp}):`);
          console.log(`      Line ${comment.first_line || '?'}: ${comment.text || 'No text'}`);
          if (comment.issue_opened) {
            console.log(`      🔴 Issue opened`);
          }
        });
      });
    } else {
      console.log("\n💬 No diff comments found");
    }

    // NEW: Test comprehensive comment analysis with ALL comment types
    console.log("\n🔍 Testing comprehensive comment analysis (ALL TYPES + ANNOTATIONS)...");
    const comprehensiveResult = await client.callTool({
      name: "get_comprehensive_comments_analysis",
      arguments: { reviewRequestId }
    });

    const comprehensive = JSON.parse(comprehensiveResult.content[0].text);
    console.log(`\n📊 COMPREHENSIVE ANALYSIS:`);
    console.log(`   Diff comments: ${comprehensive.summary.total_diff_comments}`);
    console.log(`   General comments: ${comprehensive.summary.total_general_comments}`);
    console.log(`   File attachment comments: ${comprehensive.summary.total_file_attachment_comments}`);
    console.log(`   Screenshot comments: ${comprehensive.summary.total_screenshot_comments}`);
    console.log(`   TOTAL: ${comprehensive.summary.overall_total_comments}`);

    // Show annotated files with actual code content
    console.log(`\n📁 ANNOTATED FILES WITH ACTUAL CODE:`);
    Object.entries(comprehensive.annotated_files).forEach(([filePath, fileInfo]) => {
      console.log(`\n🗂️  ${filePath} (${fileInfo.comment_count} comments)`);

      if (fileInfo.file_content_available) {
        console.log(`   ✅ File content: ${fileInfo.annotated_lines.length} lines`);

        // Show lines with comments
        const linesWithComments = fileInfo.annotated_lines.filter(line => line.comments.length > 0);
        console.log(`   💬 Commented lines: ${linesWithComments.length}`);

        // Show first few commented lines with actual code
        linesWithComments.slice(0, 3).forEach(line => {
          console.log(`\n      Line ${line.line_number}:`);
          console.log(`         Code: ${line.content.substring(0, 80)}${line.content.length > 80 ? '...' : ''}`);
          line.comments.forEach((comment, commentIndex) => {
            console.log(`         💬 Comment ${commentIndex + 1} (${comment.review_info.user}): ${comment.text.substring(0, 100)}...`);
            if (comment.issue_status) {
              console.log(`            Status: ${comment.issue_status}`);
            }
          });
        });

        if (linesWithComments.length > 3) {
          console.log(`\n      ... and ${linesWithComments.length - 3} more commented lines`);
        }
      } else {
        console.log(`   ❌ File content not available`);
      }
    });

    // Show general comments (non-line-specific)
    if (comprehensive.all_comments.general_comments.length > 0) {
      console.log(`\n💬 GENERAL COMMENTS:`);
      comprehensive.all_comments.general_comments.forEach((comment, index) => {
        console.log(`   ${index + 1}. ${comment.review_info.user}: ${comment.text.substring(0, 100)}...`);
      });
    }

    // Test summary
    console.log("\n=== COMMENTS BY FILE ===");
    if (summary && summary.comments_by_file) {
      Object.entries(summary.comments_by_file).forEach(([fileName, comments]) => {
        console.log(`\n📄 ${fileName} (${comments.length} comments)`);
        comments.forEach((comment, index) => {
          console.log(`   ${index + 1}. ${comment.review_info.user} (${comment.review_info.timestamp}):`);
          console.log(`      Line ${comment.first_line || '?'}: ${comment.text || 'No text'}`);
          if (comment.issue_opened) {
            console.log(`      🔴 Issue opened`);
          }
        });
      });
    } else {
      console.log("\n💬 No diff comments found");
    }

    // Test the diff comments by file endpoint separately
    console.log("\n🔍 Testing get_diff_comments_by_file tool...");
    const commentsResult = await client.callTool({
      name: "get_diff_comments_by_file",
      arguments: { reviewRequestId }
    });

    const commentsData = JSON.parse(commentsResult.content[0].text);
    console.log(`\n📊 Comments by file analysis:`);
    console.log(`   Total comments: ${commentsData.total_comments}`);
    console.log(`   Files with comments: ${commentsData.files_with_comments.join(', ')}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("\n🏁 Test complete");
  }
}

testCommentsByFile().catch(console.error);
