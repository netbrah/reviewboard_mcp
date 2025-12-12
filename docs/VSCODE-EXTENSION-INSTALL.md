# Installing the ReviewBoard VS Code Extension

## Quick Install

The ReviewBoard VS Code extension has been packaged and is ready to install.

### Installation Steps

1. **Locate the Extension File**
   - Find `reviewboard-copilot-tools-1.0.0.vsix` in the `vscode-extension/` directory

2. **Install in VS Code**
   - Open VS Code
   - Go to Extensions view: `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
   - Click the "..." menu (three dots) at the top right of the Extensions view
   - Select "Install from VSIX..."
   - Browse to and select `reviewboard-copilot-tools-1.0.0.vsix`
   - Click "Install"

3. **Reload VS Code**
   - After installation, you'll be prompted to reload VS Code
   - Click "Reload Now" or press `Ctrl+R` / `Cmd+R`

4. **Verify Installation**
   - In the Extensions view, search for "ReviewBoard"
   - You should see "ReviewBoard Tools for GitHub Copilot" listed and enabled

## Configuration

After installation, configure the extension:

1. Open Settings: `File → Preferences → Settings` (or `Ctrl+,` / `Cmd+,`)
2. Search for "ReviewBoard"
3. Set the following:

   **Required:**
   - **ReviewBoard: Base URL**: Your ReviewBoard server URL
     - Example: `https://reviewboard.example.com`
     - No trailing slash

   **Authentication (choose one):**
   
   Option A - API Token (Recommended):
   - **ReviewBoard: API Token**: Your ReviewBoard API token

   Option B - Username/Password:
   - **ReviewBoard: Username**: Your ReviewBoard username
   - **ReviewBoard: Password**: Your ReviewBoard password

### Getting an API Token

1. Log in to your ReviewBoard server
2. Click your username in the top right
3. Select "My Account"
4. Go to the "API Tokens" tab
5. Click "Generate a new API token"
6. Give it a descriptive name (e.g., "VS Code Extension")
7. Copy the generated token
8. Paste it into the VS Code setting: `reviewboard.apiToken`

## Using the Extension

Once configured, you can use ReviewBoard commands in GitHub Copilot Chat:

1. Open Copilot Chat: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Shift+I` (Mac)
2. Type `@reviewboard` followed by a command or question

### Example Commands

```
@reviewboard /get_review_requests pending
@reviewboard /get_review_request 12345
@reviewboard /get_full_diff_patch 12345
@reviewboard /search bug fix
@reviewboard /get_comprehensive_comments_analysis 12345
```

### Natural Language

```
@reviewboard show me pending review requests
@reviewboard what are the comments on review 12345?
@reviewboard compare revision 2 and 3 of review 12345
```

## Available Commands

The extension provides 17 ReviewBoard tools:

- `/get_review_requests` - List review requests
- `/get_review_request` - Get review details
- `/get_reviews` - Get reviews for a request
- `/search` - Search ReviewBoard
- `/get_full_diff_patch` - Get complete diff
- `/get_diff_files` - List changed files
- `/get_comprehensive_comments_analysis` - Analyze comments
- `/analyze_comment_resolution` - Check if comments were addressed
- `/get_diff_revisions` - Get diff revisions
- `/compare_revisions` - Compare two revisions
- `/get_file_revision_history` - Track file changes
- `/get_file_at_revision` - Get file at specific revision
- `/get_file_history` - Get file change history
- `/get_revision_summary` - Get revision summary
- `/get_review_history` - Get review history
- `/get_repositories` - List repositories
- `/get_users` - List users

## Troubleshooting

### "ReviewBoard base URL is not configured"
- Check that `reviewboard.baseUrl` is set in VS Code settings
- Ensure the URL starts with `http://` or `https://`
- Remove any trailing slashes

### "ReviewBoard authentication is not configured"
- Set either `reviewboard.apiToken` OR both `reviewboard.username` and `reviewboard.password`
- API token is the recommended method

### "Failed to connect to ReviewBoard API"
- Verify your ReviewBoard URL is correct
- Test the URL in a browser to ensure it's accessible
- Check that your API token or credentials are valid
- Ensure you have network access to the ReviewBoard server
- If using self-signed certificates, the extension automatically accepts them

### Extension not showing in Copilot
- Verify the extension is installed and enabled (check Extensions view)
- Reload VS Code: `Ctrl+Shift+P` → "Reload Window"
- Try restarting VS Code completely

### Commands not autocompleting
- Make sure you're typing `@reviewboard` in Copilot Chat
- Press Tab after typing `@reviewboard /` to see available commands

### Getting detailed errors
1. Open the Output panel: `View → Output`
2. Select "ReviewBoard" from the dropdown
3. Check for detailed error messages

## Uninstalling

To remove the extension:

1. Go to Extensions view: `Ctrl+Shift+X` / `Cmd+Shift+X`
2. Find "ReviewBoard Tools for GitHub Copilot"
3. Click the gear icon → "Uninstall"
4. Reload VS Code

## Updating

To update to a new version:

1. Build/obtain the new `.vsix` file
2. In Extensions view, click "..." → "Install from VSIX..."
3. Select the new `.vsix` file
4. VS Code will replace the old version

## Building from Source

If you want to build the extension yourself:

```bash
cd vscode-extension
npm install
npm run compile
npm run package
```

This will generate a new `reviewboard-copilot-tools-1.0.0.vsix` file.

## Support

- Documentation: [vscode-extension/README.md](../vscode-extension/README.md)
- Quick Start: [docs/VSCODE-EXTENSION-QUICKSTART.md](./VSCODE-EXTENSION-QUICKSTART.md)
- Issues: https://github.com/netbrah/reviewboard_mcp/issues

## Next Steps

- Configure your ReviewBoard credentials
- Try the example commands
- Explore natural language queries
- Integrate into your code review workflow
