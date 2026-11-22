#!/usr/bin/env bash
set -e

PORT=${PORT:-5051}

echo "=================================================="
echo "🚀 PROXIMA BACKEND RUNNER (FastAPI + PostgreSQL)"
echo "=================================================="

# 1. Detect and terminate any conflicting process occupying port 5051
PID=$(lsof -ti:${PORT} 2>/dev/null || true)
if [ -n "$PID" ]; then
  echo "⚠️ Port ${PORT} is occupied by PID ${PID}. Terminating..."
  kill -9 $PID 2>/dev/null || true
  sleep 1
  echo "✅ Port ${PORT} is now freed."
fi

# 2. Change into server directory where pyproject.toml is located
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PYTHONPATH="${ROOT_DIR}:${PYTHONPATH}"
cd "${ROOT_DIR}/server"

# 3. Start FastAPI with nodemon auto-reloader (using -y to prevent prompts)
if command -v nodemon &> /dev/null; then
  echo "📡 Starting FastAPI with global nodemon on port ${PORT}..."
  exec nodemon --watch . -e py --exec "poetry run uvicorn app:app --host 0.0.0.0 --port ${PORT}"
elif command -v npx &> /dev/null; then
  echo "📡 Starting FastAPI with npx -y nodemon on port ${PORT}..."
  exec npx -y nodemon --watch . -e py --exec "poetry run uvicorn app:app --host 0.0.0.0 --port ${PORT}"
else
  echo "⚠️ nodemon/npx not found. Starting native uvicorn with live reload..."
  exec poetry run uvicorn app:app --host 0.0.0.0 --port ${PORT} --reload
fi
