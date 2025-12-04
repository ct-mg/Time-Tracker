#!/bin/bash
# Script to push the Feature-refactor branch to remote
# Run this script to push the newly created branch

set -e

echo "Pushing Feature-refactor branch to remote..."
git push -u origin Feature-refactor

echo "Branch Feature-refactor has been pushed successfully!"
echo "You can now work on this branch or create PRs from it."
