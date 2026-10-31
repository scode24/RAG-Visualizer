import time
from typing import Dict, Any, List, Optional
from backend.app.core.config import PipelineSettings, active_settings
from backend.app.services.guardrails import GuardrailsService
from backend.app.services.semantic_cache import global_semantic_cache
from backend.app.services.embeddings import EmbeddingService
from backend.app.services.retrieval import RetrievalService
from backend.app.services.reranker import RerankerService
from backend.app.services.generator import GenerationService
from backend.app.services.evaluator import RAGEvaluatorService
from backend.app.services.chunking import ChunkingService

class KnowledgeBase:
    """
    In-memory vector & chunk repository for documents.
    """
    def __init__(self):
        self.documents: List[Dict[str, Any]] = []
        self.chunks: List[Dict[str, Any]] = []
        self.chunk_embeddings: List[List[float]] = []
        self.current_chunking_strategy: str = "recursive"
        self.chunk_size: int = 500
        self.chunk_overlap: int = 80

    def add_document(self, filename: str, text: str, metadata: Optional[Dict[str, Any]] = None):
        doc_id = f"doc-{len(self.documents)+1}"
        doc_entry = {
            "id": doc_id,
            "filename": filename,
            "text": text,
            "metadata": metadata or {},
            "char_count": len(text)
        }
        self.documents.append(doc_entry)
        self.reindex()

    def reindex(
        self,
        strategy: Optional[str] = None,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
        embedding_provider: str = "fast-local",
        api_key: Optional[str] = None
    ):
        if strategy:
            self.current_chunking_strategy = strategy
        if chunk_size:
            self.chunk_size = chunk_size
        if chunk_overlap:
            self.chunk_overlap = chunk_overlap

        all_chunks = []
        for doc in self.documents:
            meta = {
                "doc_id": doc["id"],
                "filename": doc["filename"],
                **doc.get("metadata", {})
            }
            chunks = ChunkingService.chunk_document(
                text=doc["text"],
                strategy=self.current_chunking_strategy,
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                doc_metadata=meta
            )
            all_chunks.extend(chunks)

        self.chunks = all_chunks

        # Compute embeddings for all chunks
        chunk_texts = [c["text"] for c in self.chunks]
        if chunk_texts:
            self.chunk_embeddings = EmbeddingService.embed_texts(
                chunk_texts,
                provider=embedding_provider,
                api_key=api_key
            )
        else:
            self.chunk_embeddings = []

    def get_stats(self) -> Dict[str, Any]:
        return {
            "document_count": len(self.documents),
            "chunk_count": len(self.chunks),
            "strategy": self.current_chunking_strategy,
            "chunk_size": self.chunk_size,
            "chunk_overlap": self.chunk_overlap,
            "documents": [
                {
                    "id": d["id"],
                    "filename": d["filename"],
                    "char_count": d["char_count"],
                    "metadata": d["metadata"]
                }
                for d in self.documents
            ]
        }

# Global in-memory knowledge base
global_kb = KnowledgeBase()

# Auto-initialize with default enterprise docs
def ensure_default_docs():
    if not global_kb.documents:
        from backend.app.sample_data.default_docs import DEFAULT_DOCUMENTS
        for doc in DEFAULT_DOCUMENTS:
            global_kb.add_document(doc["filename"], doc["text"])

ensure_default_docs()

