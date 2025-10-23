#!/bin/bash
# Ridecast Local Setup Script
# This script helps you get Ridecast running locally

set -e  # Exit on error

echo "🚀 Ridecast Local Setup"
echo "======================="
echo ""

# Check if we're in the right directory
if [ ! -f "PROJECT_SUMMARY.md" ]; then
    echo "❌ Please run this script from /Users/chrispark/dev/projects/ridecast"
    exit 1
fi

echo "📋 Setup Checklist:"
echo ""
echo "You'll need:"
echo "  1. Azure Speech API Key (for TTS)"
echo "  2. AWS S3 credentials (for file storage)"
echo "  3. PostgreSQL database (Neon or local)"
echo "  4. Redis database (Upstash or local)"
echo ""
echo "Press Enter to continue or Ctrl+C to exit..."
read

# Step 1: Check backend/.env
echo ""
echo "Step 1: Checking backend configuration..."
echo "==========================================="

if [ ! -f "backend/.env" ]; then
    echo "❌ backend/.env not found!"
    echo "Creating from template..."
    cp backend/.env.example backend/.env
fi

echo "✅ backend/.env exists"
echo ""
echo "Please edit backend/.env and add your credentials:"
echo "  - AZURE_SPEECH_KEY"
echo "  - AZURE_SPEECH_REGION"
echo "  - AWS_ACCESS_KEY_ID"
echo "  - AWS_SECRET_ACCESS_KEY"
echo "  - AWS_S3_BUCKET"
echo "  - DATABASE_URL (from Neon)"
echo "  - REDIS_URL (from Upstash)"
echo ""
echo "Quick links:"
echo "  Azure:  https://portal.azure.com"
echo "  AWS:    https://console.aws.amazon.com/s3"
echo "  Neon:   https://console.neon.tech"
echo "  Upstash: https://console.upstash.com"
echo ""
echo "Open backend/.env now? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    nano backend/.env
fi

# Step 2: Install backend dependencies
echo ""
echo "Step 2: Installing backend dependencies..."
echo "==========================================="
cd backend
if [ ! -d "node_modules" ]; then
    echo "📦 Running npm install..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Step 3: Test database connection
echo ""
echo "Step 3: Testing database connection..."
echo "======================================="
echo "Press Enter when you've updated DATABASE_URL in .env"
read

if [ -z "$DATABASE_URL" ]; then
    source .env
fi

echo "Testing connection to: $DATABASE_URL"
if command -v psql &> /dev/null; then
    if psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
        echo "✅ Database connection successful!"
    else
        echo "❌ Cannot connect to database"
        echo "Please check your DATABASE_URL in backend/.env"
        exit 1
    fi
else
    echo "⚠️  psql not installed, skipping connection test"
fi

# Step 4: Run migrations
echo ""
echo "Step 4: Running database migrations..."
echo "======================================="
npm run migrate

if [ $? -eq 0 ]; then
    echo "✅ Database schema created successfully!"
else
    echo "❌ Migration failed. Please check your database connection."
    exit 1
fi

# Step 5: Install frontend dependencies
echo ""
echo "Step 5: Installing frontend dependencies..."
echo "==========================================="
cd ../web
if [ ! -d "node_modules" ]; then
    echo "📦 Running npm install..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Step 6: Configure frontend
echo ""
echo "Step 6: Configuring frontend..."
echo "================================"
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1" > .env.local
    echo "✅ Created .env.local"
else
    echo "✅ .env.local already exists"
fi

# Final instructions
cd ..
echo ""
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "To start Ridecast:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd /Users/chrispark/dev/projects/ridecast/backend"
echo "  npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd /Users/chrispark/dev/projects/ridecast/web"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo "🎉 Happy coding!"
