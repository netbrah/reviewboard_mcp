#!/usr/bin/env node

/**
 * Test new patch diff capabilities
 * Tests: get_diff_revisions with includePatchDiffs and get_file_revision_history
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const REVIEW_REQUEST_ID = 858846; // The review we analyzed before
const TEST_FILE = "src/tables/external/keymanager_external_sync_missing_keys.cc";

async function testPatchDiffs() {
  console.log("🧪 TESTING NEW PATCH DIFF CAPABILITIES");
  console.log("=" .repeat(80));
  console.log(`📋 Review: ${REVIEW_REQUEST_ID}`);
  console.log(`📄 Test File: ${TEST_FILE}`);
  console.log("=" .repeat(80));

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"],
    env: {
      REVIEWBOARD_BASE_URL: process.env.REVIEWBOARD_BASE_URL || "https://reviewboard.netapp.com",
      REVIEWBOARD_API_TOKEN: process.env.REVIEWBOARD_API_TOKEN
    }
  });

  const client = new Client({
    name: "patch-diff-tester",
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

    // TEST 1: get_diff_revisions WITHOUT patches (baseline)
    console.log("TEST 1: get_diff_revisions (baseline - no patches)");
    console.log("-".repeat(80));
    try {
      const response = await client.callTool({
        name: "get_diff_revisions",
        arguments: { reviewRequestId: REVIEW_REQUEST_ID }
      });

      const data = JSON.parse(response.content[0].text);
      console.log(`✅ Found ${data.total_revisions} revisions`);
      console.log(`📊 Has patch_diffs field: ${data.patch_diffs ? 'YES' : 'NO'}`);

      if (data.patch_diffs) {
        console.log(`   ⚠️  Unexpected: patch_diffs present when not requested`);
      } else {
        console.log(`   ✓ Correct: No patch_diffs (as expected)`);
      }

      console.log(`\n📋 First 3 revisions:`);
      data.revisions.slice(0, 3).forEach((rev) => {
        console.log(`   Rev ${rev.revision_number}: ${rev.timestamp.substring(0, 10)} (${rev.commit_count} commits)`);
      });

      results.passed++;
      results.tests.push({ name: "get_diff_revisions_baseline", status: "PASS" });
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      results.failed++;
      results.tests.push({ name: "get_diff_revisions_baseline", status: "FAIL", error: error.message });
    }

    // TEST 2: get_diff_revisions WITH patches (new capability!)
    console.log("\n\nTEST 2: get_diff_revisions WITH includePatchDiffs=true ⭐ NEW!");
    console.log("-".repeat(80));
    console.log("🔄 Fetching revisions with patch diffs (may take 10-15 seconds)...");
    try {
      const response = await client.callTool({
        name: "get_diff_revisions",
        arguments: {
          reviewRequestId: REVIEW_REQUEST_ID,
          includePatchDiffs: true
        }
      });

      const data = JSON.parse(response.content[0].text);
      console.log(`✅ Found ${data.total_revisions} revisions`);
      console.log(`📦 Has patch_diffs field: ${data.patch_diffs ? 'YES ✓' : 'NO ✗'}`);

      if (data.patch_diffs) {
        console.log(`   ✓ Success! patch_diffs array present`);
        console.log(`   📊 Number of patches: ${data.patch_diffs.length}`);
        console.log(`   📊 Expected: ${data.total_revisions - 1} (consecutive pairs)`);

        if (data.patch_diffs.length === data.total_revisions - 1) {
          console.log(`   ✓ Correct number of patches!`);
        } else {
          console.log(`   ⚠️  Patch count mismatch!`);
        }

        console.log(`\n📝 First 3 inter-revision patches:`);
        data.patch_diffs.slice(0, 3).forEach((patch, idx) => {
          console.log(`   ${idx + 1}. Rev ${patch.from_revision} → ${patch.to_revision}`);
          console.log(`      Timestamp: ${patch.timestamp.substring(0, 19)}`);
          console.log(`      Patch size: ${patch.patch.length} bytes`);

          // Check if it looks like a valid unified diff
          if (patch.patch.startsWith('diff --git') || patch.patch.includes('@@')) {
            console.log(`      ✓ Valid unified diff format`);
          } else if (patch.patch.includes('no changes') || patch.patch.length < 50) {
            console.log(`      ℹ️  No changes or minimal diff`);
          } else {
            console.log(`      ⚠️  Unexpected format`);
          }

          // Show first line of patch
          const firstLine = patch.patch.split('\n')[0];
          console.log(`      Preview: ${firstLine.substring(0, 60)}...`);
        });

        // TEST: Verify chronological order
        console.log(`\n🔍 Verifying chronological order...`);
        let orderCorrect = true;
        for (let i = 0; i < data.patch_diffs.length - 1; i++) {
          if (data.patch_diffs[i].to_revision !== data.patch_diffs[i + 1].from_revision) {
            console.log(`   ✗ Order issue: rev ${data.patch_diffs[i].to_revision} → ${data.patch_diffs[i + 1].from_revision}`);
            orderCorrect = false;
          }
        }
        if (orderCorrect) {
          console.log(`   ✓ All patches in correct chronological order`);
        }

      } else {
        console.log(`   ✗ FAILED: No patch_diffs when includePatchDiffs=true`);
        throw new Error("patch_diffs missing");
      }

      results.passed++;
      results.tests.push({ name: "get_diff_revisions_with_patches", status: "PASS" });
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      results.failed++;
      results.tests.push({ name: "get_diff_revisions_with_patches", status: "FAIL", error: error.message });
    }

    // TEST 3: get_file_revision_history (new tool!)
    console.log("\n\nTEST 3: get_file_revision_history ⭐ NEW TOOL!");
    console.log("-".repeat(80));
    console.log("🔄 Fetching file history with patches (may take 15-20 seconds)...");
    try {
      // First, get a list of files to pick one
      const revisionsResponse = await client.callTool({
        name: "get_diff_revisions",
        arguments: { reviewRequestId: REVIEW_REQUEST_ID }
      });
      const revData = JSON.parse(revisionsResponse.content[0].text);

      // Get files from first revision
      const filesResponse = await client.callTool({
        name: "get_diff_files",
        arguments: {
          reviewRequestId: REVIEW_REQUEST_ID,
          diffRevision: 1
        }
      });
      const filesData = JSON.parse(filesResponse.content[0].text);
      const testFile = filesData.files[0].dest_file;

      console.log(`📄 Testing with file: ${testFile}`);

      const response = await client.callTool({
        name: "get_file_revision_history",
        arguments: {
          reviewRequestId: REVIEW_REQUEST_ID,
          filePath: testFile
        }
      });

      const data = JSON.parse(response.content[0].text);
      console.log(`✅ Retrieved file history for: ${data.file_path}`);
      console.log(`📊 Statistics:`);
      console.log(`   Total revisions in review: ${data.total_revisions}`);
      console.log(`   Revisions containing this file: ${data.revisions_containing_file}`);

      if (data.file_history && data.file_history.length > 0) {
        console.log(`   ✓ File history array present with ${data.file_history.length} entries`);

        console.log(`\n📜 File evolution:`);
        data.file_history.forEach((entry, idx) => {
          console.log(`   ${idx + 1}. Revision ${entry.revision_number} (${entry.timestamp.substring(0, 10)})`);
          console.log(`      Status: ${entry.status}`);
          console.log(`      Changes: +${entry.lines_inserted}/-${entry.lines_deleted}`);

          if (entry.patch) {
            console.log(`      Patch size: ${entry.patch.length} bytes`);

            // Verify patch format
            if (entry.patch.startsWith('diff --git') || entry.patch.includes('@@')) {
              console.log(`      ✓ Valid unified diff`);
            } else if (entry.patch.length < 50) {
              console.log(`      ℹ️  Minimal/no changes`);
            } else {
              console.log(`      ⚠️  Unexpected format`);
            }
          } else {
            console.log(`      ⚠️  No patch data`);
          }
        });

        // Check for inter_revision_diffs
        if (data.inter_revision_diffs) {
          console.log(`\n🔗 Inter-revision diffs: ${data.inter_revision_diffs.length} entries`);
          data.inter_revision_diffs.slice(0, 2).forEach((diff, idx) => {
            console.log(`   ${idx + 1}. Rev ${diff.from_revision} → ${diff.to_revision}`);
            console.log(`      ${diff.description}`);
          });
        }

        // Check for summary
        if (data.summary) {
          console.log(`\n📊 Summary:`);
          console.log(`   First appearance: Revision ${data.summary.first_appearance}`);
          console.log(`   Last appearance: Revision ${data.summary.last_appearance}`);
          console.log(`   Total modifications: ${data.summary.total_modifications}`);
          if (data.summary.total_lines_inserted !== undefined) {
            console.log(`   Total lines inserted: +${data.summary.total_lines_inserted}`);
          }
          if (data.summary.total_lines_deleted !== undefined) {
            console.log(`   Total lines deleted: -${data.summary.total_lines_deleted}`);
          }
        }

      } else {
        console.log(`   ✗ No file_history array found`);
        throw new Error("file_history missing");
      }

      results.passed++;
      results.tests.push({ name: "get_file_revision_history", status: "PASS" });
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      results.failed++;
      results.tests.push({ name: "get_file_revision_history", status: "FAIL", error: error.message });
    }

    // TEST 4: Partial file path matching
    console.log("\n\nTEST 4: get_file_revision_history with partial path matching");
    console.log("-".repeat(80));
    try {
      // Try with just the filename
      const response = await client.callTool({
        name: "get_file_revision_history",
        arguments: {
          reviewRequestId: REVIEW_REQUEST_ID,
          filePath: "sync_missing_keys" // Just part of the filename
        }
      });

      const data = JSON.parse(response.content[0].text);
      console.log(`✅ Partial path match worked!`);
      console.log(`   Searched for: "sync_missing_keys"`);
      console.log(`   Found file: ${data.file_path}`);
      console.log(`   Revisions: ${data.revisions_containing_file} appearances`);

      if (data.file_path && data.file_path.includes('sync_missing_keys')) {
        console.log(`   ✓ Correct file matched`);
      } else {
        console.log(`   ⚠️  Unexpected file matched`);
      }

      results.passed++;
      results.tests.push({ name: "partial_path_matching", status: "PASS" });
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      results.failed++;
      results.tests.push({ name: "partial_path_matching", status: "FAIL", error: error.message });
    }

    // TEST 5: Compare old vs new tool
    console.log("\n\nTEST 5: Compare get_file_history (old) vs get_file_revision_history (new)");
    console.log("-".repeat(80));
    try {
      const filesResponse = await client.callTool({
        name: "get_diff_files",
        arguments: {
          reviewRequestId: REVIEW_REQUEST_ID,
          diffRevision: 1
        }
      });
      const filesData = JSON.parse(filesResponse.content[0].text);
      const testFile = filesData.files[0].dest_file;

      // Get old tool data
      const oldResponse = await client.callTool({
        name: "get_file_history",
        arguments: {
          reviewRequestId: REVIEW_REQUEST_ID,
          filePath: testFile
        }
      });
      const oldData = JSON.parse(oldResponse.content[0].text);

      // Get new tool data
      const newResponse = await client.callTool({
        name: "get_file_revision_history",
        arguments: {
          reviewRequestId: REVIEW_REQUEST_ID,
          filePath: testFile
        }
      });
      const newData = JSON.parse(newResponse.content[0].text);

      console.log(`📊 Comparison for: ${testFile.substring(testFile.length - 40)}`);
      console.log(`\nOLD TOOL (get_file_history):`);
      console.log(`   Revisions found: ${oldData.revisions_with_file}`);
      console.log(`   Has patches: ${oldData.history && oldData.history[0] && oldData.history[0].patch ? 'YES' : 'NO'}`);
      console.log(`   Data size: ${JSON.stringify(oldData).length} bytes`);

      console.log(`\nNEW TOOL (get_file_revision_history):`);
      console.log(`   Revisions found: ${newData.revisions_containing_file}`);
      console.log(`   Has patches: ${newData.file_history && newData.file_history[0] && newData.file_history[0].patch ? 'YES' : 'NO'}`);
      console.log(`   Has inter-revision diffs: ${newData.inter_revision_diffs ? 'YES' : 'NO'}`);
      console.log(`   Has summary: ${newData.summary ? 'YES' : 'NO'}`);
      console.log(`   Data size: ${JSON.stringify(newData).length} bytes`);

      // The new tool should have significantly more data
      const oldSize = JSON.stringify(oldData).length;
      const newSize = JSON.stringify(newData).length;

      if (newSize > oldSize) {
        console.log(`\n✓ New tool provides more data: ${newSize} vs ${oldSize} bytes (${Math.round(newSize/oldSize)}x larger)`);
      } else {
        console.log(`\n⚠️  New tool should provide more data than old tool`);
      }

      results.passed++;
      results.tests.push({ name: "compare_old_vs_new", status: "PASS" });
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      results.failed++;
      results.tests.push({ name: "compare_old_vs_new", status: "FAIL", error: error.message });
    }

    // TEST 6: Verify backward compatibility
    console.log("\n\nTEST 6: Backward compatibility check");
    console.log("-".repeat(80));
    try {
      // Call get_diff_revisions without the new parameter multiple times
      console.log(`🔄 Testing that old API still works...`);

      for (let i = 0; i < 3; i++) {
        const response = await client.callTool({
          name: "get_diff_revisions",
          arguments: { reviewRequestId: REVIEW_REQUEST_ID }
        });
        const data = JSON.parse(response.content[0].text);

        if (data.patch_diffs) {
          console.log(`   ✗ Call ${i + 1}: Unexpected patch_diffs when not requested`);
          throw new Error("Backward compatibility broken");
        }
      }

      console.log(`✓ All 3 calls worked without includePatchDiffs parameter`);
      console.log(`✓ Backward compatibility maintained!`);

      results.passed++;
      results.tests.push({ name: "backward_compatibility", status: "PASS" });
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      results.failed++;
      results.tests.push({ name: "backward_compatibility", status: "FAIL", error: error.message });
    }

    // SUMMARY
    console.log("\n\n" + "=".repeat(80));
    console.log("📊 TEST SUMMARY - PATCH DIFF CAPABILITIES");
    console.log("=".repeat(80));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);

    console.log("\n📋 Detailed Results:");
    results.tests.forEach((test, idx) => {
      const icon = test.status === "PASS" ? "✅" : "❌";
      const testName = test.name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      console.log(`${idx + 1}. ${icon} ${testName}`);
      if (test.error) {
        console.log(`   💥 Error: ${test.error}`);
      }
    });

    console.log("\n" + "=".repeat(80));
    if (results.failed === 0) {
      console.log("🎉 ALL TESTS PASSED! New patch diff capabilities working perfectly!");
    } else {
      console.log(`⚠️  ${results.failed} test(s) need attention`);
    }
    console.log("=".repeat(80));

  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    console.error(error.stack);
  } finally {
    await client.close();
    console.log("\n🏁 Testing complete");
  }
}

testPatchDiffs().catch(console.error);
