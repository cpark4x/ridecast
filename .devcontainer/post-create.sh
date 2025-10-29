#!/usr/bin/env bash
set -euo pipefail

# Post-Create Setup Script
# Runs automatically after Codespace container is created
# Configures Git and reports environment status

# Log file for troubleshooting
LOG_FILE="/tmp/devcontainer-post-create.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "========================================="
echo "Post-create script starting at $(date)"
echo "========================================="

echo ""
echo "🔧  Configuring Git for auto-push..."
git config --global push.autoSetupRemote true
echo "    ✅ Git configured"

echo ""
echo "📦  Cloning latest amplifier toolkit..."
if [ ! -d "/workspaces/amplifier" ]; then
    git clone https://github.com/cpark4x/amplifier.git /workspaces/amplifier
    echo "    ✅ Amplifier cloned to /workspaces/amplifier"
else
    echo "    ℹ️  Amplifier already exists, pulling latest..."
    cd /workspaces/amplifier && git pull
fi

echo ""
echo "🔗  Symlinking amplifier to project..."
# In Codespaces, this is /workspaces/ridecast
PROJECT_ROOT="${CODESPACE_VSCODE_FOLDER:-/workspaces/ridecast}"
cd "$PROJECT_ROOT"
if [ ! -L "amplifier" ]; then
    ln -s /workspaces/amplifier amplifier
    echo "    ✅ Amplifier symlinked at $PROJECT_ROOT/amplifier"
else
    echo "    ℹ️  Amplifier symlink already exists"
fi

echo ""
echo "📦  Setting up amplifier dependencies..."
cd /workspaces/amplifier
if [ -f "pyproject.toml" ]; then
    uv sync
    echo "    ✅ Amplifier dependencies installed"
else
    echo "    ⚠️  pyproject.toml not found, skipping uv sync"
fi

echo ""
echo "🔧  Setting up amplifier .env..."
cd /workspaces/amplifier
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    cp .env.example .env
    echo "    ✅ .env created from .env.example"
    echo "    ⚠️  Remember to add your API keys to .env"
else
    echo "    ℹ️  .env already exists or .env.example not found"
fi

# Return to project root
PROJECT_ROOT="${CODESPACE_VSCODE_FOLDER:-/workspaces/ridecast}"
cd "$PROJECT_ROOT"
echo "📂  Working directory: $PROJECT_ROOT"

# Install Ridecast dependencies
echo ""
echo "📦  Installing Ridecast backend dependencies..."
if [ -f "backend/pyproject.toml" ]; then
    cd backend
    uv sync
    echo "    ✅ Backend dependencies installed"
    cd "$PROJECT_ROOT"
else
    echo "    ⚠️  backend/pyproject.toml not found"
fi

echo ""
echo "📦  Installing Ridecast frontend dependencies..."
if [ -f "web/package.json" ]; then
    cd web
    npm install
    echo "    ✅ Frontend dependencies installed"
    cd "$PROJECT_ROOT"
else
    echo "    ⚠️  web/package.json not found"
fi

echo ""
echo "📝  Next steps:"
echo "  1. Set up your environment variables in backend/.env"
echo "  2. Start PostgreSQL and Redis services"
echo "  3. Run 'npm run dev' in the web directory"
echo "  4. Run backend server"

echo ""
echo "========================================="
echo "✅  Post-create tasks complete at $(date)"
echo "========================================="
echo ""
echo "📋 Development Environment Ready:"
echo "  • Python: $(python3 --version 2>&1 | cut -d' ' -f2)"
echo "  • uv: $(uv --version 2>&1)"
echo "  • Node.js: $(node --version)"
echo "  • npm: $(npm --version)"
echo "  • pnpm: $(pnpm --version)"
echo "  • Git: $(git --version | cut -d' ' -f3)"
echo "  • Make: $(make --version 2>&1 | head -n 1 | cut -d' ' -f3)"
echo "  • Claude CLI: $(claude --version 2>&1 || echo 'NOT INSTALLED')"
echo ""
echo "💡 Logs saved to: $LOG_FILE"
echo ""
