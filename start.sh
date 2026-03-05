#!/bin/bash

# File Organizer AI - Startup Script
# This script starts both the backend and frontend servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  File Organizer AI - Startup Script${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Source .env file if it exists
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

# Set default PORT if not in .env
PORT=${PORT:-8000}

echo -e "${BLUE}Backend will run on port: ${PORT}${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cat > .env << EOF
# AI Configuration
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini

# Server Configuration
LOG_LEVEL=INFO

# Backend Port (change if port 8000 is in use)
PORT=8000
EOF
    echo -e "${YELLOW}⚠️  Please edit .env and add your AI API key${NC}"
fi

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ Servers stopped${NC}"
    exit 0
}

# Trap signals to cleanup properly
trap cleanup SIGINT SIGTERM

# Check Python and install backend dependencies
echo -e "${BLUE}🔧 Setting up backend...${NC}"
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
pip install -q -r requirements.txt

echo -e "${GREEN}✅ Backend setup complete${NC}"
echo ""

# Start backend server in background
echo -e "${BLUE}🚀 Starting backend server...${NC}"
PORT=$PORT python main.py &
BACKEND_PID=$!

# Wait for backend to be ready
echo -e "${BLUE}⏳ Waiting for backend to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is running on http://localhost:$PORT${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        cleanup
    fi
done

echo ""

# Setup and start frontend
echo -e "${BLUE}🔧 Setting up frontend...${NC}"
cd "$SCRIPT_DIR/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}✅ Frontend setup complete${NC}"
echo ""

# Start frontend server
echo -e "${BLUE}🚀 Starting frontend server...${NC}"
npm run dev &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

echo ""
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}  File Organizer AI is running!${NC}"
echo -e "${GREEN}=======================================${NC}"
echo ""
echo -e "${BLUE}Backend:${NC}  http://localhost:$PORT"
echo -e "${BLUE}Frontend:${NC} http://localhost:5173"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for both processes
wait
