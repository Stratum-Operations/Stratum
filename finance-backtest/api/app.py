import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Quant Backtest API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PERF_PATH = os.path.join("outputs", "performance.csv")
LOG_PATH = os.path.join("outputs", "rebalance_log_v7.csv")
METRICS_PATH = os.path.join("outputs", "metrics.csv")

@app.get("/api/holdings")
def get_holdings():
    try:
        df = pd.read_csv(LOG_PATH)
        latest_date = df['date'].max()
        recent = df[df['date'] == latest_date].copy()
        
        try:
            sec_df = pd.read_csv(os.path.join("data", "tickers.csv"))
            recent = recent.merge(sec_df[['ticker', 'sector']], on='ticker', how='left')
            recent['sector'] = recent['sector'].fillna('Unknown')
        except Exception:
            recent['sector'] = 'Unknown'
        
        return {
            "date": latest_date,
            "holdings": recent.to_dict(orient="records")
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Rebalance log not found or malformed")

@app.get("/api/performance")
def get_performance():
    try:
        df = pd.read_csv(PERF_PATH)
        if 'Unnamed: 0' in df.columns:
            df = df.rename(columns={'Unnamed: 0': 'date'})
        df = df.fillna(0)
        
        return {
            "dates": df['date'].tolist(),
            "data": df.to_dict(orient="list")
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Performance data not found")

@app.get("/api/metrics")
def get_metrics():
    try:
        df = pd.read_csv(METRICS_PATH)
        if 'Unnamed: 0' in df.columns:
            df = df.rename(columns={'Unnamed: 0': 'Metric'})
        return {"metrics": df.to_dict(orient="records")}
    except Exception:
        raise HTTPException(status_code=500, detail="Metrics not found")
