#!/bin/bash

set -e

echo "======================================"
echo "Starting 10Q Application"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Please run: npm run setup"
    exit 1
fi

# Check if OpenAI API key is set
if ! grep -q "OPENAI_API_KEY=sk-" .env; then
    echo "⚠️  Warning: OpenAI API key not set in .env"
    echo "Please edit .env and add your OpenAI API key"
    echo ""
fi

# Check if backend is built
if [ ! -d "backend/dist" ]; then
    echo "Backend not built. Building now..."
    cd backend
    npm run build
    cd ..
    echo ""
fi

# Check if frontend is built
if [ ! -d "frontend/dist" ]; then
    echo "Frontend not built. Building now..."
    cd frontend
    npm run build
    cd ..
    echo ""
fi

# Start the server
echo "Starting server on http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cd backend
npm start
