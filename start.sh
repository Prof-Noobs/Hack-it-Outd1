#!/bin/bash
# PyClimaExplorer v2 — Start Script

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     PyClimaExplorer v2 — Starting...     ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check for GROQ key
if grep -q "your_groq_api_key_here" pyclima-backend/.env; then
  echo "⚠️  WARNING: Add your GROQ_API_KEY to pyclima-backend/.env"
  echo "   Get a free key at: https://console.groq.com"
  echo ""
fi

# Start backend
echo "🔧 Starting backend on :8000 ..."
cd pyclima-backend
pip install -r requirements.txt -q
uvicorn api:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Start frontend
echo "🌐 Starting frontend on :3000 ..."
cd pyclima-frontend
npm install --silent
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Backend:  http://localhost:8000"
echo "✅ Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
