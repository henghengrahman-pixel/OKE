#!/bin/bash
set -e

echo "Starting Broadcast Panel + Bot..."

node panel/server.js &
PANEL_PID=$!

sleep 2

python3 bot/bot.py &
BOT_PID=$!

wait $PANEL_PID $BOT_PID
