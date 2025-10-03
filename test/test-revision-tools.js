#!/usr/bin/env node

/**
 * Test new revision & history tools
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const REVIEW_REQUEST_ID = 882166;

async function testRevisionTools() {
  console.log("🧪 TESTING NEW REVISION & HISTORY TOOLS");
  console.log("=" .repeat(70));

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"],
    env: {
      REVIEWBOARD_BASE_URL: process.env.REVIEWBOARD_BASE_URL || "https://reviewboard.netapp.com",
      REVIEWBOARD_API_TOKEN: process.env.REVIEWBOARD_API_TOKEN
    }
  });

  const client = new Client({
    name: "revision-tools-tester",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  try {
    await client.connect(transport);
    console.log("✅ Connected to MCP server\n");

    // TEST 1: Get diff revisions
    console.log("TEST 1: get_diff_revisions");
    console.log("-".repeat(70));
    try {
      const response = await client.callTool({
        name: "get_diff_revisions",
        arguments: { reviewRequestId: REVIEW_REQUEST_ID }
      });

      const data = JSON.parse(response.content[0].text);
      console.log(`✅ Found ${data.total_revisions} revisions`);
      console.log(`📋 Revisions:`);
      data.revisions.forEach((rev, idx) => {
        console.log(`   ${idx + 1}. Revision ${rev.revision_number} (${rev.timestamp}) ${rev.is_latest ? '← Latest' : ''}`);
      });
      results.passed++;
      results.tests.push({ name: "get_diff_revisions", status: "PASS" });
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      results.failed++;
      results.tests.push({ name: "get_diff_revisions", status: "FAIL", error: error.message });
    }

    // TEST 2: Get revision summary
    console.log("\n\nTEST 2: get_revision_summary");
    console.log("-".repeat(70));
    try {
      const response = await client.callTool({
        name: "get_revision_summary",
        arguments: {
          reviewRequestId: REVIEW_REQUEST_ID,
          revision: 2
        }
      });

      const data = JSON.parse(response.content[0].text);
      console.log(`✅ Revision ${data.revision_number} Summary:`);
      console.log(`📊 Statistics:`);
      console.log(`   Files changed: ${data.statistics.total_files_changed}`);
      console.log(`   Added: ${data.statistics.files_added}`);
      console.log(`   Modified: ${data.statistics.files_modified}`);
      console.log(`   Deleted: ${data.statistics.files_deleted}`);
      console.log(`   Insertions: +${data.statistics.total_insertions}`);
      console.log(`   Deletions: -${data.statistics.total_deletions}`);

      if (data.commits && data.commits.length > 0) {
        console.log(`\n📝 Commits:`);
        data.commits.forEach(commit => {
          console.log(`   - ${commit.message} (by ${commit.author})`);
        });
      }

      console.log(`\n📁 Files:`);
      data.files.slice(0, 3).forEach(file => {
        console.log(`   - ${file.dest_file} (${file.status}): +${file.lines_inserted}/-${file.lines_deleted}`);
      });
      if (data.files.length > 3) {
        console.log(`   ... and ${data.files.length - 3} more files`);
      }

      results.passed++;
      results.tests.push({ name: "get_revision_summary", status: "PASS" });
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      results.failed++;
      results.tests.push({ name: "get_revision_summary", status: "FAIL", error: error.message });
    }

    // TEST 3: Get file at revision
    console.log("\n\nTEST 3: get_file_at_revision");
    console.log("-".repeat(70));
    try {
      const response = await client.callTool({
        name: "get_file_at_revision",
        arguments: {
          reviewRequestId: REVIEW_REQUEST_ID,
          filePath: "//depot/prod/DOT/dev/security/keymanager/keymanager_mgwd/src/tables/external/keymanager_external_sync_missing_keys.cc",
          revisionNumber: 2,
          type: "patched"
        }
      });

      const data = JSON.parse(response.content[0].text);
      console.log(`✅ Retrieved file: ${data.file_path}`);
      console.log(`📄 Revision: ${data.revision_number}`);
      console.log(`📊 File info:`);
      console.log(`   Status: ${data.file_info.status}`);
      console.log(`   Lines: ${data.file_info.total_lines}`);
      console.log(`   Changes: +${data.file_info.lines_inserted}/-${data.file_info.lines_deleted}`);
      console.log(`📝 Content preview (first 200 chars):`);
      console.log(`   ${data.content.substring(0, 200)}...`);

      results.passed++;
      results.tests.push({ name: "get_file_at_revision", status: "PASS" });
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      results.failed++;
      results.tests.push({ name: "get_file_at_revision", status: "FAIL", error: error.message });
    }

    // TEST 4: Get review history
    console.log("\n\nTEST 4: get_review_history");
    console.log("-".repeat(70));
    try {
      const response = await client.callTool({
        name: "get_review_history",
        arguments: { reviewRequestId: REVIEW_REQUEST_ID }
      });

      const data = JSON.parse(response.content[0].text);
      console.log(`✅ Found ${data.total_changes} changes in history`);
      console.log(`📜 Recent changes:`);
      data.changes.slice(0, 5).forEach((change, idx) => {
        console.log(`   ${idx + 1}. ${change.timestamp} by ${change.user.username}`);
        const updates = [];
        if (change.diff_updated) updates.push("diff");
        if (change.description_updated) updates.push("description");
        if (change.summary_updated) updates.push("summary");
        if (change.status_updated) updates.push("status");
        if (change.reviewers_updated) updates.push("reviewers");
        if (updates.length > 0) {
          console.log(`      Updated: ${updates.join(", ")}`);
        }
      });

      results.passed++;
      results.tests.push({ name: "get_review_history", status: "PASS" });
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      results.failed++;
      results.tests.push({ name: "get_review_history", status: "FAIL", error: error.message });
    }

    // TEST 5: Compare revisions
    console.log("\n\nTEST 5: compare_revisions");
    console.log("-".repeat(70));
    try {
      const response = await client.callTool({
        name: "compare_revisions",
        arguments: {
          reviewRequestId: REVIEW_REQUEST_ID,
          fromRevision: 1,
          toRevision: 2
        }
      });

      const data = JSON.parse(response.content[0].text);
      console.log(`✅ Compared revision ${data.from_revision} → ${data.to_revision}`);
      console.log(`📊 Comparison:`);
      console.log(`   Files added: ${data.comparison.statistics.total_files_added}`);
      console.log(`   Files modified: ${data.comparison.statistics.total_files_modified}`);
      console.log(`   Files removed: ${data.comparison.statistics.total_files_removed}`);
      console.log(`   Files unchanged: ${data.comparison.statistics.total_files_unchanged}`);
      console.log(`   Insertions delta: ${data.comparison.statistics.insertions_delta >= 0 ? '+' : ''}${data.comparison.statistics.insertions_delta}`);
      console.log(`   Deletions delta: ${data.comparison.statistics.deletions_delta >= 0 ? '+' : ''}${data.comparison.statistics.deletions_delta}`);

      results.passed++;
      results.tests.push({ name: "compare_revisions", status: "PASS" });
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      results.failed++;
      results.tests.push({ name: "compare_revisions", status: "FAIL", error: error.message });
    }

    // TEST 6: Get file history
    console.log("\n\nTEST 6: get_file_history");
    console.log("-".repeat(70));
    try {
      const response = await client.callTool({
        name: "get_file_history",
        arguments: {
          reviewRequestId: REVIEW_REQUEST_ID,
          filePath: "//depot/prod/DOT/dev/security/keymanager/keymanager_mgwd/src/tables/external/keymanager_external_sync_missing_keys.cc"
        }
      });

      const data = JSON.parse(response.content[0].text);
      console.log(`✅ File: ${data.file_path}`);
      console.log(`📊 Present in ${data.revisions_with_file} out of ${data.total_revisions} revisions`);
      console.log(`📜 Evolution:`);
      data.history.forEach((entry, idx) => {
        console.log(`   ${idx + 1}. Rev ${entry.revision_number} (${entry.timestamp})`);
        console.log(`      Status: ${entry.status}`);
        console.log(`      Lines: ${entry.total_lines} (+${entry.lines_inserted}/-${entry.lines_deleted})`);
      });

      results.passed++;
      results.tests.push({ name: "get_file_history", status: "PASS" });
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      results.failed++;
      results.tests.push({ name: "get_file_history", status: "FAIL", error: error.message });
    }

    // SUMMARY
    console.log("\n\n" + "=".repeat(70));
    console.log("TEST SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Success rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);

    console.log("\nDetailed results:");
    results.tests.forEach((test, idx) => {
      const icon = test.status === "PASS" ? "✅" : "❌";
      console.log(`${idx + 1}. ${icon} ${test.name}: ${test.status}`);
      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }
    });

  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    console.error(error.stack);
  } finally {
    await client.close();
    console.log("\n🏁 Testing complete");
  }
}

testRevisionTools().catch(console.error);
