#!/bin/bash

set -e

echo "Start Panel + Bot..."

# jalanin panel background
node panel/server.js &

# kasih jeda biar stabil
sleep 2

# jalanin bot
python3 bot/bot.py