class RAGPipeline:
    @staticmethod
    def run(
        prompt: str,
        settings: Optional[PipelineSettings] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end production RAG pipeline with detailed real-time event telemetry.
        """
        cfg = settings or active_settings
        pipeline_start = time.time()
        latencies: Dict[str, float] = {}
        events: List[Dict[str, Any]] = []

        # ================= STAGE 1: PROMPT INGESTION =================
        t0 = time.time()
        stage1_output = {
            "raw_prompt": prompt,
            "prompt_length": len(prompt),
            "timestamp": time.strftime("%H:%M:%S")
        }
        latencies["ingestion"] = round((time.time() - t0) * 1000, 2)
        events.append({
            "stage": "INGESTION",
            "name": "Prompt Ingestion",
            "status": "COMPLETED",
            "latency_ms": latencies["ingestion"],
            "data": stage1_output,
            "summary": f"Received prompt ({len(prompt)} chars)"
        })

        # ================= STAGE 2: GUARDRAILS =================
        t0 = time.time()
        guardrail_result = {
            "passed": True,
            "status": "passed",
            "original_prompt": prompt,
            "processed_prompt": prompt,
            "flags": [],
            "violations": [],
            "risk_score": 0.0
        }
        if cfg.guardrails_enabled:
            guardrail_result = GuardrailsService.inspect_prompt(
                prompt=prompt,
                check_jailbreak=cfg.check_jailbreak,
                check_pii=cfg.check_pii,
                check_toxicity=cfg.check_toxicity,
                mask_pii=cfg.mask_pii
            )

        latencies["guardrails"] = round((time.time() - t0) * 1000, 2)

        if not guardrail_result["passed"]:
            events.append({
                "stage": "GUARDRAILS",
                "name": "Prompt Guardrails & Safety",
                "status": "BLOCKED",
                "latency_ms": latencies["guardrails"],
                "data": guardrail_result,
                "summary": f"Security violation detected: {', '.join(guardrail_result['flags'])}"
            })
            # Early return blocked response
            return {
                "success": False,
                "blocked": True,
                "events": events,
                "total_latency_ms": round((time.time() - pipeline_start) * 1000, 1),
                "guardrail_report": guardrail_result,
                "response": f"⚠️ Request Blocked by Guardrails: {'; '.join(guardrail_result['violations'])}"
            }

        events.append({
            "stage": "GUARDRAILS",
            "name": "Prompt Guardrails & Safety",
            "status": "COMPLETED",
            "latency_ms": latencies["guardrails"],
            "data": guardrail_result,
            "summary": f"Passed safety filters (Risk score: {guardrail_result['risk_score']})"
        })

        effective_prompt = guardrail_result["processed_prompt"]

        # ================= STAGE 3: QUERY EMBEDDING =================
        t0 = time.time()
        query_embedding = EmbeddingService.embed_query(
            query=effective_prompt,
            provider=cfg.embedding_provider,
            api_key=cfg.gemini_api_key
        )
        latencies["embedding"] = round((time.time() - t0) * 1000, 2)
        events.append({
            "stage": "EMBEDDING",
            "name": "Query Vector Embedding",
            "status": "COMPLETED",
            "latency_ms": latencies["embedding"],
            "data": {
                "provider": cfg.embedding_provider,
                "dimensions": len(query_embedding),
                "embedding_preview": [round(x, 4) for x in query_embedding[:8]]
            },
            "summary": f"Encoded into {len(query_embedding)}-dim vector using {cfg.embedding_provider}"
        })

        # ================= STAGE 4: SEMANTIC CACHE =================
        t0 = time.time()
        cache_hit_result = None
        if cfg.cache_enabled:
            cache_hit_result = global_semantic_cache.check(
                query=effective_prompt,
                query_embedding=query_embedding,
                threshold=cfg.cache_similarity_threshold
            )
        latencies["cache_check"] = round((time.time() - t0) * 1000, 2)

        if cache_hit_result and cache_hit_result.get("hit"):
            events.append({
                "stage": "SEMANTIC_CACHE",
                "name": "Semantic Vector Cache",
                "status": "CACHE_HIT",
                "latency_ms": latencies["cache_check"],
                "data": cache_hit_result,
                "summary": f"CACHE HIT! (Similarity: {cache_hit_result['similarity']} >= {cfg.cache_similarity_threshold})"
            })

            # CACHE HIT: Return directly!
            total_time = round((time.time() - pipeline_start) * 1000, 1)
            return {
                "success": True,
                "cache_hit": True,
                "response": cache_hit_result["cached_response"],
                "sources": cache_hit_result.get("sources", []),
                "events": events,
                "latencies": latencies,
                "total_latency_ms": total_time,
                "saved_latency_ms": cache_hit_result.get("saved_latency_ms", 1200.0),
                "saved_tokens": cache_hit_result.get("saved_tokens", 350),
                "evaluation": cache_hit_result.get("evaluation")
            }

        events.append({
            "stage": "SEMANTIC_CACHE",
            "name": "Semantic Vector Cache",
            "status": "CACHE_MISS",
            "latency_ms": latencies["cache_check"],
            "data": cache_hit_result or {"hit": False},
            "summary": f"Cache miss (similarity {cache_hit_result['similarity'] if cache_hit_result else 0} < threshold {cfg.cache_similarity_threshold})"
        })

        # ================= STAGE 5: HYBRID RETRIEVAL =================
        t0 = time.time()
        retrieval_data = RetrievalService.hybrid_search(
            query=effective_prompt,
            query_embedding=query_embedding,
            chunks=global_kb.chunks,
            chunk_embeddings=global_kb.chunk_embeddings,
            alpha=cfg.hybrid_alpha,
            top_k=cfg.top_k,
            mode=cfg.retrieval_mode
        )
        latencies["retrieval"] = round((time.time() - t0) * 1000, 2)
        events.append({
            "stage": "HYBRID_RETRIEVAL",
            "name": "Hybrid Search (BM25 + Dense)",
            "status": "COMPLETED",
            "latency_ms": latencies["retrieval"],
            "data": retrieval_data,
            "summary": f"Retrieved top {len(retrieval_data['candidates'])} candidates from {retrieval_data['total_corpus_chunks']} chunks"
        })

        # ================= STAGE 6: RERANKING =================
        t0 = time.time()
        if cfg.reranking_enabled and retrieval_data["candidates"]:
            rerank_result = RerankerService.rerank(
                query=effective_prompt,
                candidates=retrieval_data["candidates"],
                top_k=min(cfg.top_k, 3),
                model_name=cfg.reranker_model
            )
            final_chunks = rerank_result["reranked_chunks"]
            rank_changes = rerank_result["rank_changes_detected"]
        else:
            rerank_result = {
                "reranked_chunks": retrieval_data["candidates"][:3],
                "rank_changes_detected": 0,
                "model": "disabled"
            }
            final_chunks = retrieval_data["candidates"][:3]
            rank_changes = 0

        latencies["reranking"] = round((time.time() - t0) * 1000, 2)
        events.append({
            "stage": "RERANKING",
            "name": "Cross-Encoder Reranker",
            "status": "COMPLETED",
            "latency_ms": latencies["reranking"],
            "data": rerank_result,
            "summary": f"Rescored chunks ({rank_changes} position changes detected)"
        })

        # ================= STAGE 7: LLM GENERATION =================
        t0 = time.time()
        generation_data = GenerationService.generate_response(
            query=effective_prompt,
            context_chunks=final_chunks,
            api_key=cfg.gemini_api_key,
            model_name=cfg.llm_model,
            temperature=cfg.temperature,
            max_tokens=cfg.max_output_tokens
        )
        latencies["generation"] = round((time.time() - t0) * 1000, 2)
        events.append({
            "stage": "GENERATION",
            "name": "LLM Synthesis (Gemini)",
            "status": "COMPLETED",
            "latency_ms": latencies["generation"],
            "data": generation_data,
            "summary": f"Synthesized grounded answer using {generation_data['model']} ({generation_data['tokens_used']} tokens)"
        })

        # ================= STAGE 8: RAG EVALUATION =================
        t0 = time.time()
        evaluation_data = None
        if cfg.evaluation_enabled:
            evaluation_data = RAGEvaluatorService.evaluate(
                query=effective_prompt,
                retrieved_contexts=final_chunks,
                generated_answer=generation_data["answer"],
                latency_breakdown=latencies
            )
        latencies["evaluation"] = round((time.time() - t0) * 1000, 2)
        events.append({
            "stage": "EVALUATION",
            "name": "RAG Metrics Evaluator",
            "status": "COMPLETED",
            "latency_ms": latencies["evaluation"],
            "data": evaluation_data,
            "summary": f"Evaluation Score: {evaluation_data['overall_score']}% ({evaluation_data['status']})" if evaluation_data else "Evaluation skipped"
        })

        # ================= STAGE 9: UPDATE SEMANTIC CACHE =================
        if cfg.cache_enabled:
            global_semantic_cache.set(
                prompt=effective_prompt,
                query_embedding=query_embedding,
                response=generation_data["answer"],
                sources=generation_data.get("sources_used", []),
                latency_ms=generation_data.get("latency_ms", 1200.0),
                tokens_used=generation_data.get("tokens_used", 350),
                evaluation=evaluation_data
            )

        total_time = round((time.time() - pipeline_start) * 1000, 1)

        return {
            "success": True,
            "cache_hit": False,
            "response": generation_data["answer"],
            "model_info": generation_data,
            "sources": generation_data.get("sources_used", []),
            "events": events,
            "latencies": latencies,
            "total_latency_ms": total_time,
            "evaluation": evaluation_data
        }
