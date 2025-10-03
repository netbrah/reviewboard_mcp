#!/usr/bin/env node
import { spawn } from 'child_process';

// Test the new analyze_comment_resolution tool
const reviewRequestId = 858846;

console.log('='.repeat(80));
console.log(`Testing: analyze_comment_resolution for review ${reviewRequestId}`);
console.log('='.repeat(80));
console.log('');

const mcp = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: process.env
});

let buffer = '';
let initialized = false;

mcp.stdout.on('data', (data) => {
  buffer += data.toString();

  // Process complete JSON-RPC messages
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const message = JSON.parse(line);

      // Handle initialization response
      if (message.result && !initialized) {
        console.log('✅ Server initialized successfully');
        console.log('');
        initialized = true;

        // Now call the analyze_comment_resolution tool
        console.log('🔄 Calling analyze_comment_resolution tool...');
        console.log('   (This may take 20-30 seconds for complex reviews)');
        const toolRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'analyze_comment_resolution',
            arguments: {
              reviewRequestId: reviewRequestId
            }
          }
        };

        mcp.stdin.write(JSON.stringify(toolRequest) + '\n');
      }
      // Handle tool response
      else if (message.result && message.id === 2) {
        console.log('📊 Comment Resolution Analysis:');
        console.log('='.repeat(80));

        const content = message.result.content[0].text;
        const analysis = JSON.parse(content);

        // Display summary
        console.log('\n📈 SUMMARY:');
        console.log(`   Total comments: ${analysis.summary.total_comments}`);
        console.log(`   Comments with issues: ${analysis.summary.comments_with_issues}`);
        console.log(`   Resolved issues: ${analysis.summary.resolved_issues}`);
        console.log(`   Dropped issues: ${analysis.summary.dropped_issues}`);
        console.log(`   Open issues: ${analysis.summary.open_issues}`);
        console.log(`   Likely addressed: ${analysis.summary.likely_addressed}`);
        console.log(`   Needs attention: ${analysis.summary.needs_attention}`);

        // Display detailed analysis
        console.log('\n🔍 DETAILED ANALYSIS:');
        console.log('='.repeat(80));

        analysis.detailed_analysis.forEach((item, index) => {
          console.log(`\n[${index + 1}] Comment #${item.comment_id}`);
          console.log(`    File: ${item.file}`);
          console.log(`    Lines: ${item.line_numbers.first}-${item.line_numbers.last}`);
          console.log(`    Reviewer: ${item.reviewer}`);
          console.log(`    Comment: "${item.comment_text}"`);
          console.log(`    Status: ${item.issue_status} (issue_opened: ${item.issue_opened})`);
          console.log(`    Severity: ${item.severity}`);
          console.log(`    Comment in revision: ${item.comment_in_revision}`);
          console.log(`    File modified after: ${item.file_modified_after_comment ? '✅ Yes' : '❌ No'}`);
          console.log(`    Likely addressed: ${item.likely_addressed ? '✅ Yes' : '❌ No'}`);
          console.log(`    Evidence: ${item.resolution_evidence}`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('✅ Test completed successfully!');
        console.log('='.repeat(80));

        mcp.kill();
        process.exit(0);
      }
      // Handle errors
      else if (message.error) {
        console.error('❌ Error:', message.error.message);
        mcp.kill();
        process.exit(1);
      }
    } catch (e) {
      // Skip non-JSON lines (like the initialization logs)
    }
  }
});

mcp.on('error', (error) => {
  console.error('❌ Failed to start MCP server:', error);
  process.exit(1);
});

mcp.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ MCP server exited with code ${code}`);
    process.exit(code);
  }
});

// Send initialization request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

setTimeout(() => {
  mcp.stdin.write(JSON.stringify(initRequest) + '\n');
}, 100);

// Timeout after 30 seconds
setTimeout(() => {
  console.error('❌ Test timeout after 30 seconds');
  mcp.kill();
  process.exit(1);
}, 30000);
