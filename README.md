# ReviewBoard MCP Server

Natural language interface to ReviewBoard for AI assistants via the Model Context Protocol (MCP).

> **📦 Repository Reorganized!** This project has been completely restructured for clarity and maintainability. See [REORGANIZATION_SUMMARY.md](./REORGANIZATION_SUMMARY.md) and [PROJECT_STATUS.md](./PROJECT_STATUS.md) for details.

## 🌟 What's New

**🆕 VS Code Extension for GitHub Copilot!** Now you can use ReviewBoard tools directly in GitHub Copilot Chat:
- 🎯 **Native Copilot Integration** - All 17 tools available as Copilot commands
- ⚙️ **Simple Configuration** - VS Code settings for token and URL
- 💬 **Natural Language** - Ask questions conversationally in Copilot Chat
- 📦 **Ready to Install** - Pre-packaged `.vsix` file included
- 📖 See [Installation Guide](./docs/VSCODE-EXTENSION-INSTALL.md) | [Quick Start](./docs/VSCODE-EXTENSION-QUICKSTART.md) | [README](./vscode-extension/README.md)

**🆕 Enhanced Revision Diff Capabilities!** Now with comprehensive patch-level analysis:
- 🔥 **Revision-to-Revision Patches** - See actual code changes between any consecutive revisions
- 🔥 **File Evolution Tracking** - Track how specific files changed across all revisions with full patches
- 🔥 **Comment Resolution Analysis** - Intelligent analysis of whether feedback was incorporated

**Now with Natural Language Capabilities!** Ask conversational questions like:
- "Show me what code changed between revision 5 and 6"
- "How did UserProfile.tsx evolve across all revisions?"
- "Get patches for each time config.py was modified"
- "Were all comments addressed?" ← **Enhanced with patch diffs!**

See [docs/NATURAL-LANGUAGE-QUESTIONS.md](./docs/NATURAL-LANGUAGE-QUESTIONS.md) for 30+ example questions!
See [docs/ENHANCEMENTS.md](./docs/ENHANCEMENTS.md) for detailed enhancement documentation!

## 🎯 Features

- ✅ **17 Essential Tools** - Including new file revision history with patches
- ✅ **Conversational** - Natural language question support
- ✅ **Patch-Level Analysis** - See actual code changes, not just metadata
- ✅ **Intelligent Analysis** - Track if comments were addressed via code changes
- ✅ **Revision Tracking** - Compare revisions with full unified diffs
- ✅ **File Evolution** - Track specific files across revisions with patches
- ✅ **Comment Analysis** - Get all feedback with line-level code context
- ✅ **Auto-initialization** - Configure once via environment variables
- ✅ **Production-ready** - Comprehensive test coverage

## 📦 Installation

```bash
npm install
npm run build
```

## 🚀 Three Modes of Operation

This project supports **three deployment modes**:

### 1. **VS Code Extension** (GitHub Copilot Integration) 🆕
- Native GitHub Copilot Chat integration
- All 17 ReviewBoard tools available as chat commands
- Configure via VS Code settings (token + URL)
- Perfect for developers using GitHub Copilot
- See [vscode-extension/README.md](./vscode-extension/README.md)

### 2. **stdio Mode** (Local Development)
- Runs as a local process communicating via stdin/stdout
- Perfect for local development with VS Code or Claude Desktop
- One process per client
- Configuration via environment variables or VS Code prompts

### 3. **HTTP Streaming Mode** (Production Deployment)
- Runs as a web service with HTTP + Server-Sent Events (SSE)
- Scalable deployment (Kubernetes, Docker, etc.)
- Multiple concurrent clients
- Integration with LiteLLM proxy for centralized authentication
- Per-request authentication

**Choose your mode based on use case:**
- GitHub Copilot users → Use VS Code extension (`vscode-extension/`)
- Local development → Use stdio mode (`npm start`)
- Production/team deployment → Use HTTP streaming mode (`npm run start:http`)
- Airlock testing → Use Docker + HTTP mode (see [AIRLOCK-TESTING.md](./docs/AIRLOCK-TESTING.md))

