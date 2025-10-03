#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from 'fs';

async function debugCommentStructure() {
  console.log("🔍 Debugging comment structure...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"]
  });

  const client = new Client({
    name: "debug-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log("✅ Connected to MCP server");

    const apiToken = process.env.REVIEWBOARD_API_TOKEN;
    await client.callTool({
      name: "initialize_reviewboard",
      arguments: {
        baseUrl: "https://reviewboard.netapp.com",
        apiToken: apiToken
      }
    });

    const reviewRequestId = 882166;

    // First, let's get the reviews
    console.log("\n1. Getting reviews...");
    const reviewsResult = await client.callTool({
      name: "get_reviews",
      arguments: { reviewRequestId }
    });

    const reviewsData = JSON.parse(reviewsResult.content[0].text);
    console.log(`Found ${reviewsData.reviews.length} reviews`);

    // Get diff files for reference
    console.log("\n2. Getting diff files...");
    const diffFilesResult = await client.callTool({
      name: "get_diff_files",
      arguments: { reviewRequestId }
    });

    const diffFilesData = JSON.parse(diffFilesResult.content[0].text);
    console.log(`Found ${diffFilesData.files.length} files:`);
    diffFilesData.files.forEach(file => {
      console.log(`   File ID ${file.id}: ${file.source_file}`);
    });

    // For each review that has diff comments, examine the structure
    console.log("\n3. Examining diff comments structure...");

    for (let i = 0; i < reviewsData.reviews.length; i++) {
      const review = reviewsData.reviews[i];
      const reviewUser = review.links?.user?.title || 'Unknown';
      console.log(`\n--- Review ${i + 1} by ${reviewUser} ---`);

      if (review.links?.diff_comments) {
        console.log(`Diff comments URL: ${review.links.diff_comments.href}`);

        // Make a direct call to this URL using our client
        try {
          // We need to extract and call this manually to see the raw structure
          // Let's save this analysis to a file for detailed inspection
          const debugData = {
            review_id: review.id,
            user: reviewUser,
            timestamp: review.timestamp,
            diff_comments_url: review.links.diff_comments.href,
            ship_it: review.ship_it
          };

          console.log(`   Review ID: ${debugData.review_id}`);
          console.log(`   Has diff comments link: ${!!review.links.diff_comments}`);

        } catch (error) {
          console.log(`   Error examining comments: ${error.message}`);
        }
      } else {
        console.log("   No diff comments link found");
      }
    }

    // Now let's try our custom method
    console.log("\n4. Testing our custom comments by file method...");

    try {
      const commentsResult = await client.callTool({
        name: "get_diff_comments_by_file",
        arguments: { reviewRequestId }
      });

      const commentsData = JSON.parse(commentsResult.content[0].text);

      // Save detailed analysis
      const analysis = {
        reviewRequestId,
        timestamp: new Date().toISOString(),
        reviews: reviewsData.reviews,
        diffFiles: diffFilesData.files,
        commentsByFile: commentsData
      };

      fs.writeFileSync(`comment-debug-${reviewRequestId}.json`, JSON.stringify(analysis, null, 2));
      console.log(`Detailed analysis saved to comment-debug-${reviewRequestId}.json`);

      console.log(`\nSummary:`);
      console.log(`   Total comments: ${commentsData.total_comments}`);
      console.log(`   Files with comments: ${commentsData.files_with_comments.length}`);

      Object.entries(commentsData.comments_by_file).forEach(([fileName, comments]) => {
        console.log(`\n   📄 ${fileName}:`);
        comments.forEach((comment, idx) => {
          console.log(`      ${idx + 1}. From ${comment.review_info.user}:`);
          console.log(`         Text: ${(comment.text || '').substring(0, 100)}...`);
          console.log(`         Line: ${comment.first_line || 'N/A'}`);
          console.log(`         FileDiff ID: ${comment.filediff?.id || 'N/A'}`);
          if (comment.links?.filediff) {
            console.log(`         FileDiff Link: ${comment.links.filediff.href}`);
          }
        });
      });

    } catch (error) {
      console.log(`Error testing custom method: ${error.message}`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("\n🏁 Debug complete");
  }
}

debugCommentStructure().catch(console.error);
