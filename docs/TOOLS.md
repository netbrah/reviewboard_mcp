# ReviewBoard MCP Server - Available Tools

This MCP server provides a streamlined set of **15 essential tools** for working with ReviewBoard, including powerful revision tracking and history capabilities.

## 🔍 Discovery Tools

### `get_review_requests`
List review requests with optional filters.

**Parameters:**
- `status` (optional): Filter by status - "pending", "submitted", "discarded", "all"
- `repository` (optional): Filter by repository name
- `user` (optional): Filter by user
- `limit` (optional): Number of results (1-200, default: 25)

**Example:**
```json
{
  "status": "pending",
  "user": "john.doe",
  "limit": 10
}
```

### `get_review_request`
Get detailed information about a specific review request.

**Parameters:**
- `reviewRequestId` (required): ID of the review request

**Example:**
```json
{
  "reviewRequestId": 882166
}
```

### `search`
Search across ReviewBoard content.

**Parameters:**
- `query` (required): Search query string
- `username` (optional): Search within specific user's content

**Example:**
```json
{
  "query": "keymanager bug fix",
  "username": "john.doe"
}
```

---

## 📝 Diff & Patch Tools

### `get_full_diff_patch` ⭐ **PRIMARY TOOL**
Get the complete unified diff patch for a review request. This is the main tool for getting patches!

**Parameters:**
- `reviewRequestId` (required): ID of the review request
- `diffRevision` (optional): Specific diff revision (uses latest if not specified)

**Returns:** Complete unified diff patch in text format

**Example:**
```json
{
  "reviewRequestId": 882166
}
```

### `get_diff_files`
See what files were changed in a review request.

**Parameters:**
- `reviewRequestId` (required): ID of the review request
- `diffRevision` (optional): Specific diff revision (uses latest if not specified)

**Returns:** List of files with metadata (file paths, line counts, status)

**Example:**
```json
{
  "reviewRequestId": 882166
}
```

---

## 💬 Comments & Analysis Tools

### `get_comprehensive_comments_analysis` ⭐ **PRIMARY TOOL**
Get complete analysis including:
- All comment types (diff, general, file attachment, screenshot)
- File content with comments annotated at specific lines
- Summary statistics

**Parameters:**
- `reviewRequestId` (required): ID of the review request

**Returns:** Comprehensive JSON with all comments organized by file, with actual code lines shown

**Example:**
```json
{
  "reviewRequestId": 882166
}
```

### `get_reviews`
Get review feedback and comments for a review request.

**Parameters:**
- `reviewRequestId` (required): ID of the review request

**Returns:** List of reviews with reviewer info and timestamps

**Example:**
```json
{
  "reviewRequestId": 882166
}
```

---

## � Revision & History Tools ⭐ **NEW**

### `get_diff_revisions`
List all diff revisions with summary information.

**Parameters:**
- `reviewRequestId` (required): ID of the review request

**Returns:** List of all revisions with timestamps, IDs, and metadata

**Use cases:**
- "How many revisions are there?"
- "Show me all the revisions"
- "When was each revision created?"

**Example:**
```json
{
  "reviewRequestId": 882166
}
```

### `get_revision_summary`
Get detailed summary of a specific revision including files changed, statistics, and commit messages.

**Parameters:**
- `reviewRequestId` (required): ID of the review request
- `revision` (required): Revision number to summarize

**Returns:** Comprehensive revision details with file-level statistics

**Use cases:**
- "Summarize revision 2"
- "What files changed in revision 3?"
- "Show me statistics for the latest revision"

**Example:**
```json
{
  "reviewRequestId": 882166,
  "revision": 2
}
```

### `get_file_at_revision`
Get file content from a specific revision.

**Parameters:**
- `reviewRequestId` (required): ID of the review request
- `filePath` (required): Path of the file to retrieve
- `revisionNumber` (required): Revision number (1 = first revision)
- `type` (optional): "original" (before changes) or "patched" (after changes), default: "patched"

**Returns:** File content and metadata

**Use cases:**
- "Show me file X from 2 revisions ago"
- "Get the original version of file Y from revision 1"
- "What did this file look like in the first revision?"

**Example:**
```json
{
  "reviewRequestId": 882166,
  "filePath": "//depot/path/to/file.cc",
  "revisionNumber": 1,
  "type": "patched"
}
```

### `get_review_history`
Get complete change history of the review request - who changed what and when.

**Parameters:**
- `reviewRequestId` (required): ID of the review request

**Returns:** Timeline of all changes made to the review request

**Use cases:**
- "Show me the history"
- "Who updated the description?"
- "When was the status changed?"
- "What changed over time?"

**Example:**
```json
{
  "reviewRequestId": 882166
}
```

### `compare_revisions`
Compare two revisions to see what changed between them.

**Parameters:**
- `reviewRequestId` (required): ID of the review request
- `fromRevision` (required): Starting revision number
- `toRevision` (required): Ending revision number

**Returns:** Detailed comparison showing files added, modified, removed, and statistics delta

