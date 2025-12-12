import * as vscode from 'vscode';
import { ReviewBoardClient, ReviewBoardConfig } from './reviewboard-client';

let reviewBoardClient: ReviewBoardClient | null = null;

/**
 * Initialize ReviewBoard client from VS Code settings
 */
function initializeClient(): ReviewBoardClient {
    const config = vscode.workspace.getConfiguration('reviewboard');
    const baseUrl = config.get<string>('baseUrl');
    const apiToken = config.get<string>('apiToken');
    const username = config.get<string>('username');
    const password = config.get<string>('password');

    if (!baseUrl) {
        throw new Error('ReviewBoard base URL is not configured. Please set reviewboard.baseUrl in settings.');
    }

    if (!apiToken && (!username || !password)) {
        throw new Error('ReviewBoard authentication is not configured. Please set reviewboard.apiToken or reviewboard.username/password in settings.');
    }

    const clientConfig: ReviewBoardConfig = {
        baseUrl,
        apiToken,
        username,
        password,
    };

    return new ReviewBoardClient(clientConfig);
}

/**
 * Get or initialize the ReviewBoard client
 */
function getClient(): ReviewBoardClient {
    if (!reviewBoardClient) {
        reviewBoardClient = initializeClient();
    }
    return reviewBoardClient;
}

/**
 * Format error message for display
 */
function formatError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

export function activate(context: vscode.ExtensionContext) {
    console.log('ReviewBoard Copilot Tools extension is now active');

    // Reload client when configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('reviewboard')) {
                reviewBoardClient = null; // Force reinitialization
            }
        })
    );

    // Register chat participant
    const participant = vscode.chat.createChatParticipant('reviewboard', async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ) => {
        try {
            const client = getClient();
            
            // Parse command and arguments from the request
            const command = request.command || '';
            const prompt = request.prompt;

            // Route to appropriate tool based on command
            switch (command) {
                case 'get_review_requests':
                    await handleGetReviewRequests(client, prompt, stream);
                    break;
                case 'get_review_request':
                    await handleGetReviewRequest(client, prompt, stream);
                    break;
                case 'get_reviews':
                    await handleGetReviews(client, prompt, stream);
                    break;
                case 'search':
                    await handleSearch(client, prompt, stream);
                    break;
                case 'get_full_diff_patch':
                    await handleGetFullDiffPatch(client, prompt, stream);
                    break;
                case 'get_diff_files':
                    await handleGetDiffFiles(client, prompt, stream);
                    break;
                case 'get_comprehensive_comments_analysis':
                    await handleGetComprehensiveCommentsAnalysis(client, prompt, stream);
                    break;
                case 'analyze_comment_resolution':
                    await handleAnalyzeCommentResolution(client, prompt, stream);
                    break;
                case 'get_diff_revisions':
                    await handleGetDiffRevisions(client, prompt, stream);
                    break;
                case 'compare_revisions':
                    await handleCompareRevisions(client, prompt, stream);
                    break;
                case 'get_file_revision_history':
                    await handleGetFileRevisionHistory(client, prompt, stream);
                    break;
                case 'get_file_at_revision':
                    await handleGetFileAtRevision(client, prompt, stream);
                    break;
                case 'get_file_history':
                    await handleGetFileHistory(client, prompt, stream);
                    break;
                case 'get_revision_summary':
                    await handleGetRevisionSummary(client, prompt, stream);
                    break;
                case 'get_review_history':
                    await handleGetReviewHistory(client, prompt, stream);
                    break;
                case 'get_repositories':
                    await handleGetRepositories(client, prompt, stream);
                    break;
                case 'get_users':
                    await handleGetUsers(client, prompt, stream);
                    break;
                default:
                    // No specific command - use natural language processing
                    await handleNaturalLanguageQuery(client, prompt, stream);
            }
        } catch (error) {
            stream.markdown(`❌ **Error:** ${formatError(error)}\n\n`);
            stream.markdown('Please check your ReviewBoard configuration in VS Code settings.');
        }
    });

    // Set participant icon
    participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');

    context.subscriptions.push(participant);
}

// Tool handlers

