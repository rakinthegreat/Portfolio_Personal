#!/bin/bash
# Vercel build: the v2 portfolio (Vite + TypeScript + three.js) in v2/. Output: v2/dist (see vercel.json).
# The original Flutter site still lives at the repo root, but is no longer built or deployed.
set -euo pipefail

cd "$(dirname "$0")/v2"

echo "Node $(node --version), npm $(npm --version)"

echo "Installing v2 dependencies..."
npm ci --no-audit --no-fund

echo "Type-checking and building v2..."
npm run build

echo "Built: $(pwd)/dist"
