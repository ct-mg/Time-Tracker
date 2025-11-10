#!/bin/bash

# Script to build multiple extensions for testing multi-extension support
# This demonstrates building the same boilerplate with different KEYs

set -e

echo "🏗️  Building multiple extensions for testing..."
echo ""

# Define extensions to build
EXTENSIONS=("calendar" "events" "users")

# Create output directory
mkdir -p dist-multi-test

for KEY in "${EXTENSIONS[@]}"; do
    echo "📦 Building extension: $KEY"

    # Set the KEY environment variable and build
    VITE_KEY="$KEY" npm run build

    # Move the dist to a separate directory
    mkdir -p "dist-multi-test/$KEY"
    cp -r dist/* "dist-multi-test/$KEY/"

    # Verify the global name in UMD bundle
    GLOBAL_NAME=$(grep -o "ChurchToolsExtension_[a-zA-Z0-9_]*" "dist-multi-test/$KEY/extension.umd.js" | head -1)
    echo "   ✓ Global name: $GLOBAL_NAME"
    echo ""
done

echo "✅ All extensions built successfully!"
echo ""
echo "📁 Built extensions in dist-multi-test/:"
for KEY in "${EXTENSIONS[@]}"; do
    echo "   - $KEY/ (global: ChurchToolsExtension_$KEY)"
done
echo ""
echo "To test, open MULTI_EXTENSION_EXAMPLE.html and update the script paths to:"
for KEY in "${EXTENSIONS[@]}"; do
    echo "   <script src=\"dist-multi-test/$KEY/extension.umd.js\"></script>"
done
