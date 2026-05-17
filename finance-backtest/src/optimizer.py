import cvxpy as cp
import numpy as np
import pandas as pd

def optimize_portfolio(alpha_scores: pd.Series, cov_matrix: pd.DataFrame, risk_aversion: float = 1.0, max_weight: float = 0.10) -> pd.Series:
    """
    Optimizes portfolio weights using quadratic utility maximization:
        Maximize w^T * alpha - (gamma/2) * w^T * Sigma * w
    Subject to:
        w >= 0 (long-only)
        sum(w) = min(1.0, N * max_weight)
        w <= max_weight
        
    Parameters:
    -----------
    alpha_scores : pd.Series
        Expected return signal scores (alphas) index by asset tickers.
    cov_matrix : pd.DataFrame
        Covariance matrix indexed and columned by asset tickers.
    risk_aversion : float
        Risk aversion parameter (gamma) scaling risk relative to expected return.
    max_weight : float
        Maximum allocation limit for any single position.
        
    Returns:
    --------
    pd.Series
        Optimal target weights indexed by asset tickers.
    """
    # Clean inputs
    alpha_scores = alpha_scores.fillna(0.0)
    tickers = alpha_scores.index.tolist()
    N = len(tickers)
    
    if N == 0:
        return pd.Series(dtype=float)
        
    # Ensure covariance matrix aligns with tickers
    cov_matrix = cov_matrix.loc[tickers, tickers].fillna(0.0)
    
    # Regularize covariance matrix to ensure it is positive definite
    Sigma = cov_matrix.values
    # Add a small diagonal perturbation for numerical stability
    Sigma = Sigma + 1e-6 * np.eye(N)
    
    # Optimization variable
    w = cp.Variable(N)
    
    # Objective function: Expected return minus risk penalty
    expected_return = w @ alpha_scores.values
    risk = cp.quad_form(w, Sigma)
    objective = cp.Maximize(expected_return - 0.5 * risk_aversion * risk)
    
    # Sum constraint depends on N to prevent infeasibility when N < 1/max_weight
    target_sum = min(1.0, N * max_weight)
    
    constraints = [
        w >= 0,
        w <= max_weight,
        cp.sum(w) == target_sum
    ]
    
    # Solve optimization problem
    prob = cp.Problem(objective, constraints)
    try:
        # OSQP is fast and standard for QPs
        prob.solve(solver=cp.OSQP, verbose=False)
    except Exception:
        try:
            # Try default/fallback solver
            prob.solve(verbose=False)
        except Exception:
            pass
            
    # Parse results
    if prob.status in [cp.OPTIMAL, cp.OPTIMAL_INACCURATE] and w.value is not None:
        opt_weights = pd.Series(w.value, index=tickers)
        # Zero out tiny values due to float inaccuracies
        opt_weights[opt_weights < 1e-5] = 0.0
        # Re-scale to ensure the sum matches exactly
        total_weight = opt_weights.sum()
        if total_weight > 0:
            opt_weights = (opt_weights / total_weight) * target_sum
        return opt_weights.fillna(0.0)
    else:
        # Fallback to equal weighting if optimization fails or is infeasible
        print(f"Warning: Portfolio optimization failed with status {prob.status}. Falling back to equal weighting.")
        eq_weight = target_sum / N if N > 0 else 0.0
        return pd.Series(eq_weight, index=tickers)
