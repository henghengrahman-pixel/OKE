import asyncio
import json
import os
import time
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup
import html

BOT_TOKEN = os.getenv("BOT_TOKEN")
TARGET_CHANNEL = os.getenv("TARGET_CHANNEL")
DATA_DIR = os.getenv("DATA_DIR", "data")
DATA_FILE = os.path.join(DATA_DIR, "data.json")

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN belum diisi")
if not TARGET_CHANNEL:
    raise RuntimeError("TARGET_CHANNEL belum diisi")

bot = Bot(BOT_TOKEN)

def ensure_data():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump({"campaigns": []}, f, indent=2)

def load_data():
    ensure_data()
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if "campaigns" not in data or not isinstance(data["campaigns"], list):
                data["campaigns"] = []
            return data
    except Exception as e:
        print("LOAD ERROR:", e, flush=True)
        return {"campaigns": []}

def save_data(data):
    ensure_data()
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def build_buttons(buttons):
    if not buttons:
        return None
    rows = []
    for b in buttons:
        text = str(b.get("text", "")).strip()
        url = str(b.get("url", "")).strip()
        if text and url.startswith(("http://", "https://")):
            rows.append([InlineKeyboardButton(text, url=url)])
    if not rows:
        return None
    return InlineKeyboardMarkup(rows)

# 🔥 FORMAT BOLD + AMAN HTML
def format_bold(text):
    safe = html.escape(text)
    return f"<b>{safe}</b>"

async def send_campaign(campaign):
    reply_markup = build_buttons(campaign.get("buttons", []))
    caption = campaign.get("caption", "") or ""
    photo = campaign.get("photo", "") or ""

    # 🔥 BOLD FORMAT
    caption_bold = format_bold(caption)

    if photo:
        await bot.send_photo(
            chat_id=TARGET_CHANNEL,
            photo=photo,
            caption=caption_bold,
            reply_markup=reply_markup,
            parse_mode="HTML"
        )
    else:
        await bot.send_message(
            chat_id=TARGET_CHANNEL,
            text=caption_bold or "<b>-</b>",
            reply_markup=reply_markup,
            parse_mode="HTML"
        )

async def main_loop():
    print("Bot scheduler ON", flush=True)

    while True:
        data = load_data()
        now = int(time.time())
        changed = False

        for campaign in data.get("campaigns", []):
            if not campaign.get("active", False):
                continue

            interval = int(campaign.get("interval", 1800) or 1800)
            last_send = int(campaign.get("last_send", 0) or 0)

            if now - last_send < interval:
                continue

            try:
                await send_campaign(campaign)
                campaign["last_send"] = int(time.time())
                changed = True
                print("SENT:", campaign.get("id"), flush=True)

            except Exception as e:
                print("SEND ERROR:", campaign.get("id"), e, flush=True)

            await asyncio.sleep(3)

        if changed:
            save_data(data)

        await asyncio.sleep(10)

if __name__ == "__main__":
    asyncio.run(main_loop())
