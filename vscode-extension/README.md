# ReviewBoard Tools for GitHub Copilot

This VS Code extension exposes ReviewBoard API tools to GitHub Copilot Chat, enabling natural language interactions with your ReviewBoard code review system.

## Features

- 🤖 **GitHub Copilot Integration** - All 17 ReviewBoard tools available in Copilot Chat
- 💬 **Natural Language** - Ask questions conversationally
- ⚙️ **Easy Configuration** - Simple VS Code settings for token and URL
- 🔍 **Comprehensive Tools** - Full ReviewBoard API coverage including:
  - Review request management
  - Diff and patch analysis
  - Comment tracking and resolution
  - Revision comparisons
  - File history tracking
  - Search functionality

## Installation

### From VSIX Package

1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
4. Click the "..." menu at the top
5. Select "Install from VSIX..."
6. Choose the downloaded `.vsix` file

### From Source

```bash
cd vscode-extension
npm install
npm run compile
npm run package
```

Then install the generated `.vsix` file.

## Configuration

1. Open VS Code Settings (File > Preferences > Settings)
2. Search for "ReviewBoard"
3. Configure the following settings:

- **ReviewBoard: Base URL** - Your ReviewBoard server URL (e.g., `https://reviewboard.example.com`)
- **ReviewBoard: API Token** - Your ReviewBoard API token (recommended)
- **ReviewBoard: Username** - Your username (if not using API token)
- **ReviewBoard: Password** - Your password (if not using API token)

### Getting an API Token

1. Log in to your ReviewBoard server
2. Go to your user preferences
3. Navigate to "API Tokens"
4. Generate a new token
5. Copy and paste it into VS Code settings

## Usage

Once configured, you can interact with ReviewBoard through GitHub Copilot Chat:

### Using Commands

Open Copilot Chat and use the `@reviewboard` participant with commands:

```
@reviewboard /get_review_requests pending
@reviewboard /get_review_request 12345
@reviewboard /search bug fix
@reviewboard /get_full_diff_patch 12345
@reviewboard /get_comprehensive_comments_analysis 12345
@reviewboard /compare_revisions 12345 2 3
```

### Natural Language Queries

You can also ask questions naturally:

```
@reviewboard show me pending review requests
@reviewboard what are the comments on review 12345?
@reviewboard get the diff for review 12345
@reviewboard compare revision 2 and 3 of review 12345
@reviewboard search for "authentication bug"
```

## Available Commands

### Discovery Tools
- `/get_review_requests` - List review requests with filters
- `/get_review_request` - Get details of a specific review request
- `/search` - Search ReviewBoard content

### Review Tools
- `/get_reviews` - Get reviews for a review request
- `/get_comprehensive_comments_analysis` - Get complete comments analysis
- `/analyze_comment_resolution` - Analyze whether comments were addressed
- `/get_review_history` - Get complete review history

### Diff & Patch Tools
- `/get_full_diff_patch` - Get the complete unified diff patch
- `/get_diff_files` - See what files were changed
- `/get_diff_revisions` - Get diff revisions with optional patches
- `/compare_revisions` - Compare two revisions

### File Tracking Tools
- `/get_file_revision_history` - Track file evolution across revisions
- `/get_file_at_revision` - Get file content at specific revision
- `/get_file_history` - Get file change history
- `/get_revision_summary` - Get summary of revision changes

### Repository Tools
- `/get_repositories` - Get list of repositories
- `/get_users` - Get list of users

## Examples

### Get pending review requests
```
@reviewboard /get_review_requests pending
```

### Get details of a review
```
@reviewboard /get_review_request 858846
```

### Get diff with patches
```
@reviewboard /get_full_diff_patch 858846
```

### Analyze comments
```
@reviewboard /get_comprehensive_comments_analysis 858846
```

### Compare revisions
```
@reviewboard /compare_revisions 858846 5 6
```

### Track file changes
```
@reviewboard /get_file_revision_history 858846 src/auth/login.ts
```

## Troubleshooting

### "ReviewBoard base URL is not configured"
- Make sure you've set the `reviewboard.baseUrl` setting in VS Code
- The URL should include the protocol (https://) and no trailing slash

### "ReviewBoard authentication is not configured"
- Set either `reviewboard.apiToken` or both `reviewboard.username` and `reviewboard.password`
- API token is the recommended authentication method

### "Failed to connect to ReviewBoard API"
- Verify your ReviewBoard server URL is correct
- Check that your API token or credentials are valid
- Ensure you have network access to the ReviewBoard server
- If using self-signed certificates, they are automatically accepted

### Extension not responding
- Reload VS Code (Ctrl+Shift+P / Cmd+Shift+P > "Reload Window")
- Check the Output panel (View > Output > select "ReviewBoard")
- Verify your configuration settings are correct

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Package extension
npm run package
```

### Project Structure

```
vscode-extension/
├── src/
│   ├── extension.ts          # Main extension entry point
│   └── reviewboard-client.ts # ReviewBoard API client
├── out/                       # Compiled JavaScript output
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Related Projects

This extension is part of the ReviewBoard MCP ecosystem:

- **reviewboard-mcp-server** - MCP server for ReviewBoard (stdio mode)
- **reviewboard-mcp-http** - HTTP streaming MCP server for ReviewBoard

## License

MIT

## Contributing

Contributions are welcome! Please see the main repository for contribution guidelines.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
