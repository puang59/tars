#!/bin/bash
# Script to build, sign with entitlements, and run TARS

set -e

echo "🔨 Building TARS..."
bun tauri build --debug 2>&1 | grep -v "bundle_dmg.sh" || true

echo ""
echo "✍️ Signing with entitlements..."
codesign --force --deep --sign - \
  --entitlements src-tauri/entitlements.plist \
  src-tauri/target/debug/bundle/macos/TARS.app

echo ""
echo "✅ Verifying entitlements..."
codesign -d --entitlements - src-tauri/target/debug/bundle/macos/TARS.app

echo ""
echo "🚀 Opening TARS..."
open src-tauri/target/debug/bundle/macos/TARS.app

echo ""
echo "✨ Done!"

