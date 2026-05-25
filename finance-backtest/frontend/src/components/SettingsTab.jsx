import React, { useState, useEffect } from "react";
import axios from "axios";
import { Landmark, Shield, Link2, Loader2, CheckCircle2, RefreshCw, X } from "lucide-react";

const BROKER_PROFILES = {
  fidelity: {
    name: "Fidelity Investments",
    color: "border-green/30 text-green",
    badgeColor: "bg-green/10 text-green border-green/20",
    holdings: [
      { ticker: "AAPL", shares: 100, cost_basis: 165.0 },
      { ticker: "MSFT", shares: 80, cost_basis: 330.0 },
      { ticker: "NVDA", shares: 120, cost_basis: 95.0 },
      { ticker: "AMZN", shares: 90, cost_basis: 145.0 }
    ]
  },
  schwab: {
    name: "Charles Schwab",
    color: "border-blue/30 text-blue",
    badgeColor: "bg-blue/10 text-blue border-blue/20",
    holdings: [
      { ticker: "SCHD", shares: 250, cost_basis: 72.0 },
      { ticker: "JNJ", shares: 70, cost_basis: 155.0 },
      { ticker: "PG", shares: 80, cost_basis: 145.0 },
      { ticker: "KO", shares: 150, cost_basis: 58.0 }
    ]
  },
  robinhood: {
    name: "Robinhood Financial",
    color: "border-emerald/30 text-emerald-400",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    holdings: [
      { ticker: "TSLA", shares: 120, cost_basis: 185.0 },
      { ticker: "NVDA", shares: 150, cost_basis: 90.0 },
      { ticker: "PLTR", shares: 300, cost_basis: 22.0 },
      { ticker: "COIN", shares: 40, cost_basis: 210.0 }
    ]
  }
};

