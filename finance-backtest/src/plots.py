import pandas as pd
import matplotlib.pyplot as plt
import os
from pathlib import Path

# Resolve absolute path to the charts directory relative to this file
CHARTS_DIR = Path(__file__).resolve().parent.parent / "outputs" / "charts"

plt.style.use('ggplot')


def plot_equity_curve(performance_data, output_dir=CHARTS_DIR):
    os.makedirs(output_dir, exist_ok=True)
    plt.figure(figsize=(12, 6))
    plt.plot(performance_data.index, performance_data['Strategy_Equity'], label='Strategy (Top 15 Momentum)', linewidth=2)
    plt.plot(performance_data.index, performance_data['SPY_Equity'], label='SPY Benchmark', linewidth=2, linestyle='--')
    plt.title('Strategy vs. SPY: Equity Curve', fontsize=16)
    plt.xlabel('Date', fontsize=12)
    plt.ylabel('Portfolio Value ($)', fontsize=12)
    plt.legend(loc='upper left')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "equity_curve.png"), dpi=300)
    plt.close()


def plot_drawdowns(performance_data, output_dir=CHARTS_DIR):
    os.makedirs(output_dir, exist_ok=True)
    plt.figure(figsize=(12, 6))
    for column in ['Strategy', 'SPY']:
        col_equity = f'{column}_Equity'
        running_max = performance_data[col_equity].cummax()
        drawdown = (performance_data[col_equity] / running_max) - 1
        plt.fill_between(drawdown.index, drawdown, 0, label=f'{column} Drawdown', alpha=0.5)
    plt.title('Historical Drawdowns', fontsize=16)
    plt.xlabel('Date', fontsize=12)
    plt.ylabel('Drawdown (%)', fontsize=12)
    plt.legend(loc='lower left')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "drawdowns.png"), dpi=300)
    plt.close()


def plot_rolling_returns(performance_data, output_dir=CHARTS_DIR, window=252):
    os.makedirs(output_dir, exist_ok=True)
    plt.figure(figsize=(12, 6))
    strat_rolling = performance_data['Strategy_Return'].rolling(window=window).apply(lambda x: (1 + x).prod() - 1)
    spy_rolling = performance_data['SPY_Return'].rolling(window=window).apply(lambda x: (1 + x).prod() - 1)
    plt.plot(strat_rolling.index, strat_rolling * 100, label='Strategy 12M Rolling', linewidth=1.5)
    plt.plot(spy_rolling.index, spy_rolling * 100, label='SPY 12M Rolling', linewidth=1.5, linestyle='--')
    plt.axhline(0, color='black', linewidth=1, alpha=0.5)
    plt.title('12-Month Rolling Returns', fontsize=16)
    plt.xlabel('Date', fontsize=12)
    plt.ylabel('Return (%)', fontsize=12)
    plt.legend(loc='upper left')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "rolling_returns.png"), dpi=300)
    plt.close()