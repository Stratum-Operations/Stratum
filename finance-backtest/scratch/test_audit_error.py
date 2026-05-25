import traceback
import sys
import os

# Set cwd and import paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.app import _load_performance_frame, _series_metrics, _safe_float, _compute_health_score, _compute_risk_radar, _compute_defensive_intelligence, METRICS_PATH, LOG_PATH
import pandas as pd

def test_audit():
    try:
        print("Loading performance frame...")
        perf_df = _load_performance_frame()
        print("Computing strategy metrics...")
        strategy_metrics = _series_metrics(perf_df, "Strategy")
        print("Computing benchmark metrics...")
        benchmark_metrics = {
            prefix: _series_metrics(perf_df, prefix)
            for prefix in ["SPY", "QQQ", "MTUM", "QUAL"]
            if f"{prefix}_Return" in perf_df.columns
        }

        print("Checking metrics path...")
        metric_file_columns = []
        if os.path.exists(METRICS_PATH):
            raw_metrics = pd.read_csv(METRICS_PATH)
            metric_file_columns = [c for c in raw_metrics.columns if c not in ["Unnamed: 0", "Metric"]]

        print("Checking log path...")
        latest_holdings = []
        position_count = 0
        latest_date = None
        if os.path.exists(LOG_PATH):
            log_df = pd.read_csv(LOG_PATH)
            latest_date = log_df["date"].max()
            latest_holdings = log_df[log_df["date"] == latest_date].copy().to_dict(orient="records")
            position_count = len([h for h in latest_holdings if _safe_float(h.get("weight")) > 0])

        print("Setting up advanced metrics...")
        advanced_metrics = [
            "Sortino", "Calmar", "Information Ratio", "Tracking Error", "Beta",
            "Alpha", "Drawdown Duration", "Upside Capture", "Downside Capture",
            "VaR", "CVaR", "Ulcer Index", "Skew", "Kurtosis", "Tail Ratio",
            "Hit Rate by Month", "Best/Worst Month", "Exposure-adjusted Return",
        ]
        present_metric_text = " ".join(metric_file_columns)
        missing_metrics = [m for m in advanced_metrics if m.lower() not in present_metric_text.lower()]

        print("Computing health score...")
        health = _compute_health_score(latest_holdings)
        print("Computing risk radar...")
        risk_radar = _compute_risk_radar(latest_holdings)
        print("Computing defensive intelligence...")
        defense = _compute_defensive_intelligence(latest_holdings)

        print("All computed successfully!")

    except Exception as e:
        print(f"Exception: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    test_audit()
