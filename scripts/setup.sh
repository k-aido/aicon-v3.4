#!/bin/bash

echo "🚀 Setting up AICON v3.4 development environment..."

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Please run this from the project root directory"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

# Copy environment file
if [ ! -f ".env.local" ]; then
    echo "🔐 Creating environment file..."
    cp ../.env.example .env.local
    echo "⚠️  Please update .env.local with actual values"
fi

# Start development server
echo "🚀 Starting development server..."
echo "Visit http://localhost:3000 to see your working canvas!"
npm run dev
