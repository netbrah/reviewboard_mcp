# 🚀 ReviewBoard MCP Server - Available Tools

I'm excited to share our **ReviewBoard MCP (Model Context Protocol) Server** which provides 17 powerful tools for interacting with ReviewBoard code reviews. Here's what's available:

---

## 📋 Core Review Request Tools

### 1. **get_review_requests**
Get a list of review requests with filtering options
- Filter by: status (pending/submitted/discarded/all), repository, user
- Configurable result limits

### 2. **get_review_request**
Get detailed information about a specific review request
- Returns complete metadata including title, description, status, author, reviewers

### 3. **get_reviews**
Get all reviews for a specific review request
- Includes reviewer comments, Ship-It status, and timestamps

### 4. **get_diff_files**
Get the list of files changed in a specific diff revision
- Shows which files were modified in a review request

### 5. **get_full_diff_patch**
Get the complete unified diff patch for a review request
- Returns the full patch in unified diff format for code analysis

---

## 💬 Comment & Analysis Tools

### 6. **get_comprehensive_comments_analysis**
Get comprehensive analysis of all comments with file content annotations
- Shows all diff comments, general comments, file attachment comments
- Includes line-by-line annotations showing where comments were made
- Provides summary statistics

### 7. **analyze_comment_resolution**
Analyze whether comments were addressed in subsequent revisions
- Answers questions like: "Were all comments addressed?" or "Did the author fix the issues?"
- Shows which comments are resolved, dropped, or still open
- Tracks issue severity and provides resolution evidence

---

## 🔄 Revision Tracking & History Tools

### 8. **get_diff_revisions**
List all diff revisions with optional full patch differences between consecutive revisions
- See the complete revision timeline
- **NEW**: Optionally include patch diffs showing exactly what changed between each revision

### 9. **get_revision_summary**
Get detailed summary of a specific revision
- Shows files changed, line statistics, and metadata for a single revision

### 10. **get_review_history**
Get complete change history of the review request
- Track who changed what and when
- See all updates, field changes, and status transitions

### 11. **compare_revisions**
Compare two revisions to see what changed between them
- Shows differences between any two specific revisions

---

## 📁 File-Specific Tools

### 12. **get_file_at_revision**
Get file content from a specific revision
- Example: "Show me file X from 2 revisions ago"
- Can retrieve either original (before) or patched (after) version

### 13. **get_file_history**
Track how a specific file evolved across all revisions
- See when a file was first introduced, modified, or removed
- View the complete lifecycle of a file

### 14. **get_file_revision_history** ⭐ NEW
Get comprehensive revision history for a specific file including patch diffs
- Shows exactly how a file changed from revision to revision
- Includes line statistics and patches between consecutive revisions
- Supports partial file path matching

---

## 🔍 Discovery Tools

### 15. **get_repositories**
Get a list of repositories
- Browse available repositories in ReviewBoard

### 16. **get_users**
Get a list of users
- Find users and their information

### 17. **search**
Search across ReviewBoard content
- Global search functionality
- Can filter by specific user

---

## 🎯 Key Features

✅ **Comprehensive Review Analysis** - Deep insights into code reviews, comments, and changes
✅ **Revision Tracking** - Full history of how code evolved across revisions
✅ **Comment Resolution Analysis** - Automatically track which comments were fixed
✅ **File Evolution Tracking** - See exactly how individual files changed
✅ **Inter-Revision Diffs** - View differences between any two revisions

---

## 💡 Use Cases

- **Review Quality Assurance**: "Were all comments from revision 3 addressed in revision 5?"
- **Code Change Analysis**: "Show me what changed in file X between revisions 2 and 7"
- **Review History**: "What's the complete timeline of changes for review #12345?"
- **Comment Tracking**: "Which revision fixed the security concerns raised by the reviewer?"
- **File Investigation**: "How did this configuration file evolve across all revisions?"

---

## 🛠️ Technical Details

- **Authentication**: Supports API tokens and username/password
- **Environment Variables**: Auto-configures from `REVIEWBOARD_BASE_URL` and `REVIEWBOARD_API_TOKEN`
- **MCP Protocol**: Fully compatible with Claude Desktop and other MCP clients
- **Error Handling**: Comprehensive error messages for troubleshooting

---

**Questions?** Feel free to reach out! The server is ready to use and can significantly streamline code review workflows and analysis.
