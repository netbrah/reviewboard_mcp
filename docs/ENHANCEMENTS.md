# ReviewBoard MCP Server Enhancements

## Overview
Enhanced the ReviewBoard MCP server with comprehensive revision diff capabilities, allowing detailed analysis of how code changes evolved across multiple revisions.

## New Capabilities

### 1. Enhanced `get_diff_revisions` Tool

**What Changed:**
- Now includes optional `includePatchDiffs` parameter
- When enabled, returns full unified patch diffs between consecutive revisions

**Usage:**
```typescript
// Get just revision metadata (original behavior)
get_diff_revisions(reviewRequestId: 858846)

// Get metadata + patch diffs between revisions
get_diff_revisions(reviewRequestId: 858846, includePatchDiffs: true)
```

**Response Structure:**
```json
{
  "review_request_id": 858846,
  "total_revisions": 13,
  "revisions": [
    {
      "revision_number": 1,
      "timestamp": "2025-01-23T...",
      "commit_count": 7
    },
    // ... more revisions
  ],
  "patch_diffs": [
    {
      "from_revision": 1,
      "to_revision": 2,
      "patch": "diff --git a/file.py b/file.py\n...",
      "timestamp": "2025-01-24T..."
    },
    // ... diffs for each consecutive revision pair
  ]
}
```

**Use Cases:**
- "Show me what changed between revision 5 and revision 6"
- "Get all patches showing evolution from first to last revision"
- "What code changes were made in each update?"

### 2. New `get_file_revision_history` Tool

**What It Does:**
- Tracks a specific file across all revisions
- Provides patch content for each revision where the file appears
- Calculates inter-revision diffs showing exactly what changed in that file between appearances

**Usage:**
```typescript
get_file_revision_history(
  reviewRequestId: 858846,
  filePath: "src/components/UserProfile.tsx"
)
```

**Response Structure:**
```json
{
  "file_path": "src/components/UserProfile.tsx",
  "total_revisions": 13,
  "revisions_containing_file": 8,
  "file_history": [
    {
      "revision_number": 1,
      "timestamp": "2025-01-23T...",
      "status": "modified",
      "patch": "diff --git a/src/components/UserProfile.tsx ...",
      "lines_inserted": 45,
      "lines_deleted": 12
    },
    // ... entries for each revision where file appears
  ],
  "inter_revision_diffs": [
    {
      "from_revision": 1,
      "to_revision": 3,
      "description": "Changes to src/components/UserProfile.tsx between revisions",
      "note": "Computing diff from patches between consecutive appearances"
    }
  ],
  "summary": {
    "first_appearance": 1,
    "last_appearance": 13,
    "total_modifications": 8,
    "total_lines_inserted": 234,
    "total_lines_deleted": 87
  }
}
```

**Use Cases:**
- "Show me how UserProfile.tsx evolved across all revisions"
- "Get patches for each time config.py was modified"
- "Track the history of a specific file with actual code changes"

## Comparison: Existing vs New Tools

### `get_file_history` (Existing)
**Returns:** Metadata only
- Revision numbers
- Timestamps
- Line counts (inserted/deleted)
- File status

**Use When:** You need quick statistics about file changes

### `get_file_revision_history` (New)
**Returns:** Metadata + Patches
- Everything from `get_file_history`
- Full patch content for each revision
- Inter-revision diffs
- Detailed summary

**Use When:** You need to see actual code changes in the file

## Implementation Details

### Backend Changes (`src/reviewboard-client.ts`)

#### Enhanced Method: `getDiffRevisions()`
```typescript
async getDiffRevisions(
  reviewRequestId: number,
  includePatchDiffs: boolean = false
): Promise<any>
```
- Added optional `includePatchDiffs` parameter
- When true, iterates through consecutive revisions
- Calls `getFullDiffPatch()` for each revision pair
- Returns structured array of patch diffs with metadata

#### New Method: `getFileRevisionHistory()`
```typescript
async getFileRevisionHistory(
  reviewRequestId: number,
  filePath: string
): Promise<any>
```
- Iterates through all revisions
- Uses `getFilePatch()` to retrieve file-specific patches
- Supports partial path matching (e.g., "UserProfile" matches "src/components/UserProfile.tsx")
- Calculates line count statistics across all revisions
- Provides comprehensive summary of file evolution

### MCP Tool Exposure (`src/index.ts`)

#### Updated Tool: `get_diff_revisions`
- Added `includePatchDiffs` optional boolean parameter
- Backward compatible (defaults to false)

#### New Tool: `get_file_revision_history`
- Exposed new `getFileRevisionHistory()` method
- Provides comprehensive file tracking with patches
- Complements existing `get_file_history` tool

## Examples

### Example 1: Track Comment Fixes Across Revisions

**Query:** "Show me the actual code changes that fixed reviewer comments in review 858846"

**Approach:**
1. Use `get_comprehensive_comments_analysis` to identify commented code sections
2. Use `get_file_revision_history` for each affected file
3. Compare patches to see exact fixes

### Example 2: Compare Two Specific Revisions

**Query:** "What changed between revision 5 and revision 6?"

**Approach:**
1. Use `get_diff_revisions` with `includePatchDiffs: true`
2. Filter `patch_diffs` array for the specific revision pair
3. Review the unified patch content

### Example 3: Track Configuration File Changes

**Query:** "Show me every time config.yaml was modified and what changed"

**Approach:**
1. Use `get_file_revision_history(reviewRequestId, "config.yaml")`
2. Review `file_history` array for patches in each revision
3. Check `inter_revision_diffs` to understand evolution

## Testing

To test these enhancements on review 858846:

```bash
# Test enhanced get_diff_revisions
curl -X POST http://localhost:3000/mcp \
  -d '{"tool": "get_diff_revisions", "arguments": {"reviewRequestId": 858846, "includePatchDiffs": true}}'

# Test new get_file_revision_history
curl -X POST http://localhost:3000/mcp \
  -d '{"tool": "get_file_revision_history", "arguments": {"reviewRequestId": 858846, "filePath": "path/to/file.py"}}'
```

## Benefits

1. **Complete Visibility**: See not just what files changed, but the actual code modifications
2. **Reviewer Efficiency**: Quickly review what changed between revisions without switching contexts
3. **Comment Tracking**: Correlate comments to specific code changes that addressed them
4. **Historical Analysis**: Understand how code evolved over the review lifecycle
5. **Debugging**: Identify when specific bugs were introduced or fixed

## Backward Compatibility

All changes are backward compatible:
- Existing `get_diff_revisions` calls work exactly as before
- New `includePatchDiffs` parameter is optional and defaults to `false`
- New `get_file_revision_history` tool is additive
- Existing `get_file_history` tool unchanged

## Future Enhancements

Potential additions:
- Diff between any two arbitrary revisions (not just consecutive)
- Filter patches by file type or directory
- Syntax highlighting for patch content
- Statistical analysis of code churn across revisions
- Integration with comment resolution analysis
