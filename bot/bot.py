
import asyncio
import json
import os
import random
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup

BOT_TOKEN = os.getenv("BOT_TOKEN")
CHANNEL = os.getenv("TARGET_CHANNEL")
DATA_FILE = os.getenv("DATA_FILE", "data/data.json")

bot = Bot(BOT_TOKEN)

def load():
    if not os.path.exists(DATA_FILE):
        return {"is_active": False, "interval": 1800, "campaigns": []}
    with open(DATA_FILE) as f:
        return json.load(f)

def build_buttons(btns):
    if not btns: return None
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(b["text"], url=b["url"])]
        for b in btns
    ])

async def send_campaign(c):
    try:
        buttons = build_buttons(c.get("buttons"))
        if c.get("photo"):
            await bot.send_photo(chat_id=CHANNEL, photo=c["photo"], caption=c.get("caption",""), reply_markup=buttons)
        else:
            await bot.send_message(chat_id=CHANNEL, text=c.get("caption",""), reply_markup=buttons)
        print("Sent")
    except Exception as e:
        print("Error:", e)

async def loop():
    while True:
        data = load()
        if not data.get("is_active"):
            await asyncio.sleep(10)
            continue
        for c in data.get("campaigns", []):
            if not c.get("active"): continue
            await send_campaign(c)
            await asyncio.sleep(random.randint(60,120))
        await asyncio.sleep(data.get("interval",1800))

if __name__ == "__main__":
    asyncio.run(loop())