export default function SettingsTab({ username, setUsername, setView, setData }) {
  const [brokerStates, setBrokerStates] = useState(() => {
    const saved = localStorage.getItem("stratum-broker-connections");
    return saved ? JSON.parse(saved) : {
      fidelity: { status: "idle", progress: 0 },
      schwab: { status: "idle", progress: 0 },
      robinhood: { status: "idle", progress: 0 }
    };
  });

  const [activeBroker, setActiveBroker] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("stratum-broker-connections", JSON.stringify(brokerStates));
  }, [brokerStates]);

  // Initiate connection popup
  const startConnection = (brokerId) => {
    setActiveBroker(brokerId);
    setIsPopupOpen(true);
  };

  // Authorize callback
  const handleAuthorize = () => {
    setIsPopupOpen(false);
    const brokerId = activeBroker;
    if (!brokerId) return;

    // Transition to authenticating
    setBrokerStates(prev => ({
      ...prev,
      [brokerId]: { ...prev[brokerId], status: "authenticating" }
    }));

    // Simulating Plaid / SnapTrade Handshake (1.5 seconds)
    setTimeout(() => {
      // Transition to syncing
      setBrokerStates(prev => ({
        ...prev,
        [brokerId]: { ...prev[brokerId], status: "syncing", progress: 0 }
      }));

      // Simulate download progress bar (1 second total)
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setBrokerStates(prev => ({
          ...prev,
          [brokerId]: { ...prev[brokerId], progress: currentProgress }
        }));

        if (currentProgress >= 100) {
          clearInterval(interval);
          completeSync(brokerId);
        }
      }, 100);

    }, 1500);
  };

  // Complete sync and inject positions
  const completeSync = async (brokerId) => {
    setBrokerStates(prev => ({
      ...prev,
      [brokerId]: { status: "connected", progress: 100 }
    }));

    try {
      const positions = BROKER_PROFILES[brokerId].holdings;
      const res = await axios.post("/api/portfolio/manual", { positions });
      
      // Inject portfolio data
      setData(prev => ({
        ...prev,
        holdings: res.data
      }));

      // Redirect back to Command Center after brief delay
      setTimeout(() => {
        setView("command");
      }, 800);

    } catch (e) {
      console.error("Broker holdings sync failed:", e);
      setBrokerStates(prev => ({
        ...prev,
        [brokerId]: { status: "idle", progress: 0 }
      }));
    }
  };

  // Re-sync manual connection
  const handleResync = (brokerId) => {
    completeSync(brokerId);
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="glass-panel p-6 flex flex-col gap-8" style={{ borderRadius: "var(--radius, 0.625rem)", background: "var(--surface)" }}>
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-text-strong tracking-tight font-sans">Settings</h2>
          <p className="text-xs text-text-3 font-mono mt-1">Configure your personal platform footprint and integrations.</p>
        </div>

        {/* User Identity settings */}
        <div className="flex flex-col gap-2 max-w-md">
          <label className="font-mono text-[10px] uppercase tracking-widest text-text-2">
            User Name
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full font-mono text-[12px] p-2 bg-surface-2 border border-border-2 text-text-strong outline-none focus:border-text-2 transition-colors"
            style={{ borderRadius: "var(--radius, 0.625rem)" }}
            placeholder="Enter username..."
          />
        </div>

        {/* Broker Connection section */}
        <div className="border-t border-border-2 pt-6 flex flex-col gap-4">
          <div>
            <h3 className="font-sans font-bold text-sm text-text-strong tracking-wide uppercase">Brokerage Integrations</h3>
            <p className="font-mono text-[10px] text-text-3 mt-0.5">Connect live brokerage accounts via read-only SnapTrade connection links.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.keys(BROKER_PROFILES).map((brokerId) => {
              const broker = BROKER_PROFILES[brokerId];
              const state = brokerStates[brokerId];

              return (
                <div 
                  key={brokerId}
                  className="bg-surface-2 border border-border-2 p-4 flex flex-col justify-between gap-4"
                  style={{ borderRadius: "var(--radius, 0.625rem)" }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="font-sans font-bold text-xs text-text-strong leading-none">
                        {broker.name}
                      </span>
                      <span className="font-mono text-[9px] text-text-3 uppercase tracking-wider">
                        Read-Only Link
                      </span>
                    </div>
                    <div className={`p-2 border border-border-2 rounded-md ${broker.color}`}>
                      <Landmark size={16} />
                    </div>
                  </div>

                  {/* Connection flows */}
                  <div className="flex flex-col gap-2 mt-2">
                    {state.status === "idle" && (
                      <button
                        onClick={() => startConnection(brokerId)}
                        className="w-full font-mono text-[10px] uppercase tracking-wider py-2 bg-transparent border border-border hover:bg-surface transition-colors cursor-pointer text-text-strong"
                        style={{ borderRadius: "var(--radius, 0.625rem)" }}
                      >
                        Connect
                      </button>
                    )}

                    {state.status === "authenticating" && (
                      <div className="flex items-center justify-center gap-2 py-2 font-mono text-[10px] text-amber">
                        <Loader2 size={13} className="animate-spin" />
                        <span>Connecting Link...</span>
                      </div>
                    )}

                    {state.status === "syncing" && (
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center font-mono text-[9px] text-text-2">
                          <span>Pulling Holdings...</span>
                          <span>{state.progress}%</span>
                        </div>
                        <div className="w-full bg-surface-3 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue h-full transition-all duration-100" 
                            style={{ width: `${state.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {state.status === "connected" && (
                      <div className="flex items-center gap-2">
                        <div 
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 border font-mono text-[10px] font-bold ${broker.badgeColor}`}
                          style={{ borderRadius: "var(--radius, 0.625rem)" }}
                        >
                          <CheckCircle2 size={12} />
                          <span>Connected</span>
                        </div>
                        <button
                          onClick={() => handleResync(brokerId)}
                          title="Sync Now"
                          className="p-2 bg-transparent border border-border hover:bg-surface text-text-3 hover:text-text-strong rounded-md transition-colors cursor-pointer"
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SnapTrade OAuth Authorization Hub Modal */}
      {isPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div 
            className="w-full max-w-sm bg-surface border border-border p-5 shadow-2xl flex flex-col gap-5 text-center"
            style={{ borderRadius: "var(--radius, 0.625rem)" }}
          >
            {/* Header / Padlock icon */}
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-blue/10 text-blue rounded-full border border-blue/20">
                <Shield size={28} />
              </div>
              <h3 className="font-sans font-bold text-md text-text-strong tracking-tight">SnapTrade Integration Link</h3>
              <span className="font-mono text-[8px] bg-surface-2 border border-border-2 text-text-3 px-2 py-0.5 rounded uppercase tracking-wider">
                Secure SSL Handshake
              </span>
            </div>

            {/* Consent details */}
            <p className="font-mono text-[11px] text-text-2 leading-relaxed">
              Stratum requests read-only authorization to retrieve positions, cost basis, and balances from your{" "}
              <strong>{BROKER_PROFILES[activeBroker]?.name}</strong> account.
            </p>

            {/* Shield warning */}
            <div className="bg-surface-2 border border-border-2 p-2.5 rounded-md font-mono text-[9px] text-text-3 text-left">
              🛡️ <strong>Security Guarantee</strong>: Read-only access only. Stratum cannot execute trades or transfer funds. Credentials are never saved.
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 border-t border-border-2 pt-4">
              <button
                onClick={() => setIsPopupOpen(false)}
                className="flex-1 font-mono text-[10px] uppercase tracking-widest border border-border py-2.5 hover:bg-surface-2 cursor-pointer transition-colors"
                style={{ borderRadius: "var(--radius, 0.625rem)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleAuthorize}
                className="flex-1 font-mono text-[10px] uppercase tracking-widest bg-blue border border-blue text-white hover:bg-blue-700 cursor-pointer transition-colors"
                style={{ borderRadius: "var(--radius, 0.625rem)" }}
              >
                Authorize Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
