#!/usr/bin/env bash

# Simple restart script for local dev/prod flow
# 1) Stop running local API (node local-api/server.js)
# 2) Build production web app (web/)
# 3) Start local API in background

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"
WEB_DIR="$ROOT_DIR/web"
API_DIR="$ROOT_DIR/local-api"

echo "[1/3] Stopping local API (if running)..."
# Find any "node ... server.js" whose CWD is exactly $API_DIR
CANDIDATES=$(pgrep -f "node server.js" 2>/dev/null)
PIDS=""
for pid in $CANDIDATES; do
  CWD=""
  # Linux: prefer /proc
  if [[ -e "/proc/$pid/cwd" ]]; then
    CWD=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
  else
    # macOS fallback: lsof
    CWD=$(lsof -p "$pid" 2>/dev/null | awk '$4=="cwd" { $1=$2=$3=$4=""; sub(/^\\s+/, ""); print }' | head -n1)
  fi
  if [[ "$CWD" == "$API_DIR" ]]; then
    PIDS+="$pid "
  fi
done

if [[ -n "$PIDS" ]]; then
  echo "Found local API PID(s) in $API_DIR: $PIDS"
  kill -15 $PIDS 2>/dev/null
  attempts=0
  while true; do
    all_dead=true
    for pid in $PIDS; do
      if kill -0 $pid 2>/dev/null; then
        all_dead=false
        break
      fi
    done
    if $all_dead; then
      echo "OK: Local API stopped."
      break
    fi
    attempts=$((attempts+1))
    if [[ $attempts -ge 20 ]]; then
      echo "WARN: Graceful stop timed out; forcing kill..."
      kill -9 $PIDS 2>/dev/null || true
      sleep 0.2
      echo "OK: Local API killed."
      break
    fi
    sleep 0.25
  done
else
  echo "INFO: Local API was not running."
fi

echo "[2/3] Building production web app..."
if cd "$WEB_DIR" 2>/dev/null; then
  if npm run build; then
    echo "OK: Web app built successfully."
  else
    echo "ERROR: Web app build failed."
    exit 1
  fi
else
  echo "ERROR: Cannot cd to $WEB_DIR"
  exit 1
fi

echo "[3/3] Starting local API in background..."
if cd "$API_DIR" 2>/dev/null; then
  # Log to server.log in local-api directory
  nohup node server.js > server.log 2>&1 &
  API_PID=$!
  sleep 0.5
  if kill -0 $API_PID 2>/dev/null; then
    echo "OK: Local API started (PID $API_PID). Logs: $API_DIR/server.log"
    exit 0
  else
    echo "ERROR: Failed to start local API. See $API_DIR/server.log if created."
    exit 1
  fi
else
  echo "ERROR: Cannot cd to $API_DIR"
  exit 1
fi


