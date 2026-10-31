#!/bin/bash
set -e

echo "Starting RAG Visualizer in Production Mode..."

# Activate python venv
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Build frontend if dist does not exist
if [ ! -d "frontend/dist" ]; then
    echo "Building frontend production assets..."
    cd frontend
    npm run build
    cd ..
fi

echo "🚀 Production server running on http://localhost:8000"
exec python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000