async function handleGetReviewRequests(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        // Parse parameters from prompt (basic implementation)
        const params: any = {};
        
        if (prompt.includes('pending')) params.status = 'pending';
        else if (prompt.includes('submitted')) params.status = 'submitted';
        else if (prompt.includes('discarded')) params.status = 'discarded';
        
        const limitMatch = prompt.match(/limit[:\s]+(\d+)/i);
        if (limitMatch) params.limit = parseInt(limitMatch[1]);
        
        const userMatch = prompt.match(/user[:\s]+(\w+)/i);
        if (userMatch) params.user = userMatch[1];

        stream.markdown('🔍 Fetching review requests...\n\n');
        
        const result = await client.getReviewRequests(params);
        
        stream.markdown('### Review Requests\n\n');
        
        if (result.review_requests.length === 0) {
            stream.markdown('No review requests found.\n');
        } else {
            for (const rr of result.review_requests) {
                stream.markdown(`**#${rr.id}** - ${rr.summary}\n`);
                stream.markdown(`- Status: ${rr.status}\n`);
                stream.markdown(`- Submitter: ${rr.submitter.username}\n`);
                stream.markdown(`- Last Updated: ${rr.last_updated}\n\n`);
            }
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleGetReviewRequest(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        // Extract review request ID from prompt
        const idMatch = prompt.match(/\d+/);
        if (!idMatch) {
            stream.markdown('❌ Please provide a review request ID (e.g., "get review 12345")\n');
            return;
        }
        
        const reviewRequestId = parseInt(idMatch[0]);
        
        stream.markdown(`🔍 Fetching review request #${reviewRequestId}...\n\n`);
        
        const result = await client.getReviewRequest(reviewRequestId);
        const rr = result.review_request;
        
        stream.markdown('### Review Request Details\n\n');
        stream.markdown(`**ID:** ${rr.id}\n`);
        stream.markdown(`**Summary:** ${rr.summary}\n\n`);
        stream.markdown(`**Description:**\n${rr.description}\n\n`);
        stream.markdown(`**Status:** ${rr.status}\n`);
        stream.markdown(`**Submitter:** ${rr.submitter.username}\n`);
        stream.markdown(`**Repository:** ${rr.repository.name}\n`);
        stream.markdown(`**Last Updated:** ${rr.last_updated}\n\n`);
        
        if (rr.target_people.length > 0) {
            stream.markdown(`**Reviewers:** ${rr.target_people.map((p: any) => p.username).join(', ')}\n`);
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleGetReviews(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        const idMatch = prompt.match(/\d+/);
        if (!idMatch) {
            stream.markdown('❌ Please provide a review request ID\n');
            return;
        }
        
        const reviewRequestId = parseInt(idMatch[0]);
        
        stream.markdown(`🔍 Fetching reviews for #${reviewRequestId}...\n\n`);
        
        const result = await client.getReviews(reviewRequestId);
        
        stream.markdown('### Reviews\n\n');
        
        if (result.reviews.length === 0) {
            stream.markdown('No reviews found.\n');
        } else {
            for (const review of result.reviews) {
                stream.markdown(`**Review by ${review.user.username}**\n`);
                stream.markdown(`- Ship It: ${review.ship_it ? '✅ Yes' : '❌ No'}\n`);
                stream.markdown(`- Timestamp: ${review.timestamp}\n`);
                if (review.body_top) {
                    stream.markdown(`- Comment: ${review.body_top}\n`);
                }
                stream.markdown('\n');
            }
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleSearch(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        // Remove "search" from the beginning if present
        const query = prompt.replace(/^search\s+/i, '').trim();
        
        if (!query) {
            stream.markdown('❌ Please provide a search query\n');
            return;
        }
        
        stream.markdown(`🔍 Searching for: "${query}"...\n\n`);
        
        const result = await client.search(query);
        
        stream.markdown('### Search Results\n\n');
        
        if (result.search.results.length === 0) {
            stream.markdown('No results found.\n');
        } else {
            for (const item of result.search.results) {
                stream.markdown(`**${item.summary}**\n`);
                stream.markdown(`- Type: ${item.model}\n`);
                stream.markdown(`- ID: ${item.id}\n\n`);
            }
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleGetFullDiffPatch(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        const idMatch = prompt.match(/\d+/);
        if (!idMatch) {
            stream.markdown('❌ Please provide a review request ID\n');
            return;
        }
        
        const reviewRequestId = parseInt(idMatch[0]);
        
        // Check for revision number
        const revisionMatch = prompt.match(/revision[:\s]+(\d+)/i);
        const diffRevision = revisionMatch ? parseInt(revisionMatch[1]) : undefined;
        
        stream.markdown(`🔍 Fetching diff patch for #${reviewRequestId}${diffRevision ? ` (revision ${diffRevision})` : ''}...\n\n`);
        
        const result = await client.getFullDiffPatch(reviewRequestId, diffRevision);
        
        stream.markdown('### Diff Patch\n\n');
        stream.markdown('```diff\n');
        stream.markdown(result);
        stream.markdown('\n```\n');
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleGetDiffFiles(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        const idMatch = prompt.match(/\d+/);
        if (!idMatch) {
            stream.markdown('❌ Please provide a review request ID\n');
            return;
        }
        
        const reviewRequestId = parseInt(idMatch[0]);
        const revisionMatch = prompt.match(/revision[:\s]+(\d+)/i);
        const diffRevision = revisionMatch ? parseInt(revisionMatch[1]) : undefined;
        
        stream.markdown(`🔍 Fetching changed files for #${reviewRequestId}...\n\n`);
        
        const result = await client.getDiffFiles(reviewRequestId, diffRevision);
        
        stream.markdown('### Changed Files\n\n');
        
        for (const file of result.files) {
            stream.markdown(`**${file.dest_file}**\n`);
            stream.markdown(`- Lines Added: ${file.lines_added || 0}\n`);
            stream.markdown(`- Lines Deleted: ${file.lines_deleted || 0}\n\n`);
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleGetComprehensiveCommentsAnalysis(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        const idMatch = prompt.match(/\d+/);
        if (!idMatch) {
            stream.markdown('❌ Please provide a review request ID\n');
            return;
        }
        
        const reviewRequestId = parseInt(idMatch[0]);
        
        stream.markdown(`🔍 Analyzing comments for #${reviewRequestId}...\n\n`);
        
        const result = await client.getComprehensiveCommentsAnalysis(reviewRequestId);
        
        stream.markdown('### Comments Analysis\n\n');
        stream.markdown(`**Total Comments:** ${result.summary.overall_total_comments}\n`);
        stream.markdown(`**Diff Comments:** ${result.summary.total_diff_comments}\n`);
        stream.markdown(`**General Comments:** ${result.summary.total_general_comments}\n\n`);
        
        if (result.all_comments.diff_comments.length > 0) {
            stream.markdown('#### Diff Comments\n\n');
            for (const comment of result.all_comments.diff_comments) {
                stream.markdown(`**${comment.user} on ${comment.filediff_dest_file}:${comment.first_line}**\n`);
                stream.markdown(`${comment.text}\n\n`);
            }
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleAnalyzeCommentResolution(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        const idMatch = prompt.match(/\d+/);
        if (!idMatch) {
            stream.markdown('❌ Please provide a review request ID\n');
            return;
        }
        
        const reviewRequestId = parseInt(idMatch[0]);
        
        stream.markdown(`🔍 Analyzing comment resolution for #${reviewRequestId}...\n\n`);
        
        const result = await client.analyzeCommentResolution(reviewRequestId);
        
        stream.markdown('### Comment Resolution Analysis\n\n');
        stream.markdown(`**Total Reviews:** ${result.total_reviews}\n`);
        stream.markdown(`**Total Revisions:** ${result.total_revisions}\n\n`);
        
        stream.markdown('#### Timeline\n\n');
        for (const event of result.timeline) {
            if (event.type === 'comment') {
                stream.markdown(`📝 **Comment** (${event.timestamp})\n`);
                stream.markdown(`   ${event.details}\n\n`);
            } else if (event.type === 'revision') {
                stream.markdown(`🔄 **Revision ${event.revision}** (${event.timestamp})\n`);
                if (event.files_changed) {
                    stream.markdown(`   Files changed: ${event.files_changed.join(', ')}\n\n`);
                }
            }
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleGetDiffRevisions(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        const idMatch = prompt.match(/\d+/);
        if (!idMatch) {
            stream.markdown('❌ Please provide a review request ID\n');
            return;
        }
        
        const reviewRequestId = parseInt(idMatch[0]);
        const includePatches = prompt.toLowerCase().includes('patch');
        
        stream.markdown(`🔍 Fetching diff revisions for #${reviewRequestId}...\n\n`);
        
        const result = await client.getDiffRevisions(reviewRequestId, includePatches);
        
        stream.markdown('### Diff Revisions\n\n');
        
        for (const diff of result.diffs) {
            stream.markdown(`**Revision ${diff.revision}**\n`);
            stream.markdown(`- Timestamp: ${diff.timestamp}\n`);
            stream.markdown(`- Files: ${diff.files?.length || 0}\n`);
            
            if (includePatches && diff.patch) {
                stream.markdown('\n```diff\n');
                stream.markdown(diff.patch.substring(0, 1000)); // Limit patch size
                stream.markdown('\n```\n');
            }
            stream.markdown('\n');
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleCompareRevisions(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        const matches = prompt.match(/\d+/g);
        if (!matches || matches.length < 3) {
            stream.markdown('❌ Please provide review request ID and two revision numbers\n');
            return;
        }
        
        const reviewRequestId = parseInt(matches[0]);
        const oldRevision = parseInt(matches[1]);
        const newRevision = parseInt(matches[2]);
        
        stream.markdown(`🔍 Comparing revisions ${oldRevision} and ${newRevision} for #${reviewRequestId}...\n\n`);
        
        const result = await client.compareRevisions(reviewRequestId, oldRevision, newRevision);
        
        stream.markdown('### Revision Comparison\n\n');
        stream.markdown(`**Files Changed:** ${result.files_changed.length}\n\n`);
        
        if (result.patch) {
            stream.markdown('```diff\n');
            stream.markdown(result.patch.substring(0, 2000)); // Limit patch size
            stream.markdown('\n```\n');
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleGetFileRevisionHistory(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        const idMatch = prompt.match(/\d+/);
        if (!idMatch) {
            stream.markdown('❌ Please provide a review request ID\n');
            return;
        }
        
        const reviewRequestId = parseInt(idMatch[0]);
        
        // Extract file path from prompt
        const fileMatch = prompt.match(/file[:\s]+([^\s]+)/i) || prompt.match(/"([^"]+)"/);
        if (!fileMatch) {
            stream.markdown('❌ Please provide a file path\n');
            return;
        }
        
        const filePath = fileMatch[1];
        
        stream.markdown(`🔍 Fetching revision history for ${filePath} in #${reviewRequestId}...\n\n`);
        
        const result = await client.getFileRevisionHistory(reviewRequestId, filePath);
        
        stream.markdown('### File Revision History\n\n');
        stream.markdown(`**File:** ${result.file_path}\n`);
        stream.markdown(`**Revisions:** ${result.revisions.length}\n\n`);
        
        for (const rev of result.revisions) {
            stream.markdown(`**Revision ${rev.revision}**\n`);
            stream.markdown(`- Timestamp: ${rev.timestamp}\n`);
            if (rev.patch) {
                stream.markdown('\n```diff\n');
                stream.markdown(rev.patch.substring(0, 500));
                stream.markdown('\n```\n');
            }
            stream.markdown('\n');
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleGetFileAtRevision(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        const matches = prompt.match(/\d+/g);
        if (!matches || matches.length < 2) {
            stream.markdown('❌ Please provide review request ID and revision number\n');
            return;
        }
        
        const reviewRequestId = parseInt(matches[0]);
        const revision = parseInt(matches[1]);
        
        const fileMatch = prompt.match(/file[:\s]+([^\s]+)/i) || prompt.match(/"([^"]+)"/);
        if (!fileMatch) {
            stream.markdown('❌ Please provide a file path\n');
            return;
        }
        
        const filePath = fileMatch[1];
        
        stream.markdown(`🔍 Fetching ${filePath} at revision ${revision}...\n\n`);
        
        const result = await client.getFileAtRevision(reviewRequestId, filePath, revision);
        
        stream.markdown('### File Content\n\n');
        stream.markdown(`**File:** ${result.file_path}\n`);
        stream.markdown(`**Revision:** ${result.revision}\n\n`);
        stream.markdown('```\n');
        stream.markdown(result.content.substring(0, 2000)); // Limit content size
        stream.markdown('\n```\n');
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleGetFileHistory(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        const idMatch = prompt.match(/\d+/);
        if (!idMatch) {
            stream.markdown('❌ Please provide a review request ID\n');
            return;
        }
        
        const reviewRequestId = parseInt(idMatch[0]);
        
        // Extract file path from prompt
        const fileMatch = prompt.match(/file[:\s]+([^\s]+)/i) || prompt.match(/"([^"]+)"/);
        if (!fileMatch) {
            stream.markdown('❌ Please provide a file path\n');
            return;
        }
        
        const filePath = fileMatch[1];
        
        stream.markdown(`🔍 Fetching file history for ${filePath} in #${reviewRequestId}...\n\n`);
        
        const result = await client.getFileHistory(reviewRequestId, filePath);
        
        stream.markdown('### File History\n\n');
        stream.markdown(`**File:** ${result.file_path}\n`);
        stream.markdown(`**Revisions:** ${result.revisions.length}\n\n`);
        
        for (const rev of result.revisions) {
            stream.markdown(`- Revision ${rev.revision}: ${rev.dest_detail}\n`);
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleGetRevisionSummary(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        const matches = prompt.match(/\d+/g);
        if (!matches || matches.length < 2) {
            stream.markdown('❌ Please provide review request ID and revision number\n');
            return;
        }
        
        const reviewRequestId = parseInt(matches[0]);
        const revision = parseInt(matches[1]);
        
        stream.markdown(`🔍 Fetching summary for revision ${revision}...\n\n`);
        
        const result = await client.getRevisionSummary(reviewRequestId, revision);
        
        stream.markdown('### Revision Summary\n\n');
        stream.markdown(`**Revision:** ${result.revision}\n`);
        stream.markdown(`**Timestamp:** ${result.timestamp}\n`);
        stream.markdown(`**Files Changed:** ${result.files_changed.length}\n\n`);
        
        for (const file of result.files_changed) {
            stream.markdown(`- ${file}\n`);
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleGetReviewHistory(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        const idMatch = prompt.match(/\d+/);
        if (!idMatch) {
            stream.markdown('❌ Please provide a review request ID\n');
            return;
        }
        
        const reviewRequestId = parseInt(idMatch[0]);
        
        stream.markdown(`🔍 Fetching review history for #${reviewRequestId}...\n\n`);
        
        const result = await client.getReviewRequestHistory(reviewRequestId);
        
        stream.markdown('### Review History\n\n');
        stream.markdown(`**Total Changes:** ${result.total_changes}\n\n`);
        
        for (const change of result.changes) {
            stream.markdown(`**${change.timestamp}**\n`);
            if (change.fields_changed) {
                stream.markdown(`   Fields changed: ${change.fields_changed.join(', ')}\n`);
            }
            stream.markdown('\n');
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleGetRepositories(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        stream.markdown('🔍 Fetching repositories...\n\n');
        
        const result = await client.getRepositories();
        
        stream.markdown('### Repositories\n\n');
        
        for (const repo of result.repositories) {
            stream.markdown(`**${repo.name}**\n`);
            stream.markdown(`- Path: ${repo.path}\n`);
            stream.markdown(`- Tool: ${repo.tool}\n\n`);
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleGetUsers(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    try {
        stream.markdown('🔍 Fetching users...\n\n');
        
        const result = await client.getUsers();
        
        stream.markdown('### Users\n\n');
        
        for (const user of result.users) {
            stream.markdown(`**${user.username}** - ${user.fullname}\n`);
            stream.markdown(`- Email: ${user.email}\n\n`);
        }
    } catch (error) {
        stream.markdown(`❌ Error: ${formatError(error)}\n`);
    }
}

async function handleNaturalLanguageQuery(
    client: ReviewBoardClient,
    prompt: string,
    stream: vscode.ChatResponseStream
) {
    // Try to intelligently route based on natural language
    stream.markdown('🤔 Processing your query...\n\n');
    
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('list') && (lowerPrompt.includes('review request') || lowerPrompt.includes('reviews'))) {
        await handleGetReviewRequests(client, prompt, stream);
    } else if (lowerPrompt.includes('search')) {
        await handleSearch(client, prompt, stream);
    } else if (lowerPrompt.includes('diff') || lowerPrompt.includes('patch')) {
        await handleGetFullDiffPatch(client, prompt, stream);
    } else if (lowerPrompt.includes('comment')) {
        await handleGetComprehensiveCommentsAnalysis(client, prompt, stream);
    } else if (lowerPrompt.includes('repository') || lowerPrompt.includes('repositories')) {
        await handleGetRepositories(client, prompt, stream);
    } else {
        stream.markdown('💡 **Tip:** Use a specific command or try:\n');
        stream.markdown('- `@reviewboard /get_review_requests` - List review requests\n');
        stream.markdown('- `@reviewboard /get_review_request 12345` - Get details\n');
        stream.markdown('- `@reviewboard /search query` - Search ReviewBoard\n');
        stream.markdown('- `@reviewboard /get_full_diff_patch 12345` - Get diff\n');
    }
}

export function deactivate() {
    reviewBoardClient = null;
}
