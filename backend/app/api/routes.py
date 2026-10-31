import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.app.core.config import active_settings, PipelineSettings
from backend.app.services.pipeline import RAGPipeline, global_kb
from backend.app.services.semantic_cache import global_semantic_cache
from backend.app.services.chunking import ChunkingService
from backend.app.services.embeddings import EmbeddingService
from backend.app.services.ingestion import DocumentParser
from backend.app.sample_data.default_docs import DEFAULT_DOCUMENTS

router = APIRouter()

# Initialize knowledge base with default documents on startup
if not global_kb.documents:
    for doc in DEFAULT_DOCUMENTS:
        global_kb.add_document(doc["filename"], doc["text"])

class QueryRequest(BaseModel):
    prompt: str
    gemini_api_key: Optional[str] = None
    llm_model: Optional[str] = None
    embedding_provider: Optional[str] = None
    chunking_strategy: Optional[str] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    retrieval_mode: Optional[str] = None
    hybrid_alpha: Optional[float] = None
    top_k: Optional[int] = None
    reranking_enabled: Optional[bool] = None
    cache_enabled: Optional[bool] = None
    cache_similarity_threshold: Optional[float] = None
    guardrails_enabled: Optional[bool] = None
    evaluation_enabled: Optional[bool] = None

class ChunkPreviewRequest(BaseModel):
    text: str
    strategy: str = "recursive"
    chunk_size: int = 500
    chunk_overlap: int = 80
    semantic_percentile: int = 85

@router.post("/query")
async def run_query(request: QueryRequest):
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    # Create run-specific settings copy with any client overrides
    settings = active_settings.copy()
    if request.gemini_api_key:
        settings.gemini_api_key = request.gemini_api_key
    if request.llm_model:
        settings.llm_model = request.llm_model
    if request.embedding_provider:
        settings.embedding_provider = request.embedding_provider
    if request.chunking_strategy:
        settings.chunking_strategy = request.chunking_strategy
    if request.chunk_size is not None:
        settings.chunk_size = request.chunk_size
    if request.chunk_overlap is not None:
        settings.chunk_overlap = request.chunk_overlap
    if request.retrieval_mode:
        settings.retrieval_mode = request.retrieval_mode
    if request.hybrid_alpha is not None:
        settings.hybrid_alpha = request.hybrid_alpha
    if request.top_k is not None:
        settings.top_k = request.top_k
    if request.reranking_enabled is not None:
        settings.reranking_enabled = request.reranking_enabled
    if request.cache_enabled is not None:
        settings.cache_enabled = request.cache_enabled
    if request.cache_similarity_threshold is not None:
        settings.cache_similarity_threshold = request.cache_similarity_threshold
    if request.guardrails_enabled is not None:
        settings.guardrails_enabled = request.guardrails_enabled
    if request.evaluation_enabled is not None:
        settings.evaluation_enabled = request.evaluation_enabled

    # Ensure knowledge base is populated
    if not global_kb.chunks:
        global_kb.reindex(
            strategy=settings.chunking_strategy,
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            embedding_provider=settings.embedding_provider,
            api_key=settings.gemini_api_key
        )

    result = RAGPipeline.run(prompt=request.prompt, settings=settings)
    return result

@router.get("/settings")
async def get_settings():
    return {
        "settings": active_settings.dict(),
        "has_gemini_key": bool(active_settings.gemini_api_key or os.getenv("GEMINI_API_KEY"))
    }

@router.post("/settings")
async def update_settings(new_settings: PipelineSettings):
    global active_settings
    active_settings = new_settings
    return {"status": "updated", "settings": active_settings.dict()}

@router.get("/knowledge-base")
async def get_knowledge_base():
    stats = global_kb.get_stats()
    # Return first 15 chunk samples for inspection
    preview_chunks = [
        {
            "id": c["id"],
            "index": c["index"],
            "text": c["text"][:200] + ("..." if len(c["text"]) > 200 else ""),
            "full_text": c["text"],
            "char_length": c["char_length"],
            "token_estimate": c["token_estimate"],
            "strategy": c.get("strategy", "recursive"),
            "metadata": c.get("metadata", {})
        }
        for c in global_kb.chunks[:20]
    ]
    return {
        **stats,
        "sample_chunks": preview_chunks
    }

@router.post("/knowledge-base/upload")
async def upload_document(file: UploadFile = File(...)):
    contents = await file.read()
    filename = file.filename or "uploaded_document.txt"
    parsed = DocumentParser.parse_file(contents, filename)

    global_kb.add_document(
        filename=filename,
        text=parsed["text"],
        metadata=parsed["metadata"]
    )

    return {
        "status": "success",
        "filename": filename,
        "metadata": parsed["metadata"],
        "total_documents": len(global_kb.documents),
        "total_chunks": len(global_kb.chunks)
    }

@router.post("/knowledge-base/reindex")
async def reindex_knowledge_base(
    strategy: str = Form("recursive"),
    chunk_size: int = Form(500),
    chunk_overlap: int = Form(80),
    embedding_provider: str = Form("fast-local"),
    gemini_api_key: Optional[str] = Form(None)
):
    key = gemini_api_key or active_settings.gemini_api_key
    global_kb.reindex(
        strategy=strategy,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        embedding_provider=embedding_provider,
        api_key=key
    )
    return {
        "status": "reindexed",
        "strategy": strategy,
        "chunk_count": len(global_kb.chunks),
        "document_count": len(global_kb.documents)
    }

@router.post("/chunk-preview")
async def preview_chunking(req: ChunkPreviewRequest):
    chunks = ChunkingService.chunk_document(
        text=req.text,
        strategy=req.strategy,
        chunk_size=req.chunk_size,
        chunk_overlap=req.chunk_overlap,
        semantic_percentile=req.semantic_percentile,
        doc_metadata={"preview": True}
    )
    token_counts = [c["token_estimate"] for c in chunks]
    avg_tokens = round(sum(token_counts) / len(token_counts), 1) if token_counts else 0
    return {
        "strategy": req.strategy,
        "total_chunks": len(chunks),
        "avg_tokens_per_chunk": avg_tokens,
        "chunks": chunks
    }

@router.get("/cache/stats")
async def get_cache_stats():
    return global_semantic_cache.get_stats()

@router.post("/cache/clear")
async def clear_cache():
    global_semantic_cache.clear()
    return {"status": "cleared"}

@router.get("/models")
async def get_models():
    return {
        "embeddings": EmbeddingService.get_available_models(),
        "llms": [
            {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash (Fastest, Next-Gen)", "context_window": "1M tokens"},
            {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash (Balanced, Production)", "context_window": "1M tokens"},
            {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro (Deep Reasoning & Multimodal)", "context_window": "2M tokens"}
        ],
        "chunking_strategies": [
            {
                "id": "recursive",
                "name": "Recursive Character Chunking",
                "description": "Splits by double newlines, single newlines, sentences, and spaces with overlap."
            },
            {
                "id": "fixed",
                "name": "Fixed-Size Character Chunking",
                "description": "Uniform sliding window chunking with fixed character or token count."
            },
            {
                "id": "semantic",
                "name": "Semantic Breakpoint Chunking",
                "description": "Dynamic splits based on topical cohesion and paragraph transitions."
            },
            {
                "id": "markdown",
                "name": "Markdown Header-Aware Chunking",
                "description": "Preserves section hierarchy (#, ##, ###) in chunk context."
            },
            {
                "id": "sentence",
                "name": "Sentence Window Chunking",
                "description": "Centers chunks on single sentences with surrounding context window."
            }
        ]
    }