## 🔐 LLM Proxy Integration

For production use, this server can be deployed through the **LiteLLM proxy** infrastructure:

### Benefits of LLM Proxy
- ✅ **Centralized Authentication** - Single sign-on with your organization
- ✅ **Access Control** - Group-based permissions management
- ✅ **Standardized API** - Consistent interface across all MCP servers
- ✅ **Monitoring & Logging** - Centralized usage tracking
- ✅ **Rate Limiting** - Protect against abuse

### Connection Methods

**Via LLM Proxy (Production):**
```
https://llm-proxy-api.ai.eng.netapp.com/mcp/reviewboard_netapp
```

**Direct Connection (Development/Testing):**
```
https://mcp-reviewboard.ai.eng.netapp.com
```

See [docs/LLM-PROXY-AUTHENTICATION.md](./docs/LLM-PROXY-AUTHENTICATION.md) for complete authentication guide.

## ⚙️ Configuration

### For stdio Mode (Local Development / VS Code)

The server uses secure input prompts configured in `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "reviewboard": {
      "command": "node",
      "args": ["/path/to/reviewboard_mcp/build/index.js"],
      "env": {
        "REVIEWBOARD_BASE_URL": "${input:reviewboard_base_url}",
        "REVIEWBOARD_API_TOKEN": "${input:reviewboard_api_token}"
      }
    }
  },
  "inputs": [
    {
      "id": "reviewboard_base_url",
      "type": "promptString",
      "description": "ReviewBoard Base URL (e.g., https://reviewboard.netapp.com)"
    },
    {
      "id": "reviewboard_api_token",
      "type": "promptString",
      "description": "ReviewBoard API Token",
      "password": true
    }
  ]
}
```

VS Code will securely prompt for your credentials when the server starts (API token is masked).

**See [examples/vscode-configs/](./examples/vscode-configs/) for complete configuration examples.**

### For HTTP Streaming Mode (Production Deployment)

No environment variables needed! Credentials are provided **per-request** via HTTP headers:

```bash
# Start the HTTP server
npm run start:http

# Credentials provided via HTTP headers
Authorization: Bearer YOUR_REVIEWBOARD_API_TOKEN
X-ReviewBoard-URL: https://reviewboard.netapp.com
```

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for complete deployment guide.

### For LLM Proxy Connection (Team Use)

Connect through the LiteLLM proxy with standardized authentication:

```json
{
  "mcpServers": {
    "reviewboard": {
      "url": "https://llm-proxy-api.ai.eng.netapp.com/mcp/reviewboard_netapp",
      "transport": "sse",
      "headers": {
        "x-litellm-api-key": "${input:llm_api_key}",
        "x-mcp-reviewboard-authorization": "Bearer ${input:reviewboard_api_token}",
        "x-reviewboard-url": "${input:reviewboard_base_url}"
      }
    }
  }
}
```

See [docs/LLM-PROXY-AUTHENTICATION.md](./docs/LLM-PROXY-AUTHENTICATION.md) for complete guide.

### For Testing (Environment Variables)

Copy `.env.test.template` to `.env.test` and fill in your credentials:

```bash
cp .env.test.template .env.test
# Edit .env.test with your actual credentials
```

The test scripts automatically source `.env.test` for credentials.

## 🚀 Quick Start

### stdio Mode (Local Development)
```bash
# Setup testing (one time)
cp .env.test.template .env.test
# Edit .env.test with your credentials

# Run tests (auto-loads .env.test)
npm test

# Start the server (uses VS Code secure prompts)
npm start
```

