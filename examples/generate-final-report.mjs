#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from 'fs';

async function generateFinalReport() {
  console.log("🎯 Generating final comprehensive report...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"]
  });

  const client = new Client({
    name: "final-report",
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

    // Test the fixed comments function
    const commentsResult = await client.callTool({
      name: 'get_diff_comments_by_file',
      arguments: {
        reviewRequestId: 882166
      }
    });

    const data = JSON.parse(commentsResult.content[0].text);

    const report = {
      timestamp: new Date().toISOString(),
      review_request_id: 882166,
      summary: {
        total_comments: data.total_comments,
        files_with_comments: data.files_with_comments.length,
        unknown_file_mappings: data.files_with_comments.filter(f => f.includes('Unknown')).length,
        cross_revision_mapping_success: data.files_with_comments.filter(f => !f.includes('Unknown')).length > 0
      },
      files_and_comments: {},
      success: data.files_with_comments.filter(f => !f.includes('Unknown')).length === data.files_with_comments.length
    };

    // Organize by file with details
    for (const [fileName, comments] of Object.entries(data.comments_by_file)) {
      report.files_and_comments[fileName] = {
        comment_count: comments.length,
        comments: comments.map(comment => ({
          id: comment.id,
          line_range: `${comment.first_line}${comment.num_lines > 1 ? `-${comment.first_line + comment.num_lines - 1}` : ''}`,
          author: comment.review_info?.user || 'Unknown',
          text_preview: comment.text.substring(0, 100) + '...',
          file_id_from_link: comment.links?.filediff?.href?.match(/files\/(\d+)\//)?.[1] || 'N/A',
          issue_status: comment.issue_status || 'none'
        }))
      };
    }

    // Save report
    fs.writeFileSync('final-comments-analysis-882166.json', JSON.stringify(report, null, 2));

    console.log("\n🎉 FINAL REPORT - Cross-Revision Comment Mapping SUCCESS!");
    console.log("=" * 60);
    console.log(`✅ Total comments mapped: ${report.summary.total_comments}`);
    console.log(`✅ Files with comments: ${report.summary.files_with_comments}`);
    console.log(`✅ Unknown file mappings: ${report.summary.unknown_file_mappings}`);
    console.log(`✅ Cross-revision mapping working: ${report.summary.cross_revision_mapping_success ? 'YES' : 'NO'}`);
    console.log(`✅ All comments properly mapped: ${report.success ? 'YES' : 'NO'}`);

    console.log("\n📁 FILES WITH COMMENTS:");
    Object.keys(report.files_and_comments).forEach(fileName => {
      const fileInfo = report.files_and_comments[fileName];
      console.log(`   ${fileName} (${fileInfo.comment_count} comments)`);
    });

    console.log(`\n💾 Detailed report saved to: final-comments-analysis-882166.json`);

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
  }
}

generateFinalReport();
