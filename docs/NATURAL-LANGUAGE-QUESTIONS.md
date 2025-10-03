# Natural Language Questions - ReviewBoard MCP Server

## 📚 Documentation: What Questions Can You Ask?

Based on review **858846** (RFE - Implement Parallel Execution for kmip_key_view_v2), here are all the natural language questions you can now ask the ReviewBoard MCP server.

**🆕 NEW: Comment Resolution Analysis** - Ask "Were all comments addressed?" to get intelligent analysis of whether feedback was incorporated!

---

## ✅ Basic Discovery Questions

### "What's this review about?"
**Tool:** `get_review_request`
**Returns:** Summary, description, status, submitter, target people/groups

**Example for 858846:**
- Summary: "RFE -Implement Parallel Execution for kmip_key_view_v2"
- Submitter: palanisd
- Status: submitted (approved ✅)
- Ship-Its: 3
- Bugs: CONTAP-378314

### "Who submitted this review?"
**Tool:** `get_review_request`
**Answer:** palanisd

### "What's the current status?"
**Tool:** `get_review_request`
**Answer:** submitted, approved=true, ship_it_count=3

### "Who are the reviewers?"
**Tool:** `get_review_request`
**Answer:** asafa, creger, jcomen, pattk, poorva + groups ng-kmsdev, ng-naice-reviewbot

---

## 📅 Revision History Questions

### "How many revisions are there?"
**Tool:** `get_diff_revisions`
**Answer:** 13 revisions total (from Jan 23 to Apr 19, 2025)

### "When was the first revision created?"
**Tool:** `get_diff_revisions`
**Answer:** 2025-01-23T12:56:09Z

### "When was the latest revision?"
**Tool:** `get_diff_revisions`
**Answer:** 2025-04-19T18:44:04Z (revision 13)

### "List all revision timestamps"
**Tool:** `get_diff_revisions`
**Returns:** Array of 13 revisions with timestamps, IDs, and links

**Sample output:**
```
Rev 1:  2025-01-23 12:56:09
Rev 2:  2025-01-23 12:58:13
Rev 3:  2025-01-23 13:02:31
Rev 4:  2025-01-30 09:25:06
Rev 5:  2025-03-05 17:39:33
...
Rev 13: 2025-04-19 18:44:04 (latest)
```

### "What changed between revision 1 and revision 13?"
**Tool:** `compare_revisions`
**Returns:** Detailed comparison showing:
- Files added/modified/removed
- Delta in insertions/deletions
- Per-file changes

---

## 🔍 Specific Revision Details

### "Summarize revision 5"
**Tool:** `get_revision_summary`
**Returns:** Files changed, insertions, deletions, commits for revision 5

### "What files changed in revision 13?"
**Tool:** `get_revision_summary`
**Answer:** 2 files:
1. `kmip_key_view_v2_crs.cc` (+42 insertions, -2 deletions)
2. `kmip_key_view_v2_crs.ut` (+72 insertions, -0 deletions)

### "How many lines were changed in the latest revision?"
**Tool:** `get_revision_summary` (revision=13)
**Answer:** +114 insertions, -2 deletions

### "Show me statistics for each revision"
**Tool:** Loop through `get_revision_summary` for each revision
**Returns:** Complete evolution statistics

---

## 📄 File Content & History Questions

### "Show me the .cc file from revision 1"
**Tool:** `get_file_at_revision`
**Parameters:**
- `filePath`: "//depot/prod/DOT/dev/security/keymanager/keymanager_mgwd/src/tables/external/kmip/kmip_key_view_v2_crs.cc"
- `revisionNumber`: 1
- `type`: "patched"

**Returns:** Complete file content from revision 1

### "What did this file look like BEFORE changes in revision 13?"
**Tool:** `get_file_at_revision`
**Parameters:**
- `revisionNumber`: 13
- `type`: "original" ← Shows the "before" version

### "Track how the .cc file evolved across all revisions"
**Tool:** `get_file_history`
**Returns:** Evolution showing the file in each of 13 revisions with line counts

