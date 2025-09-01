#!/bin/bash

# Change to src directory where Jest is properly configured
cd src

# Test files directory (relative to src)
TEST_DIR="zentara_lsp/src/controller/__tests__"

# Array to store test results
declare -a PASSED_TESTS=()
declare -a FAILED_TESTS=()

echo "Running tests for all files in $TEST_DIR"
echo "Current directory: $(pwd)"
echo "========================================"

# Get all test files
TEST_FILES=($(ls $TEST_DIR/*.test.ts))

# Loop through each test file
for test_file in "${TEST_FILES[@]}"; do
    echo ""
    echo "Running tests for: $test_file"
    echo "----------------------------------------"
    
    # Run jest for the specific test file from src directory
    npx jest "$test_file" --verbose
    
    # Check exit code
    if [ $? -eq 0 ]; then
        PASSED_TESTS+=("$test_file")
        echo "✅ PASSED: $test_file"
    else
        FAILED_TESTS+=("$test_file")
        echo "❌ FAILED: $test_file"
    fi
    
    echo "----------------------------------------"
done

echo ""
echo "========================================"
echo "SUMMARY:"
echo "========================================"
echo "Total test files: ${#TEST_FILES[@]}"
echo "Passed: ${#PASSED_TESTS[@]}"
echo "Failed: ${#FAILED_TESTS[@]}"

if [ ${#PASSED_TESTS[@]} -gt 0 ]; then
    echo ""
    echo "✅ Passed tests:"
    for test in "${PASSED_TESTS[@]}"; do
        echo "  - $(basename $test)"
    done
fi

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo ""
    echo "❌ Failed tests:"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  - $(basename $test)"
    done
fi

echo ""
echo "========================================"