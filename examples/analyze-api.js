#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from 'fs';

const REVIEW_REQUEST_ID = 882166;

async function analyzeReviewBoardAPI() {
  console.log("🔗 Connecting to ReviewBoard MCP Server...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"]
  });

  const client = new Client({
    name: "reviewboard-api-analyzer",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  const results = {
    timestamp: new Date().toISOString(),
    reviewRequestId: REVIEW_REQUEST_ID,
    apiEndpoints: {}
  };

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

    console.log("✅ Initialized ReviewBoard connection");

    // 1. Basic Review Request Info
    console.log("\n📋 1. Getting basic review request info...");
    try {
      const reviewRequest = await client.callTool({
        name: "get_review_request",
        arguments: { reviewRequestId: REVIEW_REQUEST_ID }
      });

      const data = JSON.parse(reviewRequest.content[0].text);
      results.apiEndpoints.review_request = {
        endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/`,
        success: true,
        dataStructure: analyzeDataStructure(data),
        sampleData: data,
        keyFields: extractKeyFields(data.review_request, [
          'id', 'summary', 'description', 'status', 'approved', 'ship_it_count',
          'submitter', 'target_people', 'target_groups', 'bugs_closed'
        ])
      };
      console.log(`   ✅ Found review: "${data.review_request.summary}"`);
      console.log(`   📊 Status: ${data.review_request.status}, Ship It: ${data.review_request.ship_it_count}`);
    } catch (error) {
      results.apiEndpoints.review_request = { endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/`, success: false, error: error.message };
      console.log(`   ❌ Error: ${error.message}`);
    }

    // 2. Reviews
    console.log("\n💬 2. Getting reviews...");
    try {
      const reviews = await client.callTool({
        name: "get_reviews",
        arguments: { reviewRequestId: REVIEW_REQUEST_ID }
      });

      const data = JSON.parse(reviews.content[0].text);
      results.apiEndpoints.reviews = {
        endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/reviews/`,
        success: true,
        dataStructure: analyzeDataStructure(data),
        sampleData: data,
        count: data.reviews?.length || 0,
        reviewers: data.reviews?.map(r => ({
          id: r.id,
          user: r.links?.user?.title,
          ship_it: r.ship_it,
          timestamp: r.timestamp
        })) || []
      };
      console.log(`   ✅ Found ${data.reviews?.length || 0} reviews`);
      data.reviews?.forEach(review => {
        console.log(`   👤 ${review.links?.user?.title}: ${review.ship_it ? '✅ Ship It' : '💭 Comment'} (${review.timestamp})`);
      });
    } catch (error) {
      results.apiEndpoints.reviews = { endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/reviews/`, success: false, error: error.message };
      console.log(`   ❌ Error: ${error.message}`);
    }

    // 3. Diff Info
    console.log("\n📄 3. Getting diff information...");
    try {
      const diff = await client.callTool({
        name: "get_diff",
        arguments: { reviewRequestId: REVIEW_REQUEST_ID }
      });

      const data = JSON.parse(diff.content[0].text);
      results.apiEndpoints.diff = {
        endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/diffs/latest/`,
        success: true,
        dataStructure: analyzeDataStructure(data),
        sampleData: data,
        diffInfo: {
          id: data.diff?.id,
          revision: data.diff?.revision,
          timestamp: data.diff?.timestamp,
          fileCount: data.diff?.links?.files ? 'available' : 'unknown'
        }
      };
      console.log(`   ✅ Diff ID: ${data.diff?.id}, Revision: ${data.diff?.revision}`);
    } catch (error) {
      results.apiEndpoints.diff = { endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/diffs/latest/`, success: false, error: error.message };
      console.log(`   ❌ Error: ${error.message}`);
    }

    // 4. Diff Files
    console.log("\n📁 4. Getting diff files...");
    try {
      const diffFiles = await client.callTool({
        name: "get_diff_files",
        arguments: { reviewRequestId: REVIEW_REQUEST_ID }
      });

      const data = JSON.parse(diffFiles.content[0].text);
      results.apiEndpoints.diff_files = {
        endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/diffs/{revision}/files/`,
        success: true,
        dataStructure: analyzeDataStructure(data),
        sampleData: data,
        fileCount: data.files?.length || 0,
        filesInfo: data.files?.map(file => ({
          id: file.id,
          source_file: file.source_file,
          dest_file: file.dest_file,
          status: file.status,
          stats: {
            insert_count: file.extra_data?.insert_count,
            delete_count: file.extra_data?.delete_count,
            total_lines: file.extra_data?.total_line_count
          }
        })) || []
      };
      console.log(`   ✅ Found ${data.files?.length || 0} changed files`);
      data.files?.slice(0, 3).forEach(file => {
        console.log(`   📝 ${file.source_file} (${file.status})`);
      });
      if (data.files?.length > 3) {
        console.log(`   ... and ${data.files.length - 3} more files`);
      }
    } catch (error) {
      results.apiEndpoints.diff_files = { endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/diffs/{revision}/files/`, success: false, error: error.message };
      console.log(`   ❌ Error: ${error.message}`);
    }

    // 5. Full Diff Patch
    console.log("\n🔧 5. Getting full diff patch...");
    try {
      const fullPatch = await client.callTool({
        name: "get_full_diff_patch",
        arguments: { reviewRequestId: REVIEW_REQUEST_ID }
      });

      const patchContent = fullPatch.content[0].text;
      results.apiEndpoints.full_diff_patch = {
        endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/diffs/{revision}/ (custom implementation)`,
        success: true,
        dataType: 'text/plain',
        contentLength: patchContent.length,
        sampleContent: patchContent.slice(0, 500) + (patchContent.length > 500 ? '...' : ''),
        isUnifiedDiff: patchContent.includes('---') && patchContent.includes('+++')
      };
      console.log(`   ✅ Got unified diff patch (${patchContent.length} characters)`);
    } catch (error) {
      results.apiEndpoints.full_diff_patch = { endpoint: 'custom implementation', success: false, error: error.message };
      console.log(`   ❌ Error: ${error.message}`);
    }

    // 6. Try to get diff context
    console.log("\n🔍 6. Getting diff context...");
    try {
      const diffContext = await client.callTool({
        name: "get_diff_context",
        arguments: { reviewRequestId: REVIEW_REQUEST_ID }
      });

      const data = JSON.parse(diffContext.content[0].text);
      results.apiEndpoints.diff_context = {
        endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/diff-context/`,
        success: true,
        dataStructure: analyzeDataStructure(data),
        sampleData: data
      };
      console.log(`   ✅ Got diff context`);
    } catch (error) {
      results.apiEndpoints.diff_context = { endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/diff-context/`, success: false, error: error.message };
      console.log(`   ❌ Error: ${error.message}`);
    }

    // 7. Try to get individual file patches (if we have files)
    if (results.apiEndpoints.diff_files?.success && results.apiEndpoints.diff_files.filesInfo?.length > 0) {
      console.log("\n📋 7. Testing individual file patch access...");
      const firstFile = results.apiEndpoints.diff_files.filesInfo[0];
      const diffRevision = results.apiEndpoints.diff?.diffInfo?.revision;

      if (firstFile && diffRevision) {
        try {
          const filePatch = await client.callTool({
            name: "get_file_patch",
            arguments: {
              reviewRequestId: REVIEW_REQUEST_ID,
              diffRevision: diffRevision,
              fileDiffId: firstFile.id
            }
          });

          const patchContent = filePatch.content[0].text;
          results.apiEndpoints.file_patch = {
            endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/diffs/${diffRevision}/files/${firstFile.id}/`,
            success: true,
            dataType: 'text/plain or JSON',
            contentLength: patchContent.length,
            sampleContent: patchContent.slice(0, 300) + (patchContent.length > 300 ? '...' : ''),
            testedFile: firstFile.source_file
          };
          console.log(`   ✅ Got patch for ${firstFile.source_file} (${patchContent.length} characters)`);
        } catch (error) {
          results.apiEndpoints.file_patch = {
            endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/diffs/${diffRevision}/files/${firstFile.id}/`,
            success: false,
            error: error.message,
            testedFile: firstFile.source_file
          };
          console.log(`   ❌ Error getting file patch: ${error.message}`);
        }
      }
    }

    // 8. Try to get original and patched files
    if (results.apiEndpoints.diff_files?.success && results.apiEndpoints.diff_files.filesInfo?.length > 0) {
      console.log("\n📄 8. Testing original/patched file access...");
      const firstFile = results.apiEndpoints.diff_files.filesInfo[0];
      const diffRevision = results.apiEndpoints.diff?.diffInfo?.revision;

      if (firstFile && diffRevision) {
        // Original file
        try {
          const originalFile = await client.callTool({
            name: "get_original_file",
            arguments: {
              reviewRequestId: REVIEW_REQUEST_ID,
              diffRevision: diffRevision,
              fileDiffId: firstFile.id
            }
          });

          const content = originalFile.content[0].text;
          results.apiEndpoints.original_file = {
            endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/diffs/${diffRevision}/files/${firstFile.id}/original-file/`,
            success: true,
            dataType: 'text/plain',
            contentLength: content.length,
            sampleContent: content.slice(0, 300) + (content.length > 300 ? '...' : ''),
            testedFile: firstFile.source_file
          };
          console.log(`   ✅ Got original file for ${firstFile.source_file} (${content.length} characters)`);
        } catch (error) {
          results.apiEndpoints.original_file = {
            endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/diffs/${diffRevision}/files/${firstFile.id}/original-file/`,
            success: false,
            error: error.message
          };
          console.log(`   ❌ Error getting original file: ${error.message}`);
        }

        // Patched file
        try {
          const patchedFile = await client.callTool({
            name: "get_patched_file",
            arguments: {
              reviewRequestId: REVIEW_REQUEST_ID,
              diffRevision: diffRevision,
              fileDiffId: firstFile.id
            }
          });

          const content = patchedFile.content[0].text;
          results.apiEndpoints.patched_file = {
            endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/diffs/${diffRevision}/files/${firstFile.id}/patched-file/`,
            success: true,
            dataType: 'text/plain',
            contentLength: content.length,
            sampleContent: content.slice(0, 300) + (content.length > 300 ? '...' : ''),
            testedFile: firstFile.source_file
          };
          console.log(`   ✅ Got patched file for ${firstFile.source_file} (${content.length} characters)`);
        } catch (error) {
          results.apiEndpoints.patched_file = {
            endpoint: `/api/review-requests/${REVIEW_REQUEST_ID}/diffs/${diffRevision}/files/${firstFile.id}/patched-file/`,
            success: false,
            error: error.message
          };
          console.log(`   ❌ Error getting patched file: ${error.message}`);
        }
      }
    }

    // 9. General API endpoints
    console.log("\n🌐 9. Testing general API endpoints...");

    // Repositories
    try {
      const repos = await client.callTool({
        name: "get_repositories",
        arguments: { limit: 5 }
      });

      const data = JSON.parse(repos.content[0].text);
      results.apiEndpoints.repositories = {
        endpoint: "/api/repositories/",
        success: true,
        dataStructure: analyzeDataStructure(data),
        count: data.repositories?.length || 0,
        sampleRepos: data.repositories?.slice(0, 3).map(r => ({ id: r.id, name: r.name, tool: r.tool })) || []
      };
      console.log(`   ✅ Found ${data.repositories?.length || 0} repositories`);
    } catch (error) {
      results.apiEndpoints.repositories = { endpoint: "/api/repositories/", success: false, error: error.message };
      console.log(`   ❌ Error getting repositories: ${error.message}`);
    }

    // Users
    try {
      const users = await client.callTool({
        name: "get_users",
        arguments: { limit: 5 }
      });

      const data = JSON.parse(users.content[0].text);
      results.apiEndpoints.users = {
        endpoint: "/api/users/",
        success: true,
        dataStructure: analyzeDataStructure(data),
        count: data.users?.length || 0,
        sampleUsers: data.users?.slice(0, 3).map(u => ({ username: u.username, fullname: u.fullname })) || []
      };
      console.log(`   ✅ Found ${data.users?.length || 0} users`);
    } catch (error) {
      results.apiEndpoints.users = { endpoint: "/api/users/", success: false, error: error.message };
      console.log(`   ❌ Error getting users: ${error.message}`);
    }

    // Save results
    const outputFile = `reviewboard-api-analysis-${REVIEW_REQUEST_ID}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Analysis saved to ${outputFile}`);

    // Summary
    console.log("\n📊 ANALYSIS SUMMARY");
    console.log("==================");
    const successful = Object.values(results.apiEndpoints).filter(ep => ep.success).length;
    const total = Object.keys(results.apiEndpoints).length;
    console.log(`✅ Successful endpoints: ${successful}/${total}`);

    console.log("\n🔍 Key Findings:");
    Object.entries(results.apiEndpoints).forEach(([name, info]) => {
      if (info.success) {
        console.log(`   ✅ ${name}: ${info.endpoint}`);
      } else {
        console.log(`   ❌ ${name}: ${info.error}`);
      }
    });

  } catch (error) {
    console.error("❌ Fatal error:", error.message);
  } finally {
    await client.close();
    console.log("\n🏁 Analysis complete");
  }
}

function analyzeDataStructure(data) {
  if (typeof data !== 'object' || data === null) {
    return typeof data;
  }

  if (Array.isArray(data)) {
    return {
      type: 'array',
      length: data.length,
      itemType: data.length > 0 ? analyzeDataStructure(data[0]) : 'empty'
    };
  }

  const structure = {};
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        structure[key] = {
          type: 'array',
          length: value.length,
          itemType: value.length > 0 ? typeof value[0] : 'empty'
        };
      } else {
        structure[key] = {
          type: 'object',
          keys: Object.keys(value).slice(0, 5) // First 5 keys only
        };
      }
    } else {
      structure[key] = typeof value;
    }
  });

  return structure;
}

function extractKeyFields(obj, fields) {
  const result = {};
  fields.forEach(field => {
    if (obj && obj[field] !== undefined) {
      result[field] = obj[field];
    }
  });
  return result;
}

analyzeReviewBoardAPI().catch(console.error);