**Sample output:**
```
Found in 13/13 revisions:
Rev 1:  Original state
Rev 2:  Modified (+10/-5)
Rev 3:  Modified (+5/-2)
...
Rev 13: Final state (+42/-2)
```

### "Show me what the test file looked like 5 revisions ago"
**Tool:** `get_file_at_revision`
**Parameters:**
- `filePath`: "//depot/.../kmip_key_view_v2_crs.ut"
- `revisionNumber`: 8 (13 - 5)

---

## 💬 Comments & Feedback Questions

### "Are there any comments on this review?"
**Tool:** `get_comprehensive_comments_analysis`
**Answer:** Yes! 6 diff comments total

### "Show me all the feedback with code context"
**Tool:** `get_comprehensive_comments_analysis`
**Returns:** Complete analysis including:
- All 6 comments with text, severity, issue status
- Annotated file content showing comments at specific line numbers
- Comment threads and replies

**Sample comment:**
```
Line 69: "nullptr instead of 0?"
  - Reviewer: poorva
  - Severity: minor
  - Status: resolved ✅
```

### "What did reviewers say?"
**Tool:** `get_reviews`
**Returns:** 8 reviews including:
- 3 "Ship It!" approvals (creger, poorva, asafa)
- 5 reviews with detailed feedback
- Timestamps and reviewer names

### "How many ship-its did it get?"
**Tool:** `get_review_request`
**Answer:** ship_it_count = 3

### "Find all comments about 'parallel execution'"
**Tool:** `get_comprehensive_comments_analysis`
**Then filter:** Comments containing "parallel" keyword

**Found:** 1 comment asking "can this be parallel since we are not updating anything in the callback?"

---

## 📊 Files & Diff Questions

### "What files were modified?"
**Tool:** `get_diff_files`
**Answer:** 2 files in latest revision:
1. `kmip_key_view_v2_crs.cc` (modified, 623 total lines)
2. `kmip_key_view_v2_crs.ut` (modified, 474 total lines)

### "Show me the full diff patch"
**Tool:** `get_full_diff_patch`
**Returns:** Complete unified diff in patch format

**Sample:**
```diff
--- a//depot/.../kmip_key_view_v2_crs.cc
+++ b//depot/.../kmip_key_view_v2_crs.cc
@@ -41,6 +41,8 @@
 #include "security_shared/types/HexStringImpl.h"
+#include "smf/smdb/smdb_iterator.h"
+#include "smf/smf/type/filername.h"
...
```

### "How many lines of code were changed total?"
**Tool:** `get_diff_files`
**Calculate:** Sum insert_count and delete_count across all files

**Answer for revision 13:**
- File 1: +42 insertions, -2 deletions
- File 2: +72 insertions, -0 deletions
- **Total: +114/-2 lines**

### "Which file had the most changes?"
**Tool:** `get_diff_files`
**Answer:** kmip_key_view_v2_crs.ut with +72 new lines (all test cases)

---

## ⏱️ Change Timeline Questions

### "Show me the complete history of changes"
**Tool:** `get_review_history`
**Returns:** All changes made to the review request over time

**Sample events:**
- Status updates
- Description changes
- Diff uploads (13 times)
- Field modifications

### "Who made changes and when?"
**Tool:** `get_review_history`
**Returns:** Timeline with:
- User who made each change
- Timestamp
- Fields changed
- Old vs new values

---

## 💬 Comment Resolution & Feedback Questions

### "Were all comments addressed?" 🆕
**Tool:** `analyze_comment_resolution`
**Returns:** Comprehensive analysis showing:
- Which comments were resolved vs dropped
- Whether files were modified after each comment
- Evidence of resolution (explicit status or code changes)
- Summary statistics

**Example for 858846:**
- Total comments: 6
- Resolved: 3 (nullptr, includes, traceEntry)
- Dropped: 3 (parallel, callback error, duplicate)
- All 6 marked as "likely addressed"

