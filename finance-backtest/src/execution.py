import math
import json
import pandas as pd

def generate_trade_orders(target_weights, total_equity, closing_prices, current_positions=None):
    """
    Calculates the exact integer share count trades (BUY/SELL) needed to transition from
    current portfolio positions to the latest target weights, strictly preventing margin overdraft.
    
    Parameters:
    - target_weights: pd.Series or pd.DataFrame, the latest target portfolio weights (from strategy.py)
    - total_equity: float, current account net asset value (NAV) (e.g. 100,000.0)
    - closing_prices: pd.Series or pd.DataFrame, most recent closing prices of stock assets
    - current_positions: dict or pd.Series, current holdings of shares (defaults to 0 for all)
    
    Returns:
    - JSON string representing Alpaca Trading API compliant order payloads
    """
    # 1. Align and extract latest target weights Series
    if isinstance(target_weights, pd.DataFrame):
        weights = target_weights.iloc[-1]
    elif isinstance(target_weights, pd.Series):
        weights = target_weights
    else:
        weights = pd.Series(target_weights)
        
    # 2. Align and extract latest closing prices Series
    if isinstance(closing_prices, pd.DataFrame):
        prices = closing_prices.iloc[-1]
    elif isinstance(closing_prices, pd.Series):
        prices = closing_prices
    else:
        prices = pd.Series(closing_prices)
        
    # 3. Align current positions
    if current_positions is None:
        positions = pd.Series(0, index=weights.index)
    elif isinstance(current_positions, dict):
        positions = pd.Series(current_positions).reindex(weights.index, fill_value=0)
    elif isinstance(current_positions, pd.Series):
        positions = current_positions.reindex(weights.index, fill_value=0)
    else:
        positions = pd.Series(current_positions).reindex(weights.index, fill_value=0)
        
    orders = []
    
    # 4. Loop over assets to calculate trade orders
    for ticker, w in weights.items():
        # Skip cash placeholders
        if str(ticker).lower() in ['cash', 'usd']:
            continue
            
        price = prices.get(ticker, None)
        if price is None or pd.isna(price) or price <= 0:
            continue
            
        # Target shares = floor( (NAV * target_weight) / price )
        # Using math.floor strictly prevents buying fractional shares that could exceed cash/margin limits
        target_value = total_equity * w
        target_shares = math.floor(target_value / price)
        
        current_shares = positions.get(ticker, 0)
        order_shares = target_shares - current_shares
        
        if order_shares == 0:
            continue
            
        # Determine side / action
        side = "buy" if order_shares > 0 else "sell"
        action = "BUY" if order_shares > 0 else "SELL"
        qty = int(abs(order_shares))
        
        # Build Alpaca-compliant JSON order structure
        # Included both standard Alpaca 'side'/'qty' and explicit 'action'/'quantity' for broad integration
        orders.append({
            "symbol": ticker,
            "qty": qty,
            "quantity": qty,
            "side": side,
            "action": action,
            "type": "market",
            "time_in_force": "day"
        })
        
    return json.dumps(orders, indent=2)
