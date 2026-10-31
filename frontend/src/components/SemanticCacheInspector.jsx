import React, { useState } from 'react';
import { Zap, Clock, Coins, Trash2, X, CheckCircle2, Search, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export default function SemanticCacheInspector({ isOpen, onClose, cacheStats, onRefreshCache }) {
  const [isClearing, setIsClearing] = useState(false);

  if (!isOpen) return null;

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await api.clearCache();
      await onRefreshCache();
    } catch (err) {
      console.error(err);
    } finally {
      setIsClearing(false);
    }
  };

  const hitRate = cacheStats?.hit_rate_percent || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Semantic Vector Cache Hub</h2>
              <p className="text-xs text-slate-400">
                Vector similarity cache intercepting repetitive prompts with sub-5ms response times.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearCache}
              disabled={isClearing || (cacheStats?.entries_count || 0) === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-800/40 transition disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isClearing ? 'Flushing...' : 'Flush Cache'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm flex-1">

          {/* Stats Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400">Cache Hit Rate</span>
              <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                {hitRate}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {cacheStats?.hits || 0} hits / {cacheStats?.total_queries || 0} calls
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400">Cached Prompts</span>
              <div className="text-2xl font-black font-mono text-white mt-1">
                {cacheStats?.entries_count || 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Active vector keys</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400">Saved Latency</span>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                {(cacheStats?.estimated_saved_latency_ms || 0).toLocaleString()} ms
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Avoided wait time</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400">Saved LLM Tokens</span>
              <div className="text-2xl font-black font-mono text-indigo-400 mt-1">
                {(cacheStats?.estimated_saved_tokens || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">100% cost saved</div>
            </div>
          </div>

          {/* Explanation */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40 text-xs text-indigo-200 leading-relaxed">
            <strong className="text-white">How Semantic Caching Works:</strong> When a user asks a question, we compute its embedding and check cosine similarity against all previous queries. If similarity is <span className="font-mono text-emerald-400 font-bold">≥ 88%</span> (e.g. <em>"What is hybrid search?"</em> vs <em>"Explain hybrid search in RAG"</em>), the cached answer is served instantly without querying the vector database or invoking the LLM API.
          </div>

          {/* Cached Entries List */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Recently Cached Prompts & Responses ({cacheStats?.recent_entries?.length || 0})
            </h3>

            {(!cacheStats?.recent_entries || cacheStats.recent_entries.length === 0) ? (
              <div className="p-8 text-center text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/40 text-xs">
                No queries cached yet. Run prompts in the visualizer to observe semantic cache entries being created and hit!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {cacheStats.recent_entries.map((entry) => (
                  <div key={entry.id} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-400 font-bold">{entry.id}</span>
                        <span className="font-medium text-white font-mono text-[11px]">"{entry.prompt}"</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {entry.hit_count} hits
                        </span>
                        <span>{entry.created_at}</span>
                      </div>
                    </div>
                    <p className="text-slate-400 text-[11px] line-clamp-2 pl-2 border-l-2 border-slate-800 font-sans">
                      {entry.response_preview}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