### "Did the author fix the issues?"
**Tool:** `analyze_comment_resolution`
**Same as above** - provides evidence-based analysis

### "Which comments are still open?"
**Tool:** `analyze_comment_resolution`
**Answer:** Filters for `issue_status === 'open'` and `needs_attention`

### "Show me all resolved comments with their locations"
**Tool:** `analyze_comment_resolution`
**Returns:** Each comment with:
- File path
- Line numbers (first and last)
- Comment text
- Reviewer name
- Resolution evidence

---

## 🧠 Complex/Tricky Questions

### "Compare the first and last revision to see total evolution"
**Tool:** `compare_revisions`
**Parameters:** fromRevision=1, toRevision=13
**Returns:** Complete delta showing entire journey

**Metrics:**
- Files modified: 2
- Total insertions delta
- Total deletions delta
- File-by-file comparison

### "What was different between revision 7 and 10?"
**Tool:** `compare_revisions`
**Parameters:** fromRevision=7, toRevision=10
**Returns:** Changes in that 3-revision window

### "Show me the original (before) version of the .cc file from revision 13"
**Tool:** `get_file_at_revision`
**Parameters:**
- `revisionNumber`: 13
- `type`: "original" ← Key difference!

**Returns:** The file content BEFORE the changes in revision 13

### "Which revision had the most lines added?"
**Tool:** Loop through all revisions with `get_revision_summary`
**Calculate:** Find max(insertions) across all revisions

### "When were the includes reorganized?"
**Tool:** `get_file_history` + `get_file_at_revision`
**Method:**
1. Track file evolution
2. Compare specific revisions
3. Look for changes in include block (lines 10-44)

**Answer:** Visible in revision 5-6 based on comment "move these to be with the other smf includes"

### "How long did this review take from creation to approval?"
**Tool:** `get_review_request` + `get_reviews`
**Calculate:**
- Created: 2025-01-23T12:56:09Z
- Last Ship It: 2025-04-14T16:47:38Z
- **Duration: ~81 days**

### "Which reviewer gave the most feedback?"
**Tool:** `get_comprehensive_comments_analysis`
**Count comments by reviewer:**
- poorva: 2 comments
- jcomen: 1 comment
- pattk: 3 comments

**Answer:** pattk with 3 comments (most detailed feedback)

### "Are there any unresolved issues?"
**Tool:** `get_review_request`
**Answer:**
- issue_open_count: 0
- issue_resolved_count: 3
- issue_dropped_count: 3

**All issues resolved! ✅**

---

## 🎯 Summary of Capabilities

### What You Can Ask About:

✅ **Review Basics** - Who, what, when, status, bugs
✅ **Revisions** - Count, timestamps, history
✅ **Comparisons** - Any two revisions, delta analysis
✅ **File Content** - Any file at any revision (before/after)
✅ **File Evolution** - Track changes across revisions
✅ **Comments** - All feedback with line-level context
✅ **Reviews** - Approvals, ship-its, reviewer feedback
✅ **Diffs** - Full patches, file lists, line counts
✅ **Timeline** - Change history, who did what when
✅ **Analysis** - Patterns, metrics, comparisons

### Natural Language Patterns Supported:

- "How many X?"
- "When was X?"
- "Who did X?"
- "What changed between X and Y?"
- "Show me X from revision Y"
- "Track how X evolved"
- "Find all X about Y"
- "Compare X vs Y"
- "Summarize X"
- "List all X"

---

## 🚀 Try It Yourself!

All these questions work right now with the 15 tools in the ReviewBoard MCP server. The examples above use **review 858846**, but the same patterns work for ANY review in your ReviewBoard instance!

**Test command:**
```bash
# Set environment variables
export REVIEWBOARD_BASE_URL="https://reviewboard.netapp.com"
export REVIEWBOARD_API_TOKEN="your_token_here"

# Start server and ask questions via LLM
node build/index.js
```

Then ask your LLM assistant any of these questions pointing to any review ID!
