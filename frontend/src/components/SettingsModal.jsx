import React, { useState, useEffect } from 'react';
import { Settings, Key, Cpu, ShieldCheck, Zap, Sliders, CheckCircle, Eye, EyeOff, X } from 'lucide-react';
import { api } from '../services/api';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  activeSettings, 
  onSettingsUpdated,
  modelsCatalog 
}) {
  const [formData, setFormData] = useState({ ...activeSettings });
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (activeSettings) {
      setFormData({ ...activeSettings });
    }
  }, [activeSettings]);

  if (!isOpen) return null;

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateSettings(formData);
      setSaveSuccess(true);
      if (onSettingsUpdated) onSettingsUpdated(formData);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Pipeline Hyperparameters & Credentials</h2>
              <p className="text-xs text-slate-400">Configure LLM keys, hybrid search ratios, reranking, and guardrail policies.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 flex-1">

          {/* 1. Google Gemini API Key */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-white flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-400" />
                Google Gemini API Key
              </label>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:underline"
              >
                Get API Key from Google AI Studio →
              </a>
            </div>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                placeholder="AIzaSy... (Leave empty to use high-fidelity local simulator)"
                value={formData.gemini_api_key || ""}
                onChange={(e) => handleChange('gemini_api_key', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 pr-10 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Your key powers live Google Gemini generation (Gemini 2.0 Flash / 1.5 Pro) and Google text-embedding-004.
            </p>
          </div>

          {/* 2. Models & Embeddings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Gemini LLM Model</label>
              <select
                value={formData.llm_model}
                onChange={(e) => handleChange('llm_model', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest, Next-Gen)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Production Balanced)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Multimodal Reasoning)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Embedding Model</label>
              <select
                value={formData.embedding_provider}
                onChange={(e) => handleChange('embedding_provider', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="gemini">Google text-embedding-004 (768-dim)</option>
                <option value="fast-local">Fast Local Dense (384-dim, 0ms latency)</option>
                <option value="hybrid">Hybrid TF-IDF + Dense (512-dim)</option>
              </select>
            </div>
          </div>

          {/* 3. Hybrid Search Configuration */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-400" />
                Hybrid Search Fusion (Reciprocal Rank Fusion)
              </label>
              <span className="font-mono font-bold text-indigo-400">
                {Math.round((1 - formData.hybrid_alpha) * 100)}% BM25 / {Math.round(formData.hybrid_alpha * 100)}% Dense
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={formData.hybrid_alpha}
              onChange={(e) => handleChange('hybrid_alpha', parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />

            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>0.0 (Pure BM25 Keywords)</span>
              <span>0.5 (Balanced RRF)</span>
              <span>1.0 (Pure Dense Vectors)</span>
            </div>
          </div>

          {/* 4. Reranking & Top-K */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Cross-Encoder Reranker</span>
                <span className="text-[11px] text-slate-500">Re-scores top candidate passages</span>
              </div>
              <input
                type="checkbox"
                checked={formData.reranking_enabled}
                onChange={(e) => handleChange('reranking_enabled', e.target.checked)}
                className="h-4 w-4 accent-indigo-500 rounded cursor-pointer"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Retrieved Chunks (Top-K)</span>
                <span className="text-[11px] text-slate-500">Passed into context window</span>
              </div>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.top_k}
                onChange={(e) => handleChange('top_k', parseInt(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right font-mono text-white"
              />
            </div>
          </div>

          {/* 5. Semantic Cache & Guardrails */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Semantic Cache Threshold
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {(formData.cache_similarity_threshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.75"
                max="0.98"
                step="0.01"
                value={formData.cache_similarity_threshold}
                onChange={(e) => handleChange('cache_similarity_threshold', parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.75 (Permissive)</span>
                <span>0.88 (Optimal)</span>
                <span>0.98 (Strict)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Active Guardrail Filters
              </span>
              <div className="space-y-1 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.check_jailbreak}
                    onChange={(e) => handleChange('check_jailbreak', e.target.checked)}
                    className="accent-indigo-500 rounded"
                  />
                  <span>Prompt Injection & Jailbreak Defense</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.mask_pii}
                    onChange={(e) => handleChange('mask_pii', e.target.checked)}
                    className="accent-indigo-500 rounded"
                  />
                  <span>PII Redaction (Email, Phone, SSN, API Keys)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.check_toxicity}
                    onChange={(e) => handleChange('check_toxicity', e.target.checked)}
                    className="accent-indigo-500 rounded"
                  />
                  <span>Malicious Intent & Toxicity Filter</span>
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Settings persist in backend session and memory.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle className="h-4 w-4 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

