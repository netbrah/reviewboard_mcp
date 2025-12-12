# ReviewBoard VS Code Extension - Getting Started

## Quick Installation (3 Steps)

### Step 1: Install the Extension

1. Open **VS Code**
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac) to open Extensions
3. Click the **"..."** menu (three dots) at the top right
4. Select **"Install from VSIX..."**
5. Navigate to: `vscode-extension/reviewboard-copilot-tools-1.0.0.vsix`
6. Click **"Install"**
7. Click **"Reload"** when prompted

### Step 2: Configure ReviewBoard Connection

1. Open Settings: `File → Preferences → Settings` (or `Ctrl+,` / `Cmd+,`)
2. Search for **"ReviewBoard"**
3. Set these two settings:
   - **ReviewBoard: Base URL**: `https://your-reviewboard-server.com`
   - **ReviewBoard: API Token**: Your API token

**Getting an API Token:**
1. Log in to ReviewBoard
2. Click your username → "My Account"
3. Go to "API Tokens" tab
4. Click "Generate a new API token"
5. Copy the token and paste it into VS Code settings

### Step 3: Start Using with Copilot

1. Open GitHub Copilot Chat: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Shift+I` (Mac)
2. Type: `@reviewboard /get_review_requests pending`
3. Press Enter

That's it! 🎉

## Common Commands

Try these in Copilot Chat:

### List Reviews
```
@reviewboard /get_review_requests pending
```

### Get Review Details
```
@reviewboard /get_review_request 12345
```

### Get Diff
```
@reviewboard /get_full_diff_patch 12345
```

### Analyze Comments
```
@reviewboard /get_comprehensive_comments_analysis 12345
```

### Compare Revisions
```
@reviewboard /compare_revisions 12345 2 3
```

### Natural Language
```
@reviewboard show me pending reviews
@reviewboard what are the comments on review 12345?
@reviewboard get the diff for 12345
```

## All Available Commands

Type `@reviewboard /` in Copilot Chat and press Tab to see all commands:

- `/get_review_requests` - List review requests
- `/get_review_request` - Get review details
- `/get_reviews` - Get reviews
- `/search` - Search ReviewBoard
- `/get_full_diff_patch` - Get diff patch
- `/get_diff_files` - List changed files
- `/get_comprehensive_comments_analysis` - Analyze comments
- `/analyze_comment_resolution` - Check if comments addressed
- `/get_diff_revisions` - Get revisions
- `/compare_revisions` - Compare revisions
- `/get_file_revision_history` - Track file changes
- `/get_file_at_revision` - Get file at revision
- `/get_file_history` - Get file history
- `/get_revision_summary` - Get revision summary
- `/get_review_history` - Get review history
- `/get_repositories` - List repositories
- `/get_users` - List users

## Troubleshooting

### "ReviewBoard base URL is not configured"
→ Set `reviewboard.baseUrl` in VS Code settings

### "ReviewBoard authentication is not configured"
→ Set `reviewboard.apiToken` in VS Code settings

### "Failed to connect to ReviewBoard API"
→ Verify URL and token are correct

### Extension not showing in Copilot
→ Reload VS Code: `Ctrl+Shift+P` → "Reload Window"

## Need Help?

- 📖 Full documentation: [vscode-extension/README.md](../vscode-extension/README.md)
- 🚀 Quick start: [docs/VSCODE-EXTENSION-QUICKSTART.md](./VSCODE-EXTENSION-QUICKSTART.md)
- 💾 Installation guide: [docs/VSCODE-EXTENSION-INSTALL.md](./VSCODE-EXTENSION-INSTALL.md)
- 📝 Implementation details: [VSCODE-EXTENSION-SUMMARY.md](../VSCODE-EXTENSION-SUMMARY.md)

## Tips

1. **Tab Completion**: After typing `@reviewboard /`, press Tab to see commands
2. **Auto-extract IDs**: Just type the ID anywhere in your message
3. **Natural Language**: You can ask questions naturally
4. **Follow-up Questions**: Ask multiple questions in the same chat
5. **Error Messages**: Check VS Code Output panel if issues occur

## What's Next?

- Try all 17 commands
- Explore natural language queries
- Integrate into your code review workflow
- Provide feedback!

Enjoy using ReviewBoard with GitHub Copilot! 🚀