**Use cases:**
- "What changed between revision 1 and 3?"
- "Compare revision 2 vs 4"
- "Show me the diff between first and last revision"

**Example:**
```json
{
  "reviewRequestId": 882166,
  "fromRevision": 1,
  "toRevision": 2
}
```

### `get_file_history`
Track how a specific file evolved across all revisions.

**Parameters:**
- `reviewRequestId` (required): ID of the review request
- `filePath` (required): Path of the file to track

**Returns:** Evolution of the file showing changes in each revision

**Use cases:**
- "Show me the history of file X"
- "How did this file change across revisions?"
- "Track the evolution of this file"

**Example:**
```json
{
  "reviewRequestId": 882166,
  "filePath": "//depot/path/to/file.cc"
}
```

---

## �🗂️ Context Tools

### `get_repositories`
List available repositories.

**Parameters:**
- `limit` (optional): Number of results (1-200, default: 25)

**Example:**
```json
{
  "limit": 50
}
```

### `get_users`
List users in the ReviewBoard instance.

**Parameters:**
- `limit` (optional): Number of results (1-200, default: 25)

**Example:**
```json
{
  "limit": 50
}
```

---

## 🚀 Common Workflows

### Workflow 1: Get a diff patch
```
1. get_review_request(882166)
   → See review details, description, status

2. get_full_diff_patch(882166)
   → Get the complete unified patch!
```

### Workflow 2: Comprehensive review analysis
```
1. get_review_request(882166)
   → See review details

2. get_comprehensive_comments_analysis(882166)
   → Get ALL comments with file annotations

3. get_full_diff_patch(882166)
   → Get the complete patch
```

### Workflow 3: Track revision history ⭐ **NEW**
```
1. get_diff_revisions(882166)
   → See how many revisions exist

2. get_revision_summary(882166, revision=2)
   → Get detailed stats for a specific revision

3. compare_revisions(882166, fromRevision=1, toRevision=2)
   → See what changed between revisions

4. get_file_at_revision(882166, filePath="...", revisionNumber=1)
   → Get file content from a specific revision
```

### Workflow 4: Deep-dive on a specific file ⭐ **NEW**
```
1. get_file_history(882166, filePath="path/to/file")
   → See how the file evolved across all revisions

2. get_file_at_revision(882166, filePath="...", revisionNumber=1)
   → Get file content from first revision

3. get_file_at_revision(882166, filePath="...", revisionNumber=2)
   → Get file content from latest revision

4. Compare manually or use compare_revisions
```

### Workflow 5: Find and review
```
1. search("bug fix keymanager")
   → or get_review_requests(user="john", status="pending")

2. get_review_request(id)
   → Get details of interesting review

3. get_diff_files(id)
   → See what files changed

4. get_full_diff_patch(id)
   → Get the patch

5. get_reviews(id)
   → See existing feedback
```

---

## 🔧 Configuration

The server auto-initializes from environment variables:

```bash
REVIEWBOARD_BASE_URL="https://reviewboard.example.com"
REVIEWBOARD_API_TOKEN="rbp_your_token_here"
```

Configure in `.vscode/mcp.json`:
```json
{
  "servers": {
    "reviewboard": {
      "command": "node",
      "args": ["/path/to/reviewboard_mcp/build/index.js"],
      "env": {
        "REVIEWBOARD_BASE_URL": "https://reviewboard.example.com",
        "REVIEWBOARD_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

---

## ✅ What Was Removed (and why)

**Removed 10 redundant/confusing tools:**

- ❌ `initialize_reviewboard` - Auto-initializes from env vars now
- ❌ `get_diff` - Only returns metadata, not the actual patch (confusing!)
- ❌ `get_file_patch` - Gets patch for ONE file (use `get_full_diff_patch` instead)
- ❌ `get_original_file` - Too low-level
- ❌ `get_patched_file` - Too low-level
- ❌ `get_diff_context` - Unclear purpose, redundant
- ❌ `get_all_comments` - Subset of `get_comprehensive_comments_analysis`
- ❌ `get_diff_comments_by_file` - Subset of `get_comprehensive_comments_analysis`
- ❌ `get_annotated_file` - Subset of `get_comprehensive_comments_analysis`
- ❌ `get_review_summary` - Less complete than `get_comprehensive_comments_analysis`

**Result:** Reduced from 19 tools to **15 essential tools** with natural conversational capabilities!

## 🎯 New Capabilities Summary

The new revision & history tools enable natural questions like:
- ✅ "How many revisions are there?" → `get_diff_revisions`
- ✅ "Summarize revision 2" → `get_revision_summary`
- ✅ "Show file X from 2 revisions ago" → `get_file_at_revision`
- ✅ "What changed between revision 1 and 3?" → `compare_revisions`
- ✅ "Show me the history" → `get_review_history`
- ✅ "Track file X evolution" → `get_file_history`

These tools make ReviewBoard MCP truly conversational while keeping the basics simple and accessible!
