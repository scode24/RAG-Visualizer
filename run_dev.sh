#!/bin/bash
set -e

echo "Starting RAG Visualizer in Development Mode..."

# Activate python venv
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run backend in background
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Run frontend vite dev server
cd frontend
npm run dev &
FRONTEND_PID=$!

echo "🚀 Development environment running:"
echo "Backend API: http://localhost:8000"
echo "Frontend UI:  http://localhost:5173"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait

