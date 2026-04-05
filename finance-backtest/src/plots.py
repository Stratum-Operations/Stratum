import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from pathlib import Path

CHARTS_DIR = Path(__file__).resolve().parents[1] / "outputs" / "charts"
CHARTS_DIR.mkdir(parents=True, exist_ok=True)

STYLE = {
    "figure.facecolor": "#0d1117",
    "axes.facecolor": "#161b22",
    "axes.edgecolor": "#30363d",
    "axes.labelcolor": "#c9d1d9",
    "xtick.color": "#8b949e",
    "ytick.color": "#8b949e",
    "grid.color": "#21262d",
    "text.color": "#c9d1d9",
    "lines.linewidth": 1.8,
}


def _apply_style():
    plt.rcParams.update(STYLE)


def plot_cumulative_returns(returns, benchmark=None, title="Cumulative Returns", save=True):
    _apply_style()
    cum = (1 + returns).cumprod()
    fig, ax = plt.subplots(figsize=(12, 5))
    ax.plot(cum.index, cum.values, color="#58a6ff", label="Strategy")
    if benchmark is not None:
        bm_cum = (1 + benchmark).cumprod()
        ax.plot(bm_cum.index, bm_cum.values, color="#f78166", label="Benchmark", linestyle="--")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
    ax.set_title(title, fontsize=14, fontweight="bold", pad=12)
    ax.set_ylabel("Cumulative Return")
    ax.legend()
    ax.grid(True, alpha=0.4)
    fig.tight_layout()
    if save:
        fig.savefig(CHARTS_DIR / "cumulative_returns.png", dpi=150)
    plt.close(fig)


def plot_drawdown(returns, save=True):
    _apply_style()
    cum = (1 + returns).cumprod()
    rolling_max = cum.cummax()
    drawdown = (cum - rolling_max) / rolling_max
    fig, ax = plt.subplots(figsize=(12, 4))
    ax.fill_between(drawdown.index, drawdown.values, 0, color="#f85149", alpha=0.6, label="Drawdown")
    ax.set_title("Drawdown", fontsize=14, fontweight="bold", pad=12)
    ax.set_ylabel("Drawdown (%)")
    ax.grid(True, alpha=0.4)
    fig.tight_layout()
    if save:
        fig.savefig(CHARTS_DIR / "drawdown.png", dpi=150)
    plt.close(fig)


def plot_monthly_returns_heatmap(returns, save=True):
    _apply_style()
    monthly = returns.resample("M").apply(lambda x: (1 + x).prod() - 1)
    pivot = monthly.groupby([monthly.index.year, monthly.index.month]).mean().unstack()
    fig, ax = plt.subplots(figsize=(14, max(4, len(pivot) // 2)))
    im = ax.imshow(pivot.values, cmap="RdYlGn", aspect="auto", vmin=-0.1, vmax=0.1)
    ax.set_xticks(range(12))
    ax.set_xticklabels(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"])
    ax.set_yticks(range(len(pivot.index)))
    ax.set_yticklabels(pivot.index.tolist())
    ax.set_title("Monthly Returns Heatmap", fontsize=14, fontweight="bold", pad=12)
    plt.colorbar(im, ax=ax, format="{x:.0%}")
    fig.tight_layout()
    if save:
        fig.savefig(CHARTS_DIR / "monthly_heatmap.png", dpi=150)
    plt.close(fig)
