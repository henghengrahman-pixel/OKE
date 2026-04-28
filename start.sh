#!/bin/bash

set -e

echo "Start Panel + Bot..."

# jalanin panel
node panel/server.js &

# delay biar aman
sleep 2

# jalanin bot
python3 bot/bot.py