### HTTP Streaming Mode (Production)
```bash
# Build the server
npm run build

# Start HTTP server
npm run start:http

# Test health endpoint
curl http://localhost:3000/health

# Deploy (choose one)
docker-compose up -d              # Docker Compose
kubectl apply -f k8s-deployment.yaml  # Kubernetes
```

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for complete deployment and registration guide.

See [TESTING.md](./TESTING.md) for stdio testing guide.
See [docs/TESTING-HTTP.md](./docs/TESTING-HTTP.md) for HTTP testing guide.

## 📚 Documentation

**Quick Links:**
- 📖 [Documentation Index](./docs/README.md) - Navigate all documentation
- 🔧 [Project Status](./PROJECT_STATUS.md) - Current capabilities and structure
- 📦 [Reorganization Summary](./REORGANIZATION_SUMMARY.md) - What changed and why
- 🌐 **[HTTP Migration Summary](./docs/HTTP-MIGRATION-SUMMARY.md)** ⭐ **NEW!** - Complete guide to HTTP streaming mode

**Authentication & Deployment:**
- **[docs/LLM-PROXY-AUTHENTICATION.md](./docs/LLM-PROXY-AUTHENTICATION.md)** ⭐ **NEW!** - Complete authentication guide for LLM proxy
- **[docs/AIRLOCK-TESTING.md](./docs/AIRLOCK-TESTING.md)** ⭐ **NEW!** - Test in airlock with Docker
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** ⭐ - Deploy as web service (Kubernetes, Docker, VM)
- **[docs/MANUAL-LITELLM-REGISTRATION.md](./docs/MANUAL-LITELLM-REGISTRATION.md)** ⭐ - Register with LiteLLM proxy
- **[examples/vscode-configs/](./examples/vscode-configs/)** ⭐ **NEW!** - VS Code configuration examples

**Detailed Guides:**
- **[docs/ENHANCEMENTS.md](./docs/ENHANCEMENTS.md)** ⭐ - Detailed guide to new patch diff capabilities
- **[docs/HTTP-STREAMING-MIGRATION.md](./docs/HTTP-STREAMING-MIGRATION.md)** - stdio vs HTTP streaming concepts
- **[docs/TESTING-HTTP.md](./docs/TESTING-HTTP.md)** - Testing guide for HTTP mode
- **[docs/TOOLS.md](./docs/TOOLS.md)** - Complete tool reference with all 17 tools
- **[docs/NATURAL-LANGUAGE-QUESTIONS.md](./docs/NATURAL-LANGUAGE-QUESTIONS.md)** - 30+ natural language questions you can ask
- **[docs/QUICK-REFERENCE.md](./docs/QUICK-REFERENCE.md)** - Quick command reference
- **[docs/TEAMS_MESSAGE.md](./docs/TEAMS_MESSAGE.md)** - Teams announcement with tool descriptions

**Additional Resources:**
- **[examples/](./examples/)** - Example scripts and API exploration tools ([README](./examples/README.md))
- **[test/](./test/)** - Comprehensive test suites ([README](./test/README.md))
- **[scripts/](./scripts/)** - Build and test automation

## 🛠️ Available Tools (17 Total)

### 🔍 Discovery
- `get_review_requests` - List reviews with filters
- `get_review_request` - Get review details
- `search` - Search across ReviewBoard

### 📝 Diffs & Patches
- `get_full_diff_patch` ⭐ - Get complete unified diff
- `get_diff_files` - List changed files
- `get_diff_revisions` ⭐ **ENHANCED!** - List revisions + optional inter-revision patch diffs

### 💬 Comments
- `get_comprehensive_comments_analysis` ⭐ - All comments with code context
- `analyze_comment_resolution` ⭐ - Intelligent analysis: were comments addressed?
- `get_reviews` - Review feedback

### 🔄 Revisions & History
- `get_revision_summary` - Detailed revision stats
- `compare_revisions` - Compare any two revisions
- `get_file_at_revision` - Get file content from specific revision
- `get_file_history` - Track file metadata evolution
- `get_file_revision_history` ⭐ **NEW!** - Track file with full patches across revisions
- `get_review_history` - Change timeline

