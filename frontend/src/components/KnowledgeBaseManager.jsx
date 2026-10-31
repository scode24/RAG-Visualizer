import React, { useState } from 'react';
import { 
  Database, UploadCloud, RefreshCw, Scissors, FileText, 
  Layers, CheckCircle, AlertCircle, Eye, Sliders, X 
} from 'lucide-react';
import { api } from '../services/api';

export default function KnowledgeBaseManager({ 
  isOpen, 
  onClose, 
  kbData, 
  onRefreshKB, 
  activeSettings,
  modelsCatalog 
}) {
  const [activeTab, setActiveTab] = useState('documents'); // 'documents', 'chunking', 'sandbox'
  const [selectedStrategy, setSelectedStrategy] = useState(activeSettings?.chunking_strategy || 'recursive');
  const [chunkSize, setChunkSize] = useState(activeSettings?.chunk_size || 500);
  const [chunkOverlap, setChunkOverlap] = useState(activeSettings?.chunk_overlap || 80);
  const [embeddingProvider, setEmbeddingProvider] = useState(activeSettings?.embedding_provider || 'fast-local');

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isReindexing, setIsReindexing] = useState(false);

  // Sandbox state
  const [sandboxText, setSandboxText] = useState(
    "# Advanced Production RAG\n\nRetrieval-Augmented Generation bridges proprietary corporate documents with foundational LLMs.\n\n## Chunking Considerations\nChunking is often the highest-leverage hyperparameter. If chunks are too small, critical context is severed. If chunks are too large, vector precision drops due to semantic dilution.\n\n## Evaluation Loops\nAutomated synthetic evaluation ensures regression testing before releasing changes into production."
  );
  const [sandboxChunks, setSandboxChunks] = useState(null);
  const [isTestingChunking, setIsTestingChunking] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);
    try {
      const res = await api.uploadDocument(file);
      setUploadStatus({
        type: 'success',
        message: `Successfully ingested "${res.filename}" (${res.metadata?.format?.toUpperCase()}). Generated ${res.total_chunks} total chunks.`
      });
      await onRefreshKB();
    } catch (err) {
      setUploadStatus({
        type: 'error',
        message: err.message || 'File upload failed'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    setUploadStatus(null);
    try {
      await api.reindexKnowledgeBase({
        strategy: selectedStrategy,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
        embedding_provider: embeddingProvider,
        gemini_api_key: activeSettings?.gemini_api_key
      });
      await onRefreshKB();
      setUploadStatus({
        type: 'success',
        message: `Re-indexed knowledge base using ${selectedStrategy.toUpperCase()} chunking and ${embeddingProvider} embeddings.`
      });
    } catch (err) {
      setUploadStatus({
        type: 'error',
        message: err.message || 'Re-indexing failed'
      });
    } finally {
      setIsReindexing(false);
    }
  };

  const handleRunSandbox = async () => {
    setIsTestingChunking(true);
    try {
      const res = await api.previewChunking({
        text: sandboxText,
        strategy: selectedStrategy,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap
      });
      setSandboxChunks(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTestingChunking(false);
    }
  };

  const strategiesList = modelsCatalog?.chunking_strategies || [
    { id: 'recursive', name: 'Recursive Character Chunking', description: 'Splits recursively on paragraph, sentence, and word boundaries.' },
    { id: 'fixed', name: 'Fixed-Size Sliding Window', description: 'Fixed character lengths with strict sliding overlap.' },
    { id: 'semantic', name: 'Semantic Breakpoints', description: 'Breaks on thematic and topical transition boundaries.' },
    { id: 'markdown', name: 'Markdown Header-Aware', description: 'Splits along H1, H2, H3 headers, preserving structural context.' },
    { id: 'sentence', name: 'Sentence Window Chunking', description: 'Focal sentence retrieval surrounded by multi-sentence context.' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Knowledge Base & Chunking Hub</h2>
              <p className="text-xs text-slate-400">
                Manage ingestion parsing, chunking strategies, and dense vector indexing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/30 text-xs">
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 px-4 font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'documents'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            Indexed Documents ({kbData?.document_count || 0})
          </button>

          <button
            onClick={() => setActiveTab('chunking')}
            className={`py-3 px-4 font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'chunking'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scissors className="h-4 w-4" />
            Chunking Strategy & Reindexing
          </button>

          <button
            onClick={() => setActiveTab('sandbox')}
            className={`py-3 px-4 font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'sandbox'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-4 w-4" />
            Live Chunking Sandbox
          </button>
        </div>

        {/* Status notification banner */}
        {uploadStatus && (
          <div className={`px-6 py-2.5 text-xs flex items-center gap-2 border-b ${
            uploadStatus.type === 'success' 
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50' 
              : 'bg-rose-950/40 text-rose-300 border-rose-800/50'
          }`}>
            {uploadStatus.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{uploadStatus.message}</span>
          </div>
        )}

        {/* Body Contents */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm flex-1">

          {/* TAB 1: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 rounded-2xl p-6 text-center transition bg-slate-950/40 relative">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  accept=".pdf,.docx,.doc,.txt,.md,.markdown,.csv,.json,.html"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div className="font-semibold text-white text-sm">
                    {isUploading ? 'Parsing & Indexing Document...' : 'Click or Drag & Drop to Upload Document'}
                  </div>
                  <p className="text-xs text-slate-400 max-w-md">
                    Supported formats: <strong className="text-slate-200">PDF, DOCX, Markdown (.md), TXT, JSON, CSV, HTML</strong>.
                    Parsed text is automatically normalized and chunked.
                  </p>
                </div>
              </div>

              {/* Documents List */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Currently Indexed Documents ({kbData?.documents?.length || 0})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {kbData?.documents?.map((doc, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-emerald-400" />
                          <span className="font-semibold text-white text-xs truncate max-w-xs">{doc.filename}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          ID: {doc.id} • {doc.char_count.toLocaleString()} chars
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300">
                        {doc.filename.split('.').pop()?.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample Chunks Explorer */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Chunk Explorer ({kbData?.chunk_count || 0} Total Active Chunks)</span>
                  <span className="text-[11px] font-mono text-indigo-400">Strategy: {kbData?.strategy}</span>
                </h3>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {kbData?.sample_chunks?.map((chunk, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono font-bold text-indigo-400">{chunk.id}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span>{chunk.char_length} chars</span>
                          <span>•</span>
                          <span className="text-emerald-400">~{chunk.token_estimate} tokens</span>
                          <span>•</span>
                          <span className="text-slate-500">{chunk.metadata?.filename}</span>
                        </div>
                      </div>
                      <p className="text-slate-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed line-clamp-3">
                        {chunk.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHUNKING CONFIGURATION */}
          {activeTab === 'chunking' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Select Production Chunking Strategy
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {strategiesList.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStrategy(st.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition text-left ${
                        selectedStrategy === st.id
                          ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-xs">{st.name}</span>
                        {selectedStrategy === st.id && (
                          <CheckCircle className="h-4 w-4 text-indigo-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{st.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">Chunk Size (Characters)</span>
                    <span className="font-mono font-bold text-indigo-400">{chunkSize} chars</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="1500"
                    step="50"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500">
                    Typically ~{Math.round(chunkSize / 4)} tokens. Smaller chunks isolate exact answers; larger chunks retain narrative context.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">Chunk Overlap</span>
                    <span className="font-mono font-bold text-indigo-400">{chunkOverlap} chars</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="20"
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500">
                    Sliding window overlap between consecutive chunks to prevent boundary information loss.
                  </p>
                </div>
              </div>

              {/* Embedding Provider Selection */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Select Embedding Model
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {modelsCatalog?.embeddings?.map((emb) => (
                    <div
                      key={emb.id}
                      onClick={() => setEmbeddingProvider(emb.provider)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition text-left ${
                        embeddingProvider === emb.provider
                          ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-white text-xs mb-1">{emb.name}</div>
                      <div className="text-[11px] text-slate-400">{emb.description}</div>
                      <div className="mt-2 text-[10px] font-mono text-emerald-400">
                        {emb.dimensions} dims • {emb.requires_api_key ? 'Requires Gemini Key' : 'Zero Latency Local'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleReindex}
                  disabled={isReindexing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isReindexing ? 'animate-spin' : ''}`} />
                  {isReindexing ? 'Re-indexing Entire Corpus...' : 'Apply & Re-Index Knowledge Base'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE SANDBOX */}
          {activeTab === 'sandbox' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Test how your selected chunking strategy (<strong className="text-white">{selectedStrategy}</strong>) chops arbitrary text without modifying the production database.
              </p>

              <textarea
                value={sandboxText}
                onChange={(e) => setSandboxText(e.target.value)}
                rows={6}
                placeholder="Paste sample document text here..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
              />

              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  Length: <strong className="text-white">{sandboxText.length}</strong> chars (~{Math.round(sandboxText.length / 4)} tokens)
                </span>
                <button
                  onClick={handleRunSandbox}
                  disabled={isTestingChunking || !sandboxText.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition"
                >
                  {isTestingChunking ? 'Chunking...' : 'Preview Chunks Now'}
                </button>
              </div>

              {sandboxChunks && (
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400">
                      Generated {sandboxChunks.total_chunks} Chunks
                    </span>
                    <span className="text-slate-400">
                      Avg Tokens: <strong className="text-white">{sandboxChunks.avg_tokens_per_chunk}</strong> per chunk
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {sandboxChunks.chunks.map((chk, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span className="text-indigo-400 font-bold">Chunk #{i + 1}</span>
                          <span>{chk.char_length} chars • ~{chk.token_estimate} tokens</span>
                        </div>
                        <p className="text-slate-300 text-[11px] whitespace-pre-wrap">{chk.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

