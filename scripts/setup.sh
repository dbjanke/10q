#!/bin/bash

set -e

echo "======================================"
echo "10Q Application Setup"
echo "======================================"
echo ""

# Check Node.js version
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js 18 or higher"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js version 18 or higher is required"
    echo "Current version: $(node -v)"
    exit 1
fi

echo "✓ Node.js version: $(node -v)"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and add your OpenAI API key"
    echo ""
else
    echo "✓ .env file already exists"
    echo ""
fi

# Install root dependencies
echo "Installing root dependencies..."
npm install
echo "✓ Root dependencies installed"
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..
echo "✓ Backend dependencies installed"
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..
echo "✓ Frontend dependencies installed"
echo ""

# Create data directory
echo "Creating data directory..."
mkdir -p backend/data
echo "✓ Data directory created"
echo ""

# Build frontend
echo "Building frontend..."
cd frontend
npm run build
cd ..
echo "✓ Frontend built"
echo ""

# Build backend
echo "Building backend..."
cd backend
npm run build
cd ..
echo "✓ Backend built"
echo ""

echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your OpenAI API key"
echo "2. Run: npm start"
echo ""
