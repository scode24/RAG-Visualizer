# Production RAG Pipeline Visualizer & Dashboard

A production-grade, enterprise-ready **Retrieval-Augmented Generation (RAG)** application and real-time visualizer. It provides deep visibility into how user prompts travel through every stage of a modern RAG system, from document ingestion, chunking, and embedding to guardrails, semantic caching, hybrid search, reranking, Google Gemini synthesis, and automated RAG evaluation.

---

## 🌟 Key Production Features

### 1. Document Ingestion & Multi-Format Parsing
- **Multi-Format Extraction**: Parses **PDF**, **DOCX**, **Markdown (.md)**, **TXT**, **JSON**, **CSV/TSV**, and **HTML**.
- Extracts document structure, paragraph boundaries, and rich metadata.
- Pre-loaded with enterprise reference documents on RAG architecture, hybrid search, caching, security, and evaluation.

### 2. Configurable Chunking Strategies (Powered by `langchain-text-splitters`)
Experiment with and compare different chunking algorithms:
- **Recursive Character Chunking** (`RecursiveCharacterTextSplitter`): Recursively splits on double newlines, single newlines, sentences, and words to maintain natural semantic boundaries.
- **Fixed-Size Character Chunking** (`CharacterTextSplitter`): Uniform chunk size with configurable overlap.
- **Semantic & Sentence Breakpoints**: Sentence-aware recursive splitting respecting natural punctuation stops (`. `, `? `, `! `).
- **Markdown Header-Aware** (`MarkdownHeaderTextSplitter`): Preserves section hierarchy (`#`, `##`, `###`) directly in chunk metadata.
- **Interactive Chunking Sandbox**: Test how different chunking strategies split custom text in real time before indexing.

### 3. Embedding Providers
- **Google Gemini Embeddings**: Production-grade `text-embedding-004` (768 dimensions) via official `google-genai` SDK.
- **Scikit-Learn Dense TF-IDF** (`TfidfVectorizer`): Zero-latency normalized dense vector space requiring no external API key.
- **Scikit-Learn Cosine Similarity** (`cosine_similarity`): Vectorized matrix computations for dense retrieval and semantic cache lookups.

### 4. Prompt Safety & Guardrails
- **Prompt Injection & Jailbreak Defense**: Detects and intercepts directives like *"Ignore all previous instructions"*, *"System prompt reveal"*, *"DAN mode"*, and override attempts.
- **PII Detection & Masking**: Redacts emails, phone numbers, Social Security Numbers, credit cards, and API keys before they reach external services.
- **Toxicity & Malicious Intent Filtering**: Flags hazardous and toxic queries.

### 5. Semantic Vector Caching
- Vector similarity cache using cosine distance.
- **Configurable Similarity Threshold**: (e.g. `0.88`).
- Near-identical queries (e.g., *"What is hybrid search in RAG?"* vs *"Tell me about hybrid search in RAG"*) hit the cache instantly, dropping latency from ~1800ms to **under 5ms** and saving 100% of LLM token costs.
- Cache analytics: Hit rate percentage, cumulative saved latency, and cumulative saved tokens.

### 6. Hybrid Search (BM25 + Dense Cosine)
- **Dense Vector Search**: Captures high-level semantic themes and conceptual similarities.
- **Sparse BM25 Search**: Matches exact keywords, technical terms, and acronyms using `rank_bm25.BM25Okapi`.
- **Reciprocal Rank Fusion (RRF)**: Fuses both rankings using configurable balance (`alpha`), eliminating the blind spots of pure vector search.