### 🗂️ Context
- `get_repositories` - List repositories
- `get_users` - List users

## 💬 Example Conversations

### Basic Discovery
**You:** "What's review 858846 about?"
**Assistant:** *Uses get_review_request* "This is an RFE by palanisd to implement parallel execution for kmip_key_view_v2. It has 13 revisions, is approved with 3 ship-its, and took 86 days from creation to approval."

### Revision Analysis with Patches ⭐ **NEW!**
**You:** "Show me what code actually changed between revision 5 and 6"
**Assistant:** *Uses get_diff_revisions with includePatchDiffs* "Between revision 5 and 6, the changes included fixes to nullptr usage in 3 locations and reorganization of includes. Here's the unified patch showing the exact code changes..."

### File Evolution Tracking ⭐ **NEW!**
**You:** "How did UserProfile.tsx evolve across all revisions?"
**Assistant:** *Uses get_file_revision_history* "UserProfile.tsx appeared in 8 of 13 revisions, with a total of +234/-87 lines. Here are the patches showing exactly what changed in each revision..."

### Comment Deep-Dive
**You:** "Were there any concerns?"
**Assistant:** *Uses get_comprehensive_comments_analysis* "Yes, there were 6 comments: 3 were resolved (nullptr usage, include organization, traceEntry text), and 3 were dropped as design decisions (parallel vs serial execution, error handling for callbacks)."

### Comment Resolution Analysis ⭐ **ENHANCED!**
**You:** "Which revision fixed the nullptr issues?"
**Assistant:** *Uses analyze_comment_resolution + get_file_revision_history* "The nullptr usage comment was addressed in revision 6. I can see in the patch that nullptr checks were added at lines 145, 203, and 287."

## 🧪 Testing

Comprehensive test suites included:

```bash
# Run all tests
npm test

# Test patch diff capabilities
npm run test:patch-diffs

# Test revision tracking
npm run test:revision

# Test comment resolution
npm run test:comments

# Run all tests sequentially
npm run test:all
```

**Test Results:**
- ✅ Patch diff capabilities: 6/6 passing
- ✅ Revision tracking: 6/6 passing
- ✅ Comment resolution: 100% accurate
- **Total: 100% success rate**

See [test/](./test/) directory for all test files.

## 📊 Real-World Example

We tested all capabilities on **review 858846**:
- 13 revisions over 86 days
- 2 files modified (+114/-2 lines)
- 6 comments from 3 reviewers
- 8 reviews with 3 ship-its
- Status: Approved ✅

See [docs/REVIEW-858846-ANALYSIS.md](./docs/REVIEW-858846-ANALYSIS.md) for complete analysis.

## 🎯 Use Cases

### For Reviewers
- "Show me what changed since I last looked"
- "Are there any unresolved comments?"
- "What did other reviewers say?"

### For Authors
- "How many ship-its do I have?"
- "What issues need to be addressed?"
- "Show me the complete change history"

### For Managers
- "How long did this review take?"
- "Which reviews are waiting for approval?"
- "Show me review metrics"

### For Learning
- "Track how this feature evolved"
- "Show me all feedback about X"
- "What were the key design decisions?"

## 🔧 Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Clean
npm run clean
```

## 📝 API Version

Compatible with ReviewBoard API v5.0.6+

Tested on: https://reviewboard.netapp.com (v5.0.6)

## 🤝 Contributing

See [docs/ENHANCEMENT-SUMMARY.md](./docs/ENHANCEMENT-SUMMARY.md) for the evolution from 19 tools → 9 → 15 essential tools.

## 📄 License

MIT

## 🌟 Highlights

- **Before:** 19 confusing, overlapping tools
- **After:** 15 powerful, well-organized tools
- **Result:** Natural language conversations about code reviews!

**From technical API → Conversational interface! 🎉**
