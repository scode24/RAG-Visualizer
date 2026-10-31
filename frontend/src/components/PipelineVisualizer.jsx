import React from 'react';
import { 
  FileText, ShieldCheck, Binary, Zap, Search, 
  ArrowUpDown, Cpu, Award, CheckCircle2, AlertTriangle, 
  XCircle, Clock, ExternalLink 
} from 'lucide-react';

export default function PipelineVisualizer({ events, isProcessing, onSelectStage, selectedStageIndex }) {
  const stageIcons = {
    INGESTION: FileText,
    GUARDRAILS: ShieldCheck,
    EMBEDDING: Binary,
    SEMANTIC_CACHE: Zap,
    HYBRID_RETRIEVAL: Search,
    RERANKING: ArrowUpDown,
    GENERATION: Cpu,
    EVALUATION: Award
  };

  const stageDescriptions = {
    INGESTION: "Prompt parsing & tokenization",
    GUARDRAILS: "Injection, toxicity & PII guard",
    EMBEDDING: "Dense vector projection",
    SEMANTIC_CACHE: "Vector similarity cache lookup",
    HYBRID_RETRIEVAL: "BM25 sparse + Dense RRF",
    RERANKING: "Cross-encoder deep scoring",
    GENERATION: "Google Gemini grounded synthesis",
    EVALUATION: "Faithfulness & hallucination check"
  };

  // If no run has completed yet, show idle blueprint stages
  const defaultStages = [
    { stage: "INGESTION", name: "Prompt Ingestion", status: "PENDING" },
    { stage: "GUARDRAILS", name: "Guardrails & Safety", status: "PENDING" },
    { stage: "EMBEDDING", name: "Query Embedding", status: "PENDING" },
    { stage: "SEMANTIC_CACHE", name: "Semantic Cache", status: "PENDING" },
    { stage: "HYBRID_RETRIEVAL", name: "Hybrid Search (BM25+Dense)", status: "PENDING" },
    { stage: "RERANKING", name: "Cross-Encoder Reranker", status: "PENDING" },
    { stage: "GENERATION", name: "LLM Synthesis (Gemini)", status: "PENDING" },
    { stage: "EVALUATION", name: "RAG Quality Evaluator", status: "PENDING" }
  ];

  const displayStages = events && events.length > 0 ? events : defaultStages;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Real-Time Pipeline Execution Trace
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Click on any stage card to inspect intermediate states, raw scores, and tokens.
          </p>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-medium animate-pulse">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            Prompt traveling through pipeline...
          </div>
        )}
      </div>

      {/* Horizontal Pipeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {displayStages.map((st, idx) => {
          const Icon = stageIcons[st.stage] || FileText;
          const isSelected = selectedStageIndex === idx;
          const isCacheHit = st.status === "CACHE_HIT";
          const isBlocked = st.status === "BLOCKED";
          const isPending = st.status === "PENDING";

          return (
            <div
              key={idx}
              onClick={() => onSelectStage(st, idx)}
              className={`relative cursor-pointer rounded-xl p-4 transition-all duration-200 border text-left group ${
                isSelected
                  ? 'bg-slate-800/90 border-indigo-500 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/50 scale-[1.02]'
                  : isBlocked
                  ? 'bg-rose-950/20 border-rose-800/50 hover:border-rose-700'
                  : isCacheHit
                  ? 'bg-amber-950/20 border-amber-600/50 hover:border-amber-500 shadow-md shadow-amber-500/10'
                  : isPending
                  ? 'bg-slate-900/30 border-slate-800/50 opacity-60'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              }`}
            >
              {/* Header: Stage Step Number + Status Icon */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    isBlocked
                      ? 'bg-rose-500/10 text-rose-400'
                      : isCacheHit
                      ? 'bg-amber-500/10 text-amber-400'
                      : isPending
                      ? 'bg-slate-800 text-slate-500'
                      : 'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 font-medium">
                    STEP 0{idx + 1}
                  </span>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1.5">
                  {st.status === 'COMPLETED' && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" />
                      Done
                    </span>
                  )}
                  {isCacheHit && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-semibold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                      <Zap className="h-3 w-3 fill-amber-300" />
                      HIT
                    </span>
                  )}
                  {st.status === 'CACHE_MISS' && (
                    <span className="text-[11px] text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded-full">
                      Miss
                    </span>
                  )}
                  {isBlocked && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-semibold bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40">
                      <XCircle className="h-3 w-3" />
                      Blocked
                    </span>
                  )}
                  {isPending && (
                    <span className="text-[11px] text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded-full">
                      Ready
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-xs font-semibold text-white tracking-wide truncate">
                {st.name}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                {st.summary || stageDescriptions[st.stage] || "Processing stage"}
              </p>

              {/* Footer: Latency + Click prompt */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                {st.latency_ms !== undefined ? (
                  <span className="flex items-center gap-1 font-mono text-slate-400">
                    <Clock className="h-3 w-3 text-slate-500" />
                    {st.latency_ms} ms
                  </span>
                ) : (
                  <span className="text-slate-600 font-mono">-- ms</span>
                )}

                <span className="flex items-center gap-1 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  Inspect
                  <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

