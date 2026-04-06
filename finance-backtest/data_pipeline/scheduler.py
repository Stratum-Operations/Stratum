import time
import schedule
from datetime import datetime
import pytz
from data_pipeline.price_service import fetch_prices
from data_pipeline.fundamentals_service import fetch_fundamentals
from data_pipeline.notifications_service import check_risk_limits, check_rank_drift, send_alert
from data_pipeline.metadata_service import get_sector_mapping

def refresh_all_data():
    universes = ["SP500", "NASDAQ100", "RUSSELL1000"]
    for u in universes:
        fetch_prices(u)
        fetch_fundamentals(u)
        
    try:
        ledger = pd.read_csv("data/live_paper_ledger.csv")
        latest_date = ledger["date"].max()
        curr_holdings = ledger[ledger["date"] == latest_date].to_dict(orient="records")
        sector_map = get_sector_mapping()
        check_risk_limits(curr_holdings, sector_map)
        
        # Simulating drift check with latest universe ranks
        # check_rank_drift(curr_holdings, {}) 
    except:
        pass
        
def run_scheduler():
    est = pytz.timezone("US/Eastern")
    schedule.every().day.at("18:00").do(refresh_all_data)
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    refresh_all_data()
    run_scheduler()
