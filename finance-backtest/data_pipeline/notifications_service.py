import requests
import json
import pandas as pd
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")

def send_alert(title, msg, color=0x00ff88):
    payload = {
        "embeds": [{
            "title": title,
            "description": msg,
            "color": color,
            "timestamp": datetime.utcnow().isoformat()
        }]
    }
    if not WEBHOOK_URL:
        return
    try:
        requests.post(WEBHOOK_URL, json=payload)
    except Exception:
        pass

def check_risk_limits(holdings, sector_map):
    df = pd.DataFrame(holdings)
    df["sector"] = df["ticker"].map(sector_map).fillna("Unknown")
    sector_sums = df.groupby("sector")["weight"].sum()
    
    for sector, weight in sector_sums.items():
        if weight > 0.40:
            send_alert("⚠️ Risk Limit Breach", f"Sector **{sector}** exposure at **{weight*100:.1f}%** (Limit: 40%)", 0xff3366)

def check_rank_drift(holdings, current_ranks):
    drifted = []
    for h in holdings:
        t = h["ticker"]
        orig_rank = h["rank"]
        curr_rank = current_ranks.get(t, 999)
        if curr_rank > 50 and orig_rank <= 15:
            drifted.append(f"**{t}** (Rank {orig_rank} -> {curr_rank})")
            
    if drifted:
        send_alert("📉 Rank Drift Alert", "The following top-15 holdings have fallen out of the universe top-50:\n" + "\n".join(drifted), 0x9d4edd)

def notify_rebalance(new_picks, drops, turnover):
    msg = f"**Monthly Rebalance Complete**\n\n"
    msg += f"✅ **New Picks**: {', '.join(new_picks)}\n"
    msg += f"❌ **Dropped**: {', '.join(drops)}\n"
    msg += f"🔄 **Turnover**: {turnover*100:.1f}%"
    send_alert("📅 Rebalance Summary", msg, 0x00e5ff)
