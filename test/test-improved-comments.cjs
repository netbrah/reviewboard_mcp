const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

// Test the improved comment-by-file mapping via MCP interface
async function testImprovedComments() {
    console.log('Testing improved comment mapping for review request 882166...');

    const transport = new StdioClientTransport({
        command: "node",
        args: ["build/index.js"]
    });

    const client = new Client({
        name: "test-client",
        version: "1.0.0"
    }, {
        capabilities: {}
    });

    try {
        await client.connect(transport);
        console.log('Connected to MCP server');

        // Test the get_diff_comments_by_file tool
        const result = await client.callTool({
            name: 'get_diff_comments_by_file',
            arguments: {
                baseUrl: 'https://reviewboard.netapp.com',
                username: 'palanisd',
                apiToken: 'f4064a8b8a9a1e0d29d7a8a0f3a7d5b9f1c2e3d4',
                reviewRequestId: 882166
            }
        });

        const data = JSON.parse(result.content[0].text);

        console.log('\n=== IMPROVED MAPPING RESULTS ===');
        console.log('Debug Info:', JSON.stringify(data.debug_info, null, 2));

        console.log('\n=== COMMENTS BY FILE ===');
        for (const [fileName, comments] of Object.entries(data.comments_by_file)) {
            console.log(`\n📁 ${fileName}`);
            console.log(`   ${comments.length} comments`);

            comments.forEach((comment, index) => {
                console.log(`   Comment ${index + 1}:`);
                console.log(`     • ID: ${comment.id}`);
                console.log(`     • Line: ${comment.first_line}${comment.num_lines > 1 ? `-${comment.first_line + comment.num_lines - 1}` : ''}`);
                console.log(`     • Author: ${comment.review_info?.user || 'Unknown'}`);
                console.log(`     • Text: ${comment.text.substring(0, 100)}...`);
                if (comment.links?.filediff?.href) {
                    console.log(`     • FileID from link: ${comment.links.filediff.href.match(/files\/(\d+)\//)?.[1] || 'N/A'}`);
                }
            });
        }

        console.log('\n=== SUMMARY ===');
        console.log(`Total files mapped: ${data.debug_info.total_files_mapped}`);
        console.log(`Files with comments: ${data.debug_info.files_with_comments}`);
        console.log(`Total comments: ${data.total_comments}`);
        console.log(`Files with unknown mapping: ${Object.keys(data.comments_by_file).filter(f => f.includes('Unknown')).length}`);

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await client.close();
        console.log('Client closed');
    }
}

testImprovedComments();
