import React from 'react';
import { Database, Cpu, Zap, Settings, ShieldCheck, RefreshCw, Layers } from 'lucide-react';

export default function Header({
  kbStats,
  cacheStats,
  activeSettings,
  onOpenSettings,
  onOpenKB,
  onOpenCache,
  onReset
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Layers className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">RAG Architect</h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Production System
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-Time Pipeline Trace, Hybrid Search & RAG Evaluation</p>
          </div>
        </div>

        {/* Live System Metrics Badges */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            <span>Indexed Chunks:</span>
            <span className="font-semibold text-emerald-400">{kbStats?.chunk_count || 0}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Cache Hit Rate:</span>
            <span className="font-semibold text-amber-400">{cacheStats?.hit_rate_percent || 0}%</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            <span>LLM:</span>
            <span className="font-semibold text-slate-200">{activeSettings?.llm_model || 'gemini-2.0-flash'}</span>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenKB}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
          >
            <Database className="h-4 w-4 text-emerald-400" />
            <span>Knowledge Base & Chunks</span>
          </button>

          <button
            onClick={onOpenCache}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
          >
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Semantic Cache</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
          >
            <Settings className="h-4 w-4 text-indigo-400" />
            <span>Settings</span>
          </button>
        </div>

      </div>
    </header>
  );
}

