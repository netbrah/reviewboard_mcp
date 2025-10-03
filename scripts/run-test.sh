#!/bin/bash

# ReviewBoard MCP Server - Single Test Runner
# Run a specific test file with credentials from .env.test

set -e

# Source .env.test if available
if [ -f ".env.test" ]; then
  echo "📝 Loading configuration from .env.test"
  export $(cat .env.test | grep -v '^#' | grep -v '^$' | xargs)
  echo "✅ Environment loaded: ${REVIEWBOARD_BASE_URL}"
else
  echo "⚠️  .env.test not found!"
  echo "Please create .env.test from template:"
  echo "  cp .env.test.template .env.test"
  exit 1
fi

# Check for test file argument
if [ -z "$1" ]; then
  echo "Usage: $0 <test-file>"
  echo "Example: $0 test/test-patch-diffs.js"
  exit 1
fi

# Run the specified test
echo "🧪 Running: $1"
node "$1"
