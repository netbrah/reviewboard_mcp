#!/usr/bin/env node

/**
 * Natural Language Question Testing for ReviewBoard MCP Server
 *
 * Tests the MCP server with real-world natural language questions
 * to validate conversational capabilities.
 *
 * Review 858846 Details (from actual data):
 * - Status: submitted (approved)
 * - Revisions: 13 total (Jan 23 - Apr 19, 2025)
 * - Files: 2 (kmip_key_view_v2_crs.cc and .ut test file)
 * - Comments: 6 diff comments
 * - Reviews: 8 reviews, 3 ship-its
 * - Summary: "RFE -Implement Parallel Execution for kmip_key_view_v2"
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const REVIEW_ID = 858846;

// Test categories with natural language questions
const TEST_QUESTIONS = {
    "Basic Discovery": [
        {
            question: "What's review 858846 about?",
            tools: ["get_review_request"],
            validate: (result) => {
                const data = JSON.parse(result);
                return data.review_request.summary.includes("Parallel Execution");
            }
        },
        {
            question: "Who submitted this review?",
            tools: ["get_review_request"],
            validate: (result) => {
                const data = JSON.parse(result);
                return data.review_request.links.submitter.title === "palanisd";
            }
        },
        {
            question: "What's the current status?",
            tools: ["get_review_request"],
            validate: (result) => {
                const data = JSON.parse(result);
                return data.review_request.status === "submitted" && data.review_request.approved === true;
            }
        }
    ],

    "Revision History": [
        {
            question: "How many revisions are there?",
            tools: ["get_diff_revisions"],
            validate: (result) => {
                const data = JSON.parse(result);
                return data.total_revisions === 13;
            }
        },
        {
            question: "When was the first revision created?",
            tools: ["get_diff_revisions"],
            validate: (result) => {
                const data = JSON.parse(result);
                return data.revisions[0].timestamp === "2025-01-23T12:56:09Z";
            }
        },
        {
            question: "When was the latest revision?",
            tools: ["get_diff_revisions"],
            validate: (result) => {
                const data = JSON.parse(result);
                const latest = data.revisions.find(r => r.is_latest);
                return latest && latest.timestamp === "2025-04-19T18:44:04Z";
            }
        },
        {
            question: "What changed between revision 1 and revision 13?",
            tools: ["compare_revisions"],
            params: { fromRevision: 1, toRevision: 13 },
            validate: (result) => {
                const data = JSON.parse(result);
                return data.comparison && data.comparison.files_modified > 0;
            }
        }
    ],

    "Specific Revision Details": [
        {
            question: "Summarize revision 5",
            tools: ["get_revision_summary"],
            params: { revision: 5 },
            validate: (result) => {
                const data = JSON.parse(result);
                return data.revision_number === 5 && data.files && data.files.length > 0;
            }
        },
        {
            question: "What files changed in revision 13?",
            tools: ["get_revision_summary"],
            params: { revision: 13 },
            validate: (result) => {
                const data = JSON.parse(result);
                return data.files && data.files.length === 2;
            }
        },
        {
            question: "How many lines were changed in the latest revision?",
            tools: ["get_revision_summary"],
            params: { revision: 13 },
            validate: (result) => {
                const data = JSON.parse(result);
                return data.insertions > 0 || data.deletions > 0;
            }
        }
    ],

    "File Content & History": [
        {
            question: "Show me the .cc file from revision 1",
            tools: ["get_file_at_revision"],
            params: {
                filePath: "//depot/prod/DOT/dev/security/keymanager/keymanager_mgwd/src/tables/external/kmip/kmip_key_view_v2_crs.cc",
                revisionNumber: 1,
                type: "patched"
            },
            validate: (result) => {
                const data = JSON.parse(result);
                return data.file_content && data.file_content.length > 100;
            }
        },
        {
            question: "Track how the .cc file evolved across all revisions",
            tools: ["get_file_history"],
            params: {
                filePath: "//depot/prod/DOT/dev/security/keymanager/keymanager_mgwd/src/tables/external/kmip/kmip_key_view_v2_crs.cc"
            },
            validate: (result) => {
                const data = JSON.parse(result);
                return data.revisions_found > 10; // Should find it in most/all revisions
            }
        },
        {
            question: "Show me what the test file looked like 5 revisions ago",
            tools: ["get_file_at_revision"],
            params: {
                filePath: "//depot/prod/DOT/dev/security/keymanager/keymanager_mgwd/src/tests/tables/external/kmip/kmip_key_view_v2_crs.ut",
                revisionNumber: 8, // 13 - 5
                type: "patched"
            },
            validate: (result) => {
                const data = JSON.parse(result);
                return data.file_content && data.file_content.length > 0;
            }
        }
    ],

    "Comments & Feedback": [
        {
            question: "Are there any comments on this review?",
            tools: ["get_comprehensive_comments_analysis"],
            validate: (result) => {
                const data = JSON.parse(result);
                return data.all_comments.total_comments === 6;
            }
        },
        {
            question: "Show me all the feedback with code context",
            tools: ["get_comprehensive_comments_analysis"],
            validate: (result) => {
                const data = JSON.parse(result);
                return data.annotated_files && Object.keys(data.annotated_files).length > 0;
            }
        },
        {
            question: "What did reviewers say?",
            tools: ["get_reviews"],
            validate: (result) => {
                const data = JSON.parse(result);
                return data.reviews && data.reviews.length === 8;
            }
        },
        {
            question: "How many ship-its did it get?",
            tools: ["get_review_request"],
            validate: (result) => {
                const data = JSON.parse(result);
                return data.review_request.ship_it_count === 3;
            }
        }
    ],

    "Files & Diffs": [
        {
            question: "What files were modified?",
            tools: ["get_diff_files"],
            validate: (result) => {
                const data = JSON.parse(result);
                return data.files && data.files.length === 2;
            }
        },
        {
            question: "Show me the full diff patch",
            tools: ["get_full_diff_patch"],
            validate: (result) => {
                return result.includes("diff") && result.includes("@@");
            }
        },
        {
            question: "How many lines of code were changed total?",
            tools: ["get_diff_files"],
            validate: (result) => {
                const data = JSON.parse(result);
                const total_insert = data.files.reduce((sum, f) => sum + (f.extra_data.insert_count || 0), 0);
                const total_delete = data.files.reduce((sum, f) => sum + (f.extra_data.delete_count || 0), 0);
                return total_insert > 0 || total_delete > 0;
            }
        }
    ],

    "Change Timeline": [
        {
            question: "Show me the complete history of changes",
            tools: ["get_review_history"],
            validate: (result) => {
                const data = JSON.parse(result);
                return data.changes && data.changes.length > 0;
            }
        },
        {
            question: "Who made changes and when?",
            tools: ["get_review_history"],
            validate: (result) => {
                const data = JSON.parse(result);
                return data.changes && data.changes[0].timestamp;
            }
        }
    ],

    "Complex/Tricky Questions": [
        {
            question: "Compare the first and last revision to see total evolution",
            tools: ["compare_revisions"],
            params: { fromRevision: 1, toRevision: 13 },
            validate: (result) => {
                const data = JSON.parse(result);
                return data.comparison && data.comparison.summary;
            }
        },
        {
            question: "What was different between revision 7 and 10?",
            tools: ["compare_revisions"],
            params: { fromRevision: 7, toRevision: 10 },
            validate: (result) => {
                const data = JSON.parse(result);
                return data.comparison;
            }
        },
        {
            question: "Show me the original (before) version of the .cc file from revision 13",
            tools: ["get_file_at_revision"],
            params: {
                filePath: "//depot/prod/DOT/dev/security/keymanager/keymanager_mgwd/src/tables/external/kmip/kmip_key_view_v2_crs.cc",
                revisionNumber: 13,
                type: "original"
            },
            validate: (result) => {
                const data = JSON.parse(result);
                return data.file_content && data.type === "original";
            }
        },
        {
            question: "Find all comments with 'parallel' in them",
            tools: ["get_comprehensive_comments_analysis"],
            validate: (result) => {
                const data = JSON.parse(result);
                const hasParallel = data.all_comments.diff_comments.some(c =>
                    c.text.toLowerCase().includes("parallel")
                );
                return hasParallel;
            }
        },
        {
            question: "Which revisions had the most changes?",
            tools: ["get_diff_revisions"],
            validate: (result) => {
                const data = JSON.parse(result);
                // This would require getting summary for each, but we validate we can get the list
                return data.revisions && data.revisions.length === 13;
            }
        }
    ]
};

async function runTest(category, testCase, client) {
    try {
        const tool = testCase.tools[0];
        const params = {
            reviewRequestId: REVIEW_ID,
            ...(testCase.params || {})
        };

        const result = await client.request(
            {
                method: "tools/call",
                params: {
                    name: tool,
                    arguments: params
                }
            },
            { timeout: 30000 }
        );

        const content = result.content[0].text;
        const passed = testCase.validate(content);

        return {
            category,
            question: testCase.question,
            tool,
            passed,
            error: null
        };
    } catch (error) {
        return {
            category,
            question: testCase.question,
            tool: testCase.tools[0],
            passed: false,
            error: error.message
        };
    }
}

async function main() {
    console.log("🧪 Testing Natural Language Questions on Review 858846\n");
    console.log("=" .repeat(80));

    const transport = new StdioClientTransport({
        command: "node",
        args: ["build/index.js"],
        env: {
            ...process.env,
            REVIEWBOARD_BASE_URL: process.env.REVIEWBOARD_BASE_URL,
            REVIEWBOARD_API_TOKEN: process.env.REVIEWBOARD_API_TOKEN
        }
    });

    const client = new Client({
        name: "natural-question-test-client",
        version: "1.0.0"
    }, {
        capabilities: {}
    });

    await client.connect(transport);

    const results = [];
    let totalTests = 0;
    let passedTests = 0;

    for (const [category, tests] of Object.entries(TEST_QUESTIONS)) {
        console.log(`\n📋 ${category}`);
        console.log("-".repeat(80));

        for (const test of tests) {
            totalTests++;
            process.stdout.write(`  ❓ "${test.question}"\n     → Using: ${test.tools[0]}... `);

            const result = await runTest(category, test, client);
            results.push(result);

            if (result.passed) {
                passedTests++;
                console.log("✅ PASS");
            } else {
                console.log(`❌ FAIL${result.error ? `: ${result.error}` : ""}`);
            }
        }
    }

    await client.close();

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(80));

    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${totalTests - passedTests} ❌`);
    console.log(`Success Rate: ${successRate}%`);

    // Failures detail
    const failures = results.filter(r => !r.passed);
    if (failures.length > 0) {
        console.log("\n❌ FAILED TESTS:");
        failures.forEach(f => {
            console.log(`  - [${f.category}] "${f.question}"`);
            console.log(`    Tool: ${f.tool}`);
            if (f.error) console.log(`    Error: ${f.error}`);
        });
    }

    // Category breakdown
    console.log("\n📈 BY CATEGORY:");
    const byCategory = {};
    for (const result of results) {
        if (!byCategory[result.category]) {
            byCategory[result.category] = { total: 0, passed: 0 };
        }
        byCategory[result.category].total++;
        if (result.passed) byCategory[result.category].passed++;
    }

    for (const [category, stats] of Object.entries(byCategory)) {
        const rate = ((stats.passed / stats.total) * 100).toFixed(0);
        const icon = stats.passed === stats.total ? "✅" : stats.passed > 0 ? "⚠️" : "❌";
        console.log(`  ${icon} ${category}: ${stats.passed}/${stats.total} (${rate}%)`);
    }

    console.log("\n" + "=".repeat(80));

    process.exit(failures.length === 0 ? 0 : 1);
}

main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
});
