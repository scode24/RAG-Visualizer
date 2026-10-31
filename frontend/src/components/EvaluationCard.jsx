import React from 'react';
import { Award, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, Activity } from 'lucide-react';

export default function EvaluationCard({ evaluation, latencies, totalLatencyMs }) {
  if (!evaluation) {
    return (
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 text-center text-slate-500 text-xs">
        Run a query to generate comprehensive RAG evaluation metrics (Faithfulness, Relevance, Hallucination Risk).
      </div>
    );
  }

  const { overall_score, status, grade_color, hallucination_risk, summary, metrics, recommendations } = evaluation;

  const getStatusBadge = () => {
    switch (status) {
      case 'EXCELLENT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'GOOD':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'ACCEPTABLE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
  };

  const getProgressBarColor = (val) => {
    if (val >= 80) return 'bg-emerald-500';
    if (val >= 65) return 'bg-blue-500';
    if (val >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl backdrop-blur-sm space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">Automated RAG Evaluation</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge()}`}>
                {status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{summary}</p>
          </div>
        </div>

        {/* Big Overall Score Meter */}
        <div className="flex items-baseline gap-1 self-start sm:self-auto bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800">
          <span className="text-2xl font-black font-mono text-white">{overall_score}%</span>
          <span className="text-[11px] font-medium text-slate-400">Quality Score</span>
        </div>
      </div>

      {/* Triad Metrics Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics && Object.entries(metrics).map(([key, item]) => (
          <div key={key} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">{item.label}</span>
              <span className="text-xs font-mono font-bold text-white">{item.score}%</span>
            </div>
            {/* Progress Track */}
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${getProgressBarColor(item.score)}`}
                style={{ width: `${item.score}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">{item.description}</p>
          </div>
        ))}
      </div>

      {/* Hallucination Risk Alert & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`h-4 w-4 ${hallucination_risk === 'Low' ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-slate-400">Hallucination Risk:</span>
          </div>
          <span className={`font-semibold ${
            hallucination_risk === 'Low' ? 'text-emerald-400' :
            hallucination_risk.includes('Moderate') ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {hallucination_risk}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2 font-sans text-slate-400">
            <Activity className="h-4 w-4 text-indigo-400" />
            <span>Total Latency:</span>
          </div>
          <span className="text-emerald-400 font-bold">{totalLatencyMs} ms</span>
        </div>
      </div>

      {/* Engineering Insights */}
      {recommendations && recommendations.length > 0 && (
        <div className="pt-2">
          <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
            Production Tuning Recommendations:
          </div>
          <div className="space-y-1.5">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                <ArrowRight className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

