import React from 'react';
import { 
  X, CheckCircle, AlertTriangle, ShieldAlert, Cpu, 
  Search, ArrowUpDown, Zap, Award, Layers, Code, Hash
} from 'lucide-react';

export default function StageDetailsModal({ stage, onClose }) {
  if (!stage) return null;

  const data = stage.data || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{stage.name}</h3>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  stage.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  stage.status === 'CACHE_HIT' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  stage.status === 'BLOCKED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {stage.status}
                </span>
                {stage.latency_ms !== undefined && (
                  <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {stage.latency_ms} ms
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{stage.summary || "Component telemetry & payload"}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">

          {/* 1. GUARDRAILS DETAIL */}
          {stage.stage === 'GUARDRAILS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Risk Assessment Score</span>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {data.risk_score !== undefined ? `${(data.risk_score * 100).toFixed(0)}%` : '0%'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Threshold: 50%</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Detected PII Elements</span>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {data.detected_pii_count || 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Emails, Phones, SSNs, API Keys</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Safety Decision</span>
                  <div className={`text-base font-bold mt-1 ${data.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {data.passed ? 'ALLOWED & SANITIZED' : 'INTERCEPTED & BLOCKED'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Jailbreak & Injection Shield</div>
                </div>
              </div>

              {data.violations && data.violations.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-rose-400">
                    <ShieldAlert className="h-4 w-4" />
                    Security Flags Triggered:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    {data.violations.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Sanitized Prompt Payload Passed Downstream:
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 break-words whitespace-pre-wrap">
                  {data.processed_prompt || data.original_prompt}
                </div>
              </div>
            </div>
          )}

          {/* 2. SEMANTIC CACHE DETAIL */}
          {stage.stage === 'SEMANTIC_CACHE' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Cosine Similarity Score</span>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    {data.similarity ? (data.similarity * 100).toFixed(1) + '%' : '0.0%'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Required: ≥ {(data.threshold * 100).toFixed(0)}%</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Latency Saved</span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {data.hit ? `~${data.saved_latency_ms || 1200} ms` : '0 ms'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Sub-5ms response on hit</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Tokens Saved</span>
                  <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                    {data.hit ? data.saved_tokens || 350 : 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">100% LLM cost avoidance</div>
                </div>
              </div>

              {data.matched_query && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Matched Cached Query:
                  </h4>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-amber-200">
                    "{data.matched_query}"
                  </div>
                </div>
              )}

              {data.nearest_candidate && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Closest Candidate in Cache (Miss):
                  </h4>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-400">
                    "{data.nearest_candidate}"
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. EMBEDDING DETAIL */}
          {stage.stage === 'EMBEDDING' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Embedding Dimensions</span>
                  <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                    {data.dimensions || 384}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Normalized dense float32 vector</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Active Provider</span>
                  <div className="text-lg font-bold text-white mt-1 capitalize">
                    {data.provider || 'Google text-embedding-004'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Cosine distance metric</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  First 8 Normalized Vector Components:
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300">
                  [{data.embedding_preview ? data.embedding_preview.join(', ') : '...'}, ...]
                </div>
              </div>
            </div>
          )}

          {/* 4. HYBRID RETRIEVAL DETAIL */}
          {stage.stage === 'HYBRID_RETRIEVAL' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Total Chunks in Corpus: <strong className="text-white">{data.total_corpus_chunks || 0}</strong></span>
                <span>Fusion Weights: <strong className="text-indigo-400">{data.stats?.dense_weight || '50%'} Dense</strong> + <strong className="text-amber-400">{data.stats?.bm25_weight || '50%'} BM25</strong></span>
              </div>

              {/* Candidates Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Rank</th>
                      <th className="py-2.5 px-3 font-semibold">Source & Chunk Snippet</th>
                      <th className="py-2.5 px-3 font-semibold text-right">BM25 Rank (Score)</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Dense Rank (Score)</th>
                      <th className="py-2.5 px-3 font-semibold text-right">RRF Blended</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono">
                    {data.candidates && data.candidates.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-bold text-white">#{c.retrieval_rank}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-300 max-w-xs truncate">
                          <div className="font-semibold text-slate-200 text-[11px] truncate">{c.metadata?.filename || c.chunk_id}</div>
                          <div className="text-[11px] text-slate-400 truncate">{c.text}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-400">
                          #{c.bm25_rank} <span className="text-slate-500">({(c.bm25_score * 100).toFixed(0)}%)</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-indigo-400">
                          #{c.dense_rank} <span className="text-slate-500">({(c.dense_score * 100).toFixed(0)}%)</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                          {(c.hybrid_score * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. RERANKING DETAIL */}
          {stage.stage === 'RERANKING' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Reranker Model: <strong className="text-indigo-400 font-mono">{data.model || 'Cross-Encoder'}</strong></span>
                <span>Rank Shifts Detected: <strong className="text-emerald-400">{data.rank_changes_detected || 0}</strong></span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Final Rank</th>
                      <th className="py-2.5 px-3 font-semibold">Original Retrieval Rank</th>
                      <th className="py-2.5 px-3 font-semibold">Chunk Text</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Rerank Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {data.reranked_chunks && data.reranked_chunks.map((rc, i) => (
                      <tr key={i} className="hover:bg-slate-800/40 transition font-mono">
                        <td className="py-2.5 px-3 font-bold text-emerald-400">#{rc.final_rank}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-slate-400">#{rc.original_rank}</span>
                          {rc.rank_delta > 0 && <span className="ml-1 text-[10px] text-emerald-400 font-bold">▲ +{rc.rank_delta}</span>}
                          {rc.rank_delta < 0 && <span className="ml-1 text-[10px] text-rose-400 font-bold">▼ {rc.rank_delta}</span>}
                          {rc.rank_delta === 0 && <span className="ml-1 text-[10px] text-slate-500">-</span>}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-300 max-w-sm truncate text-[11px]">
                          {rc.text}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-indigo-400">
                          {(rc.rerank_score * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. GENERATION DETAIL */}
          {stage.stage === 'GENERATION' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">LLM Engine</span>
                  <div className="text-base font-bold text-white mt-1 truncate">{data.model || 'Gemini 2.0 Flash'}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{data.provider}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Token Consumption</span>
                  <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                    {data.tokens_used || 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Prompt: {data.prompt_tokens || 0} | Gen: {data.completion_tokens || 0}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Generation Latency</span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {data.latency_ms || 0} ms
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">End-to-end token synthesis</div>
                </div>
              </div>

              {data.formatted_prompt && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Exact Prompt Payload Delivered to Gemini:
                  </h4>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-52 overflow-y-auto whitespace-pre-wrap">
                    {data.formatted_prompt}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. EVALUATION DETAIL */}
          {stage.stage === 'EVALUATION' && data && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Faithfulness (Groundedness)</span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {data.metrics?.faithfulness?.score || 0}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Hallucination resistance</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Answer Relevance</span>
                  <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                    {data.metrics?.answer_relevance?.score || 0}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Prompt intent alignment</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Context Precision</span>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    {data.metrics?.context_relevance?.score || 0}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Retrieval signal-to-noise</div>
                </div>
              </div>

              {data.recommendations && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                  <span className="font-semibold text-slate-300">Engineering Recommendations:</span>
                  <ul className="list-disc list-inside text-slate-400 space-y-1">
                    {data.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Raw JSON viewer button at bottom */}
          <details className="mt-4 pt-4 border-t border-slate-800/80">
            <summary className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-indigo-400 transition">
              View Complete Raw Telemetry JSON
            </summary>
            <pre className="mt-2 p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-400 overflow-x-auto max-h-60">
              {JSON.stringify(stage, null, 2)}
            </pre>
          </details>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

