import os
from pydantic import BaseModel
from typing import Optional, List

class PipelineSettings(BaseModel):
    # LLM Settings
    gemini_api_key: Optional[str] = os.getenv("GEMINI_API_KEY", "")
    llm_model: str = "gemini-2.0-flash"  # or gemini-1.5-flash, gemini-1.5-pro
    temperature: float = 0.2
    max_output_tokens: int = 1024

    # Embedding Settings
    embedding_provider: str = "gemini"  # "gemini" or "fast-local"
    embedding_model: str = "text-embedding-004"

    # Chunking Strategy Settings
    chunking_strategy: str = "recursive"  # "recursive", "fixed", "semantic", "markdown", "sentence"
    chunk_size: int = 500
    chunk_overlap: int = 80
    semantic_percentile: int = 85

    # Retrieval & Search
    retrieval_mode: str = "hybrid"  # "hybrid", "dense", "bm25"
    hybrid_alpha: float = 0.5       # 0.0 = 100% BM25, 1.0 = 100% Dense Vector, 0.5 = Balanced RRF
    top_k: int = 4
    reranking_enabled: bool = True
    reranker_model: str = "cross-encoder-semantic"

    # Guardrails
    guardrails_enabled: bool = True
    check_jailbreak: bool = True
    check_pii: bool = True
    check_toxicity: bool = True
    mask_pii: bool = True

    # Semantic Cache
    cache_enabled: bool = True
    cache_similarity_threshold: float = 0.88
    cache_ttl_seconds: int = 3600

    # Evaluation
    evaluation_enabled: bool = True

# Global active settings instance
active_settings = PipelineSettings()

