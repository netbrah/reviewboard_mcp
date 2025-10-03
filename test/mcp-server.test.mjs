#!/usr/bin/env node

/**
 * Comprehensive MCP Server Test Suite
 * Tests all 9 essential tools with the streamlined API
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from 'fs';
import path from 'path';

const TEST_REVIEW_ID = 882166;
const RESULTS_DIR = 'test-results';

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
    this.client = null;
    this.transport = null;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async setup() {
    console.log("🔧 Setting up MCP client...\n");

    // Check for required environment variables
    if (!process.env.REVIEWBOARD_API_TOKEN) {
      throw new Error("REVIEWBOARD_API_TOKEN environment variable is required");
    }

    const baseUrl = process.env.REVIEWBOARD_BASE_URL || 'https://reviewboard.netapp.com';

    this.transport = new StdioClientTransport({
      command: "node",
      args: ["build/index.js"],
      env: {
        REVIEWBOARD_BASE_URL: baseUrl,
        REVIEWBOARD_API_TOKEN: process.env.REVIEWBOARD_API_TOKEN
      }
    });

    this.client = new Client({
      name: "test-runner",
      version: "1.0.0"
    }, {
      capabilities: {}
    });

    await this.client.connect(this.transport);

    // Wait a moment for server to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log("✅ Connected to MCP server");
    console.log(`   Base URL: ${baseUrl}`);
    console.log(`   API Token: ${process.env.REVIEWBOARD_API_TOKEN.substring(0, 15)}...\n`);

    // Create results directory
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }
  }

  async teardown() {
    if (this.client) {
      await this.client.close();
      console.log("\n🔌 Disconnected from MCP server");
    }
  }

  async run() {
    console.log("🧪 ReviewBoard MCP Server Test Suite\n");
    console.log("=" .repeat(60));
    console.log(`Running ${this.tests.length} tests...\n`);

    const startTime = Date.now();

    for (const test of this.tests) {
      try {
        console.log(`\n📝 Test: ${test.name}`);
        await test.fn(this.client);
        this.results.passed++;
        this.results.tests.push({ name: test.name, status: 'PASSED' });
        console.log(`✅ PASSED`);
      } catch (error) {
        this.results.failed++;
        this.results.tests.push({
          name: test.name,
          status: 'FAILED',
          error: error.message,
          stack: error.stack
        });
        console.log(`❌ FAILED: ${error.message}`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n" + "=".repeat(60));
    console.log("\n📊 Test Results Summary");
    console.log("=" .repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📈 Success Rate: ${((this.results.passed / this.tests.length) * 100).toFixed(1)}%`);

    // Save results
    const reportPath = path.join(RESULTS_DIR, `test-results-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      ...this.results,
      duration,
      timestamp: new Date().toISOString()
    }, null, 2));
    console.log(`\n💾 Full report saved to: ${reportPath}`);

    return this.results.failed === 0;
  }
}

// Test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function assertExists(value, name) {
  assert(value !== null && value !== undefined, `${name} should exist`);
}

function assertType(value, type, name) {
  assert(typeof value === type, `${name} should be of type ${type}, got ${typeof value}`);
}

function assertArrayNotEmpty(arr, name) {
  assert(Array.isArray(arr), `${name} should be an array`);
  assert(arr.length > 0, `${name} should not be empty`);
}

// Initialize test runner
const runner = new TestRunner();

// ============================================================================
// Discovery Tools Tests
// ============================================================================

runner.test("get_review_requests - List review requests", async (client) => {
  const result = await client.callTool({
    name: 'get_review_requests',
    arguments: {
      status: 'pending',
      limit: 5
    }
  });

  assertExists(result.content[0].text, "result content");
  const data = JSON.parse(result.content[0].text);

  assertExists(data.review_requests, "review_requests");
  assert(Array.isArray(data.review_requests), "review_requests should be array");
  console.log(`   Found ${data.review_requests.length} pending review requests`);
});

runner.test("get_review_request - Get specific review", async (client) => {
  const result = await client.callTool({
    name: 'get_review_request',
    arguments: { reviewRequestId: TEST_REVIEW_ID }
  });

  assertExists(result.content[0].text, "result content");
  const data = JSON.parse(result.content[0].text);

  assertExists(data.review_request, "review_request");
  assertType(data.review_request.id, 'number', "review_request.id");
  assert(data.review_request.id === TEST_REVIEW_ID, "ID should match");

  console.log(`   Review: "${data.review_request.summary}"`);
  console.log(`   Status: ${data.review_request.status}`);
  console.log(`   Submitter: ${data.review_request.links.submitter.title}`);
});

runner.test("search - Search functionality", async (client) => {
  const result = await client.callTool({
    name: 'search',
    arguments: {
      query: 'keymanager'
    }
  });

  assertExists(result.content[0].text, "result content");
  const data = JSON.parse(result.content[0].text);

  assertExists(data.search, "search results");
  console.log(`   Found ${data.total_results} results for 'keymanager'`);
});

// ============================================================================
// Diff & Patch Tools Tests
// ============================================================================

runner.test("get_full_diff_patch - Get complete unified patch", async (client) => {
  const result = await client.callTool({
    name: 'get_full_diff_patch',
    arguments: { reviewRequestId: TEST_REVIEW_ID }
  });

  assertExists(result.content[0].text, "patch content");
  const patch = result.content[0].text;

  assert(patch.includes('---'), "Patch should contain diff markers");
  assert(patch.includes('+++'), "Patch should contain diff markers");
  assert(patch.includes('@@'), "Patch should contain hunk markers");

  const lines = patch.split('\n').length;
  console.log(`   Patch size: ${lines} lines`);
  console.log(`   Patch length: ${patch.length} bytes`);

  // Save patch for inspection
  const patchPath = path.join(RESULTS_DIR, `review-${TEST_REVIEW_ID}.patch`);
  fs.writeFileSync(patchPath, patch);
  console.log(`   Saved to: ${patchPath}`);
});

runner.test("get_diff_files - List changed files", async (client) => {
  const result = await client.callTool({
    name: 'get_diff_files',
    arguments: { reviewRequestId: TEST_REVIEW_ID }
  });

  assertExists(result.content[0].text, "result content");
  const data = JSON.parse(result.content[0].text);

  assertExists(data.files, "files list");
  assertArrayNotEmpty(data.files, "files");

  console.log(`   Changed files: ${data.files.length}`);
  data.files.forEach((file, i) => {
    console.log(`   ${i + 1}. ${file.source_file} (${file.status})`);
    if (file.extra_data) {
      console.log(`      +${file.extra_data.insert_count || 0} -${file.extra_data.delete_count || 0}`);
    }
  });
});

// ============================================================================
// Comments & Analysis Tools Tests
// ============================================================================

runner.test("get_comprehensive_comments_analysis - Full analysis", async (client) => {
  const result = await client.callTool({
    name: 'get_comprehensive_comments_analysis',
    arguments: { reviewRequestId: TEST_REVIEW_ID }
  });

  assertExists(result.content[0].text, "result content");
  const analysis = JSON.parse(result.content[0].text);

  assertExists(analysis.all_comments, "all_comments");
  assertExists(analysis.annotated_files, "annotated_files");
  assertExists(analysis.summary, "summary");

  console.log(`   Summary:`);
  console.log(`   - Diff comments: ${analysis.summary.total_diff_comments}`);
  console.log(`   - General comments: ${analysis.summary.total_general_comments}`);
  console.log(`   - File attachment comments: ${analysis.summary.total_file_attachment_comments}`);
  console.log(`   - Screenshot comments: ${analysis.summary.total_screenshot_comments}`);
  console.log(`   - Total: ${analysis.summary.overall_total_comments}`);

  // Verify file annotations
  const fileCount = Object.keys(analysis.annotated_files).length;
  console.log(`   Annotated files: ${fileCount}`);

  for (const [filePath, fileInfo] of Object.entries(analysis.annotated_files)) {
    console.log(`   📄 ${filePath}:`);
    console.log(`      Comments: ${fileInfo.comment_count}`);
    console.log(`      Content available: ${fileInfo.file_content_available}`);

    if (fileInfo.file_content_available) {
      const commentedLines = fileInfo.annotated_lines.filter(l => l.comments.length > 0);
      console.log(`      Lines with comments: ${commentedLines.length}`);

      // Verify at least one comment has actual content
      if (commentedLines.length > 0) {
        assertExists(commentedLines[0].content, "line content");
        assertExists(commentedLines[0].line_number, "line number");
        console.log(`      ✓ Line annotations verified`);
      }
    }
  }

  // Save detailed analysis
  const analysisPath = path.join(RESULTS_DIR, `analysis-${TEST_REVIEW_ID}.json`);
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
  console.log(`   Saved to: ${analysisPath}`);
});

runner.test("get_reviews - Get review feedback", async (client) => {
  const result = await client.callTool({
    name: 'get_reviews',
    arguments: { reviewRequestId: TEST_REVIEW_ID }
  });

  assertExists(result.content[0].text, "result content");
  const data = JSON.parse(result.content[0].text);

  assertExists(data.reviews, "reviews list");

  console.log(`   Reviews: ${data.reviews.length}`);
  data.reviews.forEach((review, i) => {
    console.log(`   ${i + 1}. ${review.links.user.title} - ${review.ship_it ? '🚢 Ship It!' : '📝 Comments'}`);
    console.log(`      Timestamp: ${review.timestamp}`);
  });
});

// ============================================================================
// Context Tools Tests
// ============================================================================

runner.test("get_repositories - List repositories", async (client) => {
  const result = await client.callTool({
    name: 'get_repositories',
    arguments: { limit: 10 }
  });

  assertExists(result.content[0].text, "result content");
  const data = JSON.parse(result.content[0].text);

  assertExists(data.repositories, "repositories list");

  console.log(`   Repositories: ${data.repositories.length}`);
  data.repositories.slice(0, 5).forEach((repo, i) => {
    console.log(`   ${i + 1}. ${repo.name} (${repo.tool || 'unknown'})`);
  });
});

runner.test("get_users - List users", async (client) => {
  const result = await client.callTool({
    name: 'get_users',
    arguments: { limit: 10 }
  });

  assertExists(result.content[0].text, "result content");
  const data = JSON.parse(result.content[0].text);

  assertExists(data.users, "users list");

  console.log(`   Users: ${data.users.length}`);
  data.users.slice(0, 5).forEach((user, i) => {
    console.log(`   ${i + 1}. ${user.username} (${user.fullname || 'N/A'})`);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

runner.test("Integration: Full workflow - Discovery to Patch", async (client) => {
  // 1. Search for review
  const searchResult = await client.callTool({
    name: 'search',
    arguments: { query: 'keymanager' }
  });
  const searchData = JSON.parse(searchResult.content[0].text);
  // Note: search results structure may vary, just check it doesn't error
  assertExists(searchData, "Should have search data");
  console.log(`   ✓ Search completed successfully`);

  // 2. Get review details
  const reviewResult = await client.callTool({
    name: 'get_review_request',
    arguments: { reviewRequestId: TEST_REVIEW_ID }
  });
  const reviewData = JSON.parse(reviewResult.content[0].text);
  assert(reviewData.review_request.id === TEST_REVIEW_ID, "Should get correct review");
  console.log(`   ✓ Retrieved review #${TEST_REVIEW_ID}`);

  // 3. Get changed files
  const filesResult = await client.callTool({
    name: 'get_diff_files',
    arguments: { reviewRequestId: TEST_REVIEW_ID }
  });
  const filesData = JSON.parse(filesResult.content[0].text);
  assert(filesData.files.length > 0, "Should have changed files");
  console.log(`   ✓ Found ${filesData.files.length} changed files`);

  // 4. Get full patch
  const patchResult = await client.callTool({
    name: 'get_full_diff_patch',
    arguments: { reviewRequestId: TEST_REVIEW_ID }
  });
  const patch = patchResult.content[0].text;
  assert(patch.length > 0, "Should have patch content");
  console.log(`   ✓ Retrieved patch (${patch.length} bytes)`);

  // 5. Get comments
  const commentsResult = await client.callTool({
    name: 'get_comprehensive_comments_analysis',
    arguments: { reviewRequestId: TEST_REVIEW_ID }
  });
  const comments = JSON.parse(commentsResult.content[0].text);
  assert(comments.summary.overall_total_comments >= 0, "Should have comment data");
  console.log(`   ✓ Retrieved ${comments.summary.overall_total_comments} comments`);

  console.log(`   ✅ Full workflow completed successfully!`);
});

// ============================================================================
// Run all tests
// ============================================================================

async function main() {
  try {
    await runner.setup();
    const success = await runner.run();
    await runner.teardown();

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("\n💥 Fatal error during test execution:", error);
    process.exit(1);
  }
}

main();
