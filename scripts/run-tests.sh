#!/bin/bash

# ReviewBoard MCP Server - Test Runner
# Runs all test suites with proper environment configuration

set -e  # Exit on error

echo "🧪 ReviewBoard MCP Server - Test Suite"
echo "======================================="
echo ""

# Source .env.test if available
if [ -f ".env.test" ]; then
  echo "📝 Loading configuration from .env.test"
  set -a  # Auto-export all variables
  source .env.test
  set +a  # Stop auto-export
  echo "✅ Base URL: $REVIEWBOARD_BASE_URL"
  echo "✅ API Token: ${REVIEWBOARD_API_TOKEN:0:20}..."
else
  echo "⚠️  .env.test not found!"
  echo ""
  echo "Please create .env.test from template:"
  echo "  cp .env.test.template .env.test"
  echo "  # Edit .env.test with your credentials"
  echo ""
  exit 1
fi

# Check if environment variables are set
if [ -z "$REVIEWBOARD_API_TOKEN" ] || [ -z "$REVIEWBOARD_BASE_URL" ]; then
  echo ""
  echo "⚠️  Missing configuration in .env.test!"
  echo "Please set REVIEWBOARD_BASE_URL and REVIEWBOARD_API_TOKEN"
  echo ""
  exit 1
fi

echo ""
echo "Running all test suites..."
echo ""

# Track test results
PASSED=0
FAILED=0
TOTAL=0
START_TIME=$(date +%s)

# Find all test files (js, mjs, cjs)
TEST_FILES=($(find test -maxdepth 1 \( -name "*.js" -o -name "*.mjs" -o -name "*.cjs" \) ! -name "README*" | sort))

echo "📋 Found ${#TEST_FILES[@]} test files"
echo ""

# Find all .js, .mjs, and .cjs test files in test directory
for test_file in "${TEST_FILES[@]}"; do

  TOTAL=$((TOTAL + 1))
  test_name=$(basename "$test_file")

  echo "📦 Running: $test_name"
  echo "----------------------------------------------"

  # Run with inherited environment
  if node "$test_file"; then
    echo "✅ $test_name passed"
    PASSED=$((PASSED + 1))
  else
    echo "❌ $test_name failed"
    FAILED=$((FAILED + 1))
  fi
  echo ""
done

# Summary
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "======================================="
echo "📊 Test Results:"
echo "   Total:    $TOTAL tests"
echo "   Passed:   $PASSED ✅"
echo "   Failed:   $FAILED ❌"
echo "   Duration: ${DURATION}s"
echo "======================================="

if [ $FAILED -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
