#!/bin/bash
echo "ClawSquad Installer v1.0.0"
echo "===================="
echo ""
echo "1. Installing dependencies..."
npm install
echo ""
echo "2. Building..."
npm run build
echo ""
echo "3. Configuring API..."
read -p "Select provider (minimax/openai/anthropic): " provider
echo "Provider: $provider"
echo ""
echo "Setup complete!"
echo "Run: npm start"