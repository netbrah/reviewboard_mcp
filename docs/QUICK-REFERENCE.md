# 🎴 Quick Reference Card - Natural Language Questions

## Copy-Paste Ready Questions for Any Review

Replace `REVIEW_ID` with your review number (e.g., 858846)

---

## 📋 Basic Info
```
What's review REVIEW_ID about?
Who submitted review REVIEW_ID?
What's the status of REVIEW_ID?
Who are the reviewers for REVIEW_ID?
How many ship-its does REVIEW_ID have?
```

## 📅 Revisions
```
How many revisions does REVIEW_ID have?
When was the first revision of REVIEW_ID?
When was the latest revision of REVIEW_ID?
List all revisions for REVIEW_ID
What changed between revision X and Y in REVIEW_ID?
Compare the first and last revision of REVIEW_ID
```

## 🔎 Specific Revision
```
Summarize revision N of REVIEW_ID
What files changed in revision N of REVIEW_ID?
How many lines changed in revision N of REVIEW_ID?
Show me statistics for revision N
```

## 📄 File Content
```
Show me FILE_PATH from revision N of REVIEW_ID
Show me the original (before) version of FILE_PATH from revision N
Show me the patched (after) version of FILE_PATH from revision N
Track how FILE_PATH evolved in REVIEW_ID
What did FILE_PATH look like N revisions ago?
```

## 💬 Comments & Feedback
```
Are there any comments on REVIEW_ID?
Show me all feedback for REVIEW_ID with code context
What did reviewers say about REVIEW_ID?
Find all comments containing "KEYWORD" in REVIEW_ID
Are there any unresolved issues in REVIEW_ID?
Show me all comments by REVIEWER on REVIEW_ID
Were all comments addressed in REVIEW_ID? 🆕
Did the author fix the issues in REVIEW_ID? 🆕
Which comments are still open in REVIEW_ID? 🆕
```

## 📊 Files & Diffs
```
What files were modified in REVIEW_ID?
Show me the full diff patch for REVIEW_ID
How many lines of code changed in REVIEW_ID?
Which file had the most changes in REVIEW_ID?
List all files with their line counts in REVIEW_ID
```

## ⏱️ History & Timeline
```
Show me the complete change history of REVIEW_ID
Who made changes to REVIEW_ID and when?
When was REVIEW_ID last updated?
How long did REVIEW_ID take from creation to approval?
Show me all updates to REVIEW_ID in chronological order
```

## 🧠 Complex Analysis
```
What's the evolution from revision 1 to revision N in REVIEW_ID?
Which revision had the most changes in REVIEW_ID?
Compare revisions X, Y, and Z of REVIEW_ID
Show me how the includes changed across revisions
When were the tests added to REVIEW_ID?
What feedback was addressed vs dropped in REVIEW_ID?
```

---

## 🎯 Real Examples (Review 858846)

### Quick Overview
```bash
$ What's review 858846 about?
→ RFE: Implement Parallel Execution for kmip_key_view_v2
  Author: palanisd | Status: submitted ✅ | Ship-Its: 3
```

### Revision Count
```bash
$ How many revisions does review 858846 have?
→ 13 revisions (Jan 23 - Apr 19, 2025 = 86 days)
```

### File Evolution
```bash
$ Track how kmip_key_view_v2_crs.cc evolved in review 858846
→ Found in all 13 revisions:
  Rev 1:  Initial (589 lines)
  Rev 13: Final (623 lines, +42/-2)
  Total evolution: +34 net lines
```

### Comment Analysis
```bash
$ Are there any comments on review 858846?
→ Yes! 6 comments:
  ✅ 3 resolved (nullptr, includes, traceEntry)
  ⚠️ 3 dropped (design decisions)
```

### Comment Resolution (NEW!)
```bash
$ Were all comments addressed in review 858846?
→ Summary: 6 total comments
  - 3 resolved issues (code changes made)
  - 3 dropped issues (design decisions)
  - All files modified after comments
  - 0 comments need attention
  Evidence: All comments either resolved or documented as won't-fix
```

