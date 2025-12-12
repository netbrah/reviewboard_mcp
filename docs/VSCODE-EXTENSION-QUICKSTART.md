# VS Code Extension Quick Start

This guide will help you get started with the ReviewBoard VS Code extension for GitHub Copilot.

## Prerequisites

- VS Code version 1.90.0 or higher
- GitHub Copilot subscription
- ReviewBoard API token or credentials

## Installation

### Option 1: Build from Source

1. Navigate to the extension directory:
   ```bash
   cd vscode-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

4. Package the extension:
   ```bash
   npm run package
   ```

5. Install the generated `.vsix` file:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
   - Click "..." menu → "Install from VSIX..."
   - Select `reviewboard-copilot-tools-1.0.0.vsix`

## Configuration

1. Open VS Code Settings (File → Preferences → Settings)
2. Search for "ReviewBoard"
3. Configure these settings:

   - **ReviewBoard: Base URL**: `https://your-reviewboard-server.com`
   - **ReviewBoard: API Token**: Your ReviewBoard API token (recommended)
   
   OR
   
   - **ReviewBoard: Username**: Your username
   - **ReviewBoard: Password**: Your password

### Getting Your API Token

1. Log in to ReviewBoard
2. Click your username → "My Account"
3. Go to "API Tokens" tab
4. Click "Generate a new API token"
5. Give it a name (e.g., "VS Code Extension")
6. Copy the token and paste into VS Code settings

## Usage Examples

Open GitHub Copilot Chat (Ctrl+Shift+I / Cmd+Shift+I) and try these:

### Basic Commands

```
@reviewboard /get_review_requests pending limit 10
```

```
@reviewboard /get_review_request 12345
```

```
@reviewboard /search authentication bug
```

### Get Diff and Patches

```
@reviewboard /get_full_diff_patch 12345
```

```
@reviewboard /get_diff_files 12345
```

### Analyze Comments

```
@reviewboard /get_comprehensive_comments_analysis 12345
```

```
@reviewboard /analyze_comment_resolution 12345
```

### Compare Revisions

```
@reviewboard /compare_revisions 12345 2 3
```

```
@reviewboard /get_diff_revisions 12345 with patches
```

### Track File Changes

```
@reviewboard /get_file_revision_history 12345 src/auth/login.ts
```

```
@reviewboard /get_file_at_revision 12345 3 src/config.py
```

### Natural Language

You can also ask questions naturally:

```
@reviewboard show me all pending reviews
```

```
@reviewboard what are the comments on review 12345?
```

```
@reviewboard compare revision 2 and 3 of review 12345
```

## Tips

1. **Use Tab Completion**: After typing `@reviewboard /`, press Tab to see available commands

2. **Command Parameters**: Most commands automatically extract IDs from your message:
   - `@reviewboard /get_review_request 12345` ✅
   - `@reviewboard /get_review_request get details for 12345` ✅

3. **Multiple Queries**: You can ask follow-up questions in the same chat

4. **Error Messages**: If you see authentication errors, check your settings

## Troubleshooting

### "ReviewBoard base URL is not configured"
→ Set `reviewboard.baseUrl` in VS Code settings

### "ReviewBoard authentication is not configured"
→ Set `reviewboard.apiToken` (recommended) or username/password

### "Failed to connect to ReviewBoard API"
→ Verify URL, token, and network connectivity

### Extension not responding
→ Reload VS Code: Ctrl+Shift+P → "Reload Window"

### Commands not showing up in Copilot
→ Make sure extension is installed and enabled (check Extensions view)

## Advanced

### Viewing Extension Logs

1. Open Output panel: View → Output
2. Select "ReviewBoard" from dropdown
3. Check for any error messages

### Development Mode

If you're modifying the extension:

```bash
cd vscode-extension
npm run watch
```

Then press F5 in VS Code to launch Extension Development Host.

## Next Steps

- Explore all 17 available commands (see main README)
- Try natural language queries
- Integrate into your code review workflow
- Provide feedback on GitHub

## Support

For issues or feature requests:
- GitHub Issues: https://github.com/netbrah/reviewboard_mcp/issues
- Extension README: [vscode-extension/README.md](../vscode-extension/README.md)
