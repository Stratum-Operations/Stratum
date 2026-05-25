import { useState } from 'react'

export default function SettingsTab({ username, setUsername }) {
  return (
    <div className="p-6 max-w-xl">
      <div className="glass-panel p-6 flex flex-col gap-6" style={{ borderRadius: 'var(--radius, 0.625rem)' }}>
        <div>
          <h2 className="text-xl font-bold text-text-strong tracking-tight font-sans">Settings</h2>
          <p className="text-xs text-text-3 font-mono mt-1">Configure your personal platform footprint.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-mono text-[10px] uppercase tracking-widest text-text-2">
            User Name
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full font-mono text-[12px] p-2 bg-surface-2 border border-border-2 text-text-strong outline-none focus:border-text-2 transition-colors"
            style={{ borderRadius: 'var(--radius, 0.625rem)' }}
            placeholder="Enter username..."
          />
        </div>
      </div>
    </div>
  )
}
