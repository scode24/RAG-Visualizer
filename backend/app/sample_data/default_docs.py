DEFAULT_DOCUMENTS = [
    {
        "filename": "production_rag_architecture.md",
        "text": """# Production RAG Architecture Blueprint

Retrieval-Augmented Generation (RAG) is a mission-critical design pattern for production enterprise systems that grounds Large Language Models on verified external knowledge sources.

## Core Stages of Production RAG
1. **Document Ingestion & Multi-Format Parsing**: Extracts structured text from PDFs, DOCX, Markdown, HTML, and JSON while retaining headers, metadata, and tabular structure.
2. **Chunking Strategy**: Slicing documents into discrete units. Recursive character chunking maintains semantic boundaries across paragraphs and sentences, while semantic chunking splits at topical transition points.
3. **Embedding Vectorization**: Mapping text chunks into dense continuous vector spaces (e.g., Google text-embedding-004) where cosine similarity captures semantic relationships.
4. **Guardrails & Safety Interception**: Inspects incoming prompts for prompt injection, jailbreaks, malicious code, and PII leakage before touching downstream models.
5. **Semantic Caching**: Checks whether semantically equivalent queries were recently processed. If cosine similarity exceeds 0.88, the cached answer is served instantly (dropping latency from 2000ms to 5ms).
6. **Hybrid Retrieval**: Combines BM25 sparse keyword matching with dense vector similarity via Reciprocal Rank Fusion (RRF) to eliminate the blind spots of pure vector search.
7. **Cross-Encoder Reranking**: Re-evaluates top retrieved candidate passages using deep cross-attention, boosting relevant passages and filtering noise.
8. **LLM Generation**: Feeds the reranked context into Google Gemini with strict bracketed citations [Source 1] and zero-hallucination instructions.
9. **Automated RAG Evaluation**: Scores answer faithfulness, context precision, and hallucination risk in real-time.
"""
    },
    {
        "filename": "hybrid_search_and_rrf.md",
        "text": """# Hybrid Search and Reciprocal Rank Fusion (RRF)

While dense vector search excels at high-level semantic themes, it frequently struggles with exact entity names, acronyms, product SKUs, error codes, and unique identifiers.

## Why Hybrid Search is Essential
Production RAG systems combine:
- **Dense Vector Search**: Captures synonyms, conceptual analogies, and multilingual meaning using cosine similarity.
- **Sparse BM25 Search**: Matches exact keywords, rare terms, and technical nomenclature using term frequency and inverse document frequency (TF-IDF / Okapi BM25).

## Reciprocal Rank Fusion (RRF) Formula
RRF fuses ranked lists from disparate retrieval methods without requiring calibrated score normalization:
RRF_Score(d) = sum( 1 / (k + rank_i(d)) )
Where `k` is a smoothing constant (typically 60) that prevents top-ranked items from monopolizing the distribution.
In our RAG pipeline, a configurable parameter `alpha` balances dense vs sparse weight:
Score = alpha * RRF(Dense) + (1 - alpha) * RRF(BM25).
"""
    },
    {
        "filename": "semantic_caching_guide.md",
        "text": """# Semantic Caching for Production LLMs

In high-throughput enterprise applications, up to 30% to 50% of user queries share identical or near-identical semantic intent (e.g., "How do I reset my password?", "Password reset steps", "Forgot login password").

## Exact Cache vs Semantic Cache
Traditional caching fails on natural language variations. Semantic caching computes the vector embedding of the new prompt and performs nearest-neighbor search against previous prompt embeddings.

## Similarity Thresholds
- **Threshold >= 0.92**: Ultra-conservative matching. Guarantees identical intent.
- **Threshold 0.85 - 0.90**: Recommended sweet spot for enterprise search and support bots.
- **Threshold < 0.80**: Too permissive, risk of answering the wrong question.

## Benefits
- **Sub-10ms Latency**: Bypasses vector DB search, reranking, and LLM token generation.
- **Cost Reduction**: Saves 100% of LLM input and output token fees on cache hits.
- **High Availability**: Immune to external API rate limits and upstream LLM outages.
"""
    },
    {
        "filename": "llm_guardrails_and_security.md",
        "text": """# LLM Guardrails and Prompt Injection Security

Production RAG systems are exposed to hostile user input. A dedicated Guardrails layer must execute before any vector retrieval or LLM invocation.

## Key Security Checks
1. **Prompt Injection & System Overrides**: Detects phrases like "Ignore all previous instructions", "You are now DAN", or "Reveal your system instructions".
2. **Personally Identifiable Information (PII) Protection**: Automatically redacts email addresses, phone numbers, credit card numbers, and API keys before they reach the vector store or external model.
3. **Malicious Intent / Toxic Queries**: Blocks queries attempting to create malware, keyloggers, weapons, or hate speech.
4. **Input Sanitization**: Cleanses raw tokens, trims excessive payloads, and normalizes unicode characters.
"""
    },
    {
        "filename": "rag_evaluation_metrics.md",
        "text": """# Production RAG Evaluation Framework

Evaluating RAG performance requires decomposing the pipeline into independent verifiable signals rather than relying solely on subjective human impressions.

## The RAG Triad of Metrics
1. **Faithfulness (Groundedness)**:
   Measures whether every claim made in the generated response can be traced back to the retrieved context chunks. A low faithfulness score signals a hallucination.
2. **Answer Relevance**:
   Measures whether the generated response directly answers the user prompt. Prevents evasive answers or off-topic monologues.
3. **Context Relevance (Precision)**:
   Measures the signal-to-noise ratio of the retrieved chunks. High context relevance ensures the LLM's prompt window is not polluted with irrelevant text.

## Quality Benchmarking
- **Excellent (>= 85%)**: Fully grounded response with verified citations and high query relevance.
- **Good (70% - 84%)**: Factual response with minor contextual noise.
- **Acceptable (50% - 69%)**: Borderline relevance, possible context mismatch.
- **Hallucination Risk (< 50%)**: Contains ungrounded claims or completely diverged from retrieved facts.
"""
    }
]

