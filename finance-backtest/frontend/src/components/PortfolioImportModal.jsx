import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import axios from "axios";
import { X, UploadCloud, FileText, CheckCircle, AlertTriangle } from "lucide-react";

export default function PortfolioImportModal({ isOpen, onClose, onImportSuccess }) {
  const [parsedData, setParsedData] = useState(null); // { headers: [], rows: [] }
  const [mappings, setMappings] = useState({ ticker: "", shares: "", cost_basis: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset modal state on open/close
  useEffect(() => {
    if (isOpen) {
      setParsedData(null);
      setMappings({ ticker: "", shares: "", cost_basis: "" });
      setErrorMsg("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Drop Handler
  const onDrop = useCallback((acceptedFiles) => {
    setErrorMsg("");
    const file = acceptedFiles[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data || [];
        
        if (headers.length === 0 || rows.length === 0) {
          setErrorMsg("Could not parse columns or rows. Please check if this is a valid CSV file.");
          return;
        }

        setParsedData({ headers, rows });
      },
      error: (err) => {
        setErrorMsg(`CSV Parse Error: ${err.message}`);
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false
  });

  // Auto-Map Headers Algorithm
  useEffect(() => {
    if (!parsedData?.headers) return;
    const headers = parsedData.headers;

    const findMatch = (options) => {
      return headers.find(h => {
        const lower = h.toLowerCase().trim().replace(/[\s_-]/g, "");
        return options.some(opt => lower === opt || lower.includes(opt));
      }) || "";
    };

    setMappings({
      ticker: findMatch(["ticker", "symbol", "sym", "stock", "asset", "code"]),
      shares: findMatch(["shares", "qty", "quantity", "amount", "size", "holding"]),
      cost_basis: findMatch(["costbasis", "cost", "avgcost", "purchaseprice", "entryprice", "price", "basis"])
    });
  }, [parsedData]);

  // Submit parsed data
  const onSubmit = async () => {
    if (!mappings.ticker || !mappings.shares) {
      setErrorMsg("Ticker and Shares column mappings are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const positions = parsedData.rows.map(row => {
        const tickerVal = row[mappings.ticker];
        const sharesVal = parseFloat(row[mappings.shares]);
        const costVal = mappings.cost_basis ? parseFloat(row[mappings.cost_basis]) : 0;
        
        if (!tickerVal) return null;

        return {
          ticker: String(tickerVal).trim().toUpperCase(),
          shares: isNaN(sharesVal) ? 0 : sharesVal,
          cost_basis: isNaN(costVal) ? 0.0 : costVal
        };
      }).filter(Boolean);

      if (positions.length === 0) {
        throw new Error("No valid holdings parsed from CSV. Please check your column selections.");
      }

      const response = await axios.post("/api/portfolio/manual", { positions });
      onImportSuccess(response.data);
      onClose();
    } catch (err) {
      console.error("Portfolio ingestion failed:", err);
      setErrorMsg(err.response?.data?.detail || err.message || "Failed to process manual portfolio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Check if mapping is fully mapped
  const isFullyMapped = mappings.ticker && mappings.shares;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-xl bg-surface border border-border p-6 shadow-2xl flex flex-col gap-6"
        style={{ borderRadius: "var(--radius, 0.625rem)" }}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-border-2">
          <div>
            <h3 className="font-sans font-bold text-lg text-text-strong tracking-tight">Import Portfolio CSV</h3>
            <p className="font-mono text-[10px] text-text-3 mt-0.5">Ingest custom holdings from any brokerage export.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-surface-2 rounded-md transition-colors text-text-3 hover:text-text-strong cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error Display */}
        {errorMsg && (
          <div className="border border-red bg-red-dim/10 text-red px-3 py-2 flex items-center gap-2 font-mono text-[11px]">
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Body */}
        {!parsedData ? (
          /* Dropzone UI */
          <div 
            {...getRootProps()} 
            className={`border-dashed border-2 p-8 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-3
              ${isDragActive ? "border-green bg-green-dim/5" : "border-border-2 hover:border-border hover:bg-surface-2"}
            `}
            style={{ borderRadius: "var(--radius, 0.625rem)" }}
          >
            <input {...getInputProps()} />
            <UploadCloud size={36} className={`transition-colors ${isDragActive ? "text-green animate-bounce" : "text-text-3"}`} />
            <div>
              <p className="font-sans font-medium text-[13px] text-text-strong">
                {isDragActive ? "Drop your CSV file here..." : "Drag & drop your portfolio CSV file here"}
              </p>
              <p className="font-mono text-[10px] text-text-3 mt-1">or click to browse local files</p>
            </div>
            <div className="border border-border-2 px-2 py-1 font-mono text-[9px] text-text-3 bg-surface-2">
              SUPPORTED: Standard comma-separated .csv
            </div>
          </div>
        ) : (
          /* Column Mapping Table UI */
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-green font-mono text-[11px]">
              <CheckCircle size={14} />
              <span>File parsed successfully: {parsedData.rows.length} rows loaded.</span>
            </div>

            <div className="border border-border-2 overflow-hidden" style={{ borderRadius: "var(--radius, 0.625rem)" }}>
              <table className="w-full font-mono text-[11px] border-collapse">
                <thead>
                  <tr className="bg-surface-2 border-b border-border-2">
                    <th className="text-left px-3 py-2 text-[9px] uppercase tracking-widest text-text-3 font-normal w-[40%]">Expected Field</th>
                    <th className="text-left px-3 py-2 text-[9px] uppercase tracking-widest text-text-3 font-normal">CSV Header Match</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Ticker Mapper */}
                  <tr className="border-b border-border-2">
                    <td className="px-3 py-2 text-text-strong font-bold">
                      Ticker <span className="text-red">*</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={mappings.ticker}
                        onChange={(e) => setMappings(prev => ({ ...prev, ticker: e.target.value }))}
                        className="w-full bg-surface-2 border border-border-2 p-1.5 text-text outline-none cursor-pointer text-[11px] font-mono"
                      >
                        <option value="">-- Select Column --</option>
                        {parsedData.headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </td>
                  </tr>

                  {/* Shares Mapper */}
                  <tr className="border-b border-border-2">
                    <td className="px-3 py-2 text-text-strong font-bold">
                      Shares <span className="text-red">*</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={mappings.shares}
                        onChange={(e) => setMappings(prev => ({ ...prev, shares: e.target.value }))}
                        className="w-full bg-surface-2 border border-border-2 p-1.5 text-text outline-none cursor-pointer text-[11px] font-mono"
                      >
                        <option value="">-- Select Column --</option>
                        {parsedData.headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </td>
                  </tr>

                  {/* Cost Basis Mapper */}
                  <tr>
                    <td className="px-3 py-2 text-text-2">
                      Cost Basis
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={mappings.cost_basis}
                        onChange={(e) => setMappings(prev => ({ ...prev, cost_basis: e.target.value }))}
                        className="w-full bg-surface-2 border border-border-2 p-1.5 text-text outline-none cursor-pointer text-[11px] font-mono"
                      >
                        <option value="">-- Map to Cost (Optional) --</option>
                        {parsedData.headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mapped Row Previews */}
            {isFullyMapped && (
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[9px] uppercase tracking-widest text-text-3">Ingested Preview (First 3 Rows)</span>
                <div className="border border-border-2 bg-surface-2 p-2 font-mono text-[10px] text-text-2 flex flex-col gap-1">
                  {parsedData.rows.slice(0, 3).map((row, idx) => {
                    const t = row[mappings.ticker] || "—";
                    const s = row[mappings.shares] || "—";
                    const cb = mappings.cost_basis ? row[mappings.cost_basis] : "0";
                    return (
                      <div key={idx} className="flex gap-2">
                        <span className="text-text-3">[{idx + 1}]</span>
                        <span className="text-text-strong font-bold w-12">{t}</span>
                        <span>Shares: <strong className="text-text-strong">{s}</strong></span>
                        <span>•</span>
                        <span>Cost Basis: <strong className="text-text-strong">${cb}</strong></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-border-2">
          {parsedData ? (
            <>
              <button
                type="button"
                onClick={() => setParsedData(null)}
                className="font-mono text-[10px] uppercase tracking-widest border border-border px-4 py-2 hover:bg-surface-2 cursor-pointer transition-colors"
                style={{ borderRadius: "var(--radius, 0.625rem)" }}
              >
                Back to Upload
              </button>
              <button
                type="button"
                disabled={!isFullyMapped || isSubmitting}
                onClick={onSubmit}
                className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 bg-green border border-green text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1.5"
                style={{ borderRadius: "var(--radius, 0.625rem)" }}
              >
                {isSubmitting ? "Processing..." : "Submit to Evaluator"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[10px] uppercase tracking-widest border border-border px-4 py-2 hover:bg-surface-2 cursor-pointer transition-colors"
              style={{ borderRadius: "var(--radius, 0.625rem)" }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
