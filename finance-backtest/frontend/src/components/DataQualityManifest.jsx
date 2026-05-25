import React from "react";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";

export default function DataQualityManifest({ manifest }) {
  if (!manifest || !manifest.flags || manifest.flags.length === 0) return null;

  const { parquet_count = 0, yfinance_count = 0, missing_count = 0, flags = [] } = manifest;

  return (
    <div 
      className="glass-panel p-4 mb-4 border border-border flex flex-col gap-3"
      style={{ borderRadius: "var(--radius, 0.625rem)", background: "var(--surface)" }}
    >
      {/* Title / Header */}
      <div className="flex items-center justify-between border-b border-border-2 pb-2">
        <span className="font-sans font-bold text-xs text-text-strong tracking-wide uppercase">
          Data Quality Manifest
        </span>
        <span className="font-mono text-[9px] text-text-3">
          Verification Diagnostics
        </span>
      </div>

      {/* Counts Grid */}
      <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-text-2 bg-surface-2 p-2 rounded-md border border-border-2">
        <div className="flex items-center gap-1.5 justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-green" />
          <span>Local Parquet: <strong>{parquet_count}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber" />
          <span>yfinance: <strong>{yfinance_count}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-red" />
          <span>Missing/Stale: <strong>{missing_count}</strong></span>
        </div>
      </div>

      {/* Active Flags list */}
      <div className="flex flex-col gap-2">
        {flags.map((flag, idx) => {
          const isAlert = flag.type === "alert";
          const iconColor = isAlert ? "text-red" : "text-amber";
          const bgColor = isAlert ? "bg-red-dim/10 border-red/30" : "bg-amber-dim/10 border-amber/30";
          const textColor = isAlert ? "text-red" : "text-amber";

          return (
            <div 
              key={idx} 
              className={`flex items-start gap-2 p-2 border font-mono text-[10px] ${bgColor} ${textColor}`}
              style={{ borderRadius: "calc(var(--radius, 0.625rem) - 2px)" }}
            >
              <AlertTriangle size={13} className={`flex-shrink-0 mt-0.5 ${iconColor}`} />
              <span className="leading-relaxed">{flag.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