### 7. Cross-Encoder Reranking
- Re-scores top retrieved candidate chunks using fine-grained cross-attention signals (phrase matching, key term coverage, and density).
- Tracks before-and-after rank shifts (e.g. rank #4 jumping to #1) to optimize context density.

### 8. LLM Generation with Google Gemini
- Uses the official `google-genai` SDK with support for **Gemini 2.0 Flash**, **Gemini 1.5 Flash**, and **Gemini 1.5 Pro**.
- Strictly grounded system prompts enforcing source citations (`[Source 1]`, `[Source 2]`).
- Clean fallback synthesis engine for zero-configuration local runs.

### 9. Automated Production RAG Evaluation
Computes production evaluation metrics:
- **Faithfulness / Groundedness**: Verifies that claims made in the LLM answer are strictly supported by retrieved sources (hallucination detector).
- **Answer Relevance**: Measures how directly the generated answer addresses the user prompt.
- **Context Precision**: Evaluates the signal-to-noise ratio in retrieved context passages.
- **Overall Quality Grade**: (`EXCELLENT`, `GOOD`, `ACCEPTABLE`, `HALLUCINATION RISK`).
- **Actionable Engineering Recommendations**: Diagnostic tuning tips based on evaluation scores.

### 10. Real-Time Interactive Dashboard
- Visual pipeline graph showing step-by-step prompt travel.
- Click any stage node to open the **Deep Inspection Drawer** with raw inputs, outputs, scores, and tokens.
- Manage documents and chunking configurations in the **Knowledge Base & Chunking Hub**.
- View cache performance and flush entries in the **Semantic Cache Inspector**.
- Adjust Gemini API keys, hybrid weights, and guardrails in the **Settings Modal**.

---

## 🏗️ Architecture

```
                       ┌─────────────────────────┐
                       │       User Prompt       │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │   Guardrails & Safety   │──[Blocked]──> Security Response
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │     Query Embedding     │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │     Semantic Cache      │──[Cache Hit]──> Instant Sub-5ms Return
                       └────────────┬────────────┘
                                    │ [Cache Miss]
                                    ▼
                       ┌─────────────────────────┐
                       │  Hybrid Search (Dense   │
                       │    + BM25 with RRF)     │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  Cross-Encoder Reranker │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  Context Assembler &    │
                       │  Google Gemini Synthesis│
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │   Automated Evaluator   │
                       │(Faithfulness & Relevancy│
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  Interactive Dashboard  │
                       └─────────────────────────┘
```

---

## 🚀 Quickstart

### Prerequisites
- Python 3.9+
- Node.js 18+ and npm

### 1. Setup Environment
```bash
# Clone the repository
cd RAG-Visualizer

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Run in Development Mode (Live Hot-Reload)
```bash
./run_dev.sh
```
- **Backend API**: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`)
- **Frontend Dashboard**: `http://localhost:5173`

### 3. Run in Production Mode (Single Unified Port)
```bash
./run_prod.sh
```
Access the application at `http://localhost:8000`.

### 4. Run with Docker
```bash
docker compose up --build
```
Access at `http://localhost:8000`.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/query` | Executes end-to-end RAG pipeline with stage-by-stage event telemetry. |
| `GET` | `/api/settings` | Retrieves current active pipeline settings and model configs. |
| `POST` | `/api/settings` | Updates active pipeline parameters (Gemini Key, chunk size, alpha, etc.). |
| `GET` | `/api/knowledge-base` | Returns indexed document statistics and chunk samples. |
| `POST` | `/api/knowledge-base/upload` | Uploads and indexes a document (`PDF`, `DOCX`, `TXT`, `MD`, `CSV`, `JSON`, `HTML`). |
| `POST` | `/api/knowledge-base/reindex` | Re-indexes entire knowledge base with new chunking strategy. |
| `POST` | `/api/chunk-preview` | Live chunking preview of arbitrary text in the sandbox. |
| `GET` | `/api/cache/stats` | Retrieves semantic cache hits, misses, latency savings, and recent entries. |
| `POST` | `/api/cache/clear` | Flushes the semantic cache. |
| `GET` | `/api/models` | Lists available LLMs, embedding providers, and chunking strategies. |
| `GET` | `/health` | Health check endpoint for container orchestrators. |

---

## ⚙️ Configuration & Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | `""` | Google Gemini API Key (can also be entered dynamically in the UI Settings). |
| `LLM_MODEL` | `gemini-2.0-flash` | Target Google Gemini model (`gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`). |
| `EMBEDDING_PROVIDER` | `gemini` | `gemini` (`text-embedding-004`) or `fast-local` (384-dim). |
| `CHUNKING_STRATEGY` | `recursive` | `recursive`, `fixed`, `semantic`, `markdown`, `sentence`. |
| `HYBRID_ALPHA` | `0.5` | Reciprocal Rank Fusion balance (`0.0` = 100% BM25, `1.0` = 100% Dense). |
| `CACHE_THRESHOLD` | `0.88` | Cosine similarity threshold for semantic cache hits. |