### Comparison
```bash
$ What changed between revision 1 and 13 in review 858846?
→ 2 files modified:
  - kmip_key_view_v2_crs.cc: +42/-2 lines
  - kmip_key_view_v2_crs.ut: +72/-0 lines
  Total: +114/-2 lines
```

### Specific File
```bash
$ Show me kmip_key_view_v2_crs.cc from revision 1 of review 858846
→ [Returns complete 589-line C++ source file]
```

---

## 🔧 Tool Mapping

| Question Pattern | Tool Used |
|-----------------|-----------|
| "What's review X about?" | `get_review_request` |
| "How many revisions?" | `get_diff_revisions` |
| "Summarize revision N" | `get_revision_summary` |
| "Compare revision X vs Y" | `compare_revisions` |
| "Show file from revision N" | `get_file_at_revision` |
| "Track file evolution" | `get_file_history` |
| "Show comments" | `get_comprehensive_comments_analysis` |
| "Were comments addressed?" 🆕 | `analyze_comment_resolution` |
| "What did reviewers say?" | `get_reviews` |
| "Show diff" | `get_full_diff_patch` |
| "What files changed?" | `get_diff_files` |
| "Show history" | `get_review_history` |

---

## 💡 Pro Tips

### For Catching Up
1. "How many revisions?" → Get the scope
2. "What changed since revision N?" → See recent changes
3. "Are there any comments?" → Check feedback

### For Deep Dive
1. "Show history" → Understand the journey
2. "Compare first vs last" → See total evolution
3. "Track file X evolution" → Follow specific file

### For Code Review
1. "Show comments with code context" → See feedback in place
2. "What files changed?" → Understand scope
3. "Show full diff" → Review all changes

### For Metrics
1. "How long did this take?" → Time tracking
2. "How many ship-its?" → Approval status
3. "How many lines changed?" → Scope measurement

---

## 📱 LLM Chat Examples

### Scenario 1: Quick Status Check
**You:** "Give me a status update on review 858846"

**LLM:** *Calls get_review_request* "Review 858846 is 'RFE: Implement Parallel Execution for kmip_key_view_v2' by palanisd. It's currently submitted and approved with 3 ship-its from creger, poorva, and asafa. There are no open issues. The review went through 13 revisions over 86 days."

### Scenario 2: Understanding Changes
**You:** "What are the main changes in review 858846?"

**LLM:** *Calls get_diff_files + get_revision_summary* "The review modifies 2 files: The main implementation file (kmip_key_view_v2_crs.cc) adds 42 lines and removes 2, implementing parallel execution. The test file (kmip_key_view_v2_crs.ut) adds 72 lines of new test coverage. Total: +114/-2 lines."

### Scenario 3: Feedback Review
**You:** "Were there any concerns raised in review 858846?"

**LLM:** *Calls analyze_comment_resolution* "Yes, there were 6 comments from 3 reviewers. Key issues: poorva suggested using nullptr instead of 0 (resolved), jcomen requested moving includes (resolved), and pattk raised concerns about error handling in callbacks (noted as existing behavior, out of scope for this change). All 3 resolved issues had code changes made in subsequent revisions. The 3 dropped issues were design decisions that were documented as won't-fix."

### Scenario 4: Quick Resolution Status (NEW!)
**You:** "Were all comments in review 858846 addressed?"

**LLM:** *Calls analyze_comment_resolution* "Yes! All 6 comments were addressed: 3 were resolved with code changes (nullptr fix, includes reorganization, traceEntry improvement), and 3 were explicitly marked as dropped with justification (parallel execution question, callback error handling, duplicate comment). The file was modified after all comments, showing active engagement with the feedback. No comments need additional attention."

---

**Copy these questions and start asking! All patterns work with ANY review ID. 🚀**
