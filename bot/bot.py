
import asyncio, json, os, time
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup

BOT_TOKEN = os.getenv("BOT_TOKEN")
CHANNEL = os.getenv("TARGET_CHANNEL")
DATA_FILE = "panel/data.json"

bot = Bot(BOT_TOKEN)

def load():
    if not os.path.exists(DATA_FILE):
        return {"campaigns":[]}
    with open(DATA_FILE) as f:
        return json.load(f)

def save(data):
    with open(DATA_FILE,"w") as f:
        json.dump(data,f,indent=2)

def build_buttons(btns):
    if not btns: return None
    return InlineKeyboardMarkup([[InlineKeyboardButton(b["text"], url=b["url"])] for b in btns])

async def send_campaign(c):
    try:
        buttons = build_buttons(c.get("buttons"))
        if c.get("photo"):
            await bot.send_photo(chat_id=CHANNEL, photo=c["photo"], caption=c.get("caption",""), reply_markup=buttons)
        else:
            await bot.send_message(chat_id=CHANNEL, text=c.get("caption",""), reply_markup=buttons)
        print("sent:", c["id"])
    except Exception as e:
        print("error:", e)

async def loop():
    while True:
        data = load()
        now = int(time.time())

        for c in data.get("campaigns",[]):
            if not c.get("active"): continue

            if now - c.get("last_send",0) < c.get("interval",1800):
                continue

            await send_campaign(c)
            c["last_send"] = now
            save(data)
            await asyncio.sleep(5)

        await asyncio.sleep(10)

if __name__ == "__main__":
    asyncio.run(loop())
