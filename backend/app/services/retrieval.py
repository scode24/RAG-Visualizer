import re
import numpy as np
from typing import List, Dict, Any
from rank_bm25 import BM25Okapi
from sklearn.metrics.pairwise import cosine_similarity

class RetrievalService:
    @staticmethod
    def _tokenize(text: str) -> List[str]:
        tokens = re.findall(r'\b\w+\b', text.lower())
        return tokens if tokens else ["empty"]

    @staticmethod
    def hybrid_search(
        query: str,
        query_embedding: List[float],
        chunks: List[Dict[str, Any]],
        chunk_embeddings: List[List[float]],
        alpha: float = 0.5,
        top_k: int = 5,
        mode: str = "hybrid"
    ) -> Dict[str, Any]:
        """
        Production Hybrid Retrieval using standard BM25Okapi + Scikit-Learn Cosine Similarity
        fused via Reciprocal Rank Fusion (RRF).
        """
        query_tokens = RetrievalService._tokenize(query)

        if not chunks:
            return {
                "query": query,
                "query_tokens": query_tokens,
                "total_corpus_chunks": 0,
                "alpha": alpha,
                "retrieval_mode": mode,
                "candidates": [],
                "stats": {}
            }

        total_chunks = len(chunks)

        # 1. Sparse BM25 Search (rank_bm25 library)
        corpus_tokens = [RetrievalService._tokenize(c["text"]) for c in chunks]
        bm25 = BM25Okapi(corpus_tokens)
        bm25_scores = bm25.get_scores(query_tokens)
        max_bm25 = float(np.max(bm25_scores)) if len(bm25_scores) > 0 and np.max(bm25_scores) > 0 else 1.0
        norm_bm25_scores = [float(s / max_bm25) for s in bm25_scores]

        # 2. Dense Vector Search (Scikit-Learn Cosine Similarity)
        q_vec = np.array([query_embedding], dtype=np.float32)
        c_matrix = np.array(chunk_embeddings, dtype=np.float32)
        if c_matrix.shape[0] > 0 and q_vec.shape[1] == c_matrix.shape[1]:
            cosine_matrix = cosine_similarity(q_vec, c_matrix)[0]
            dense_scores = [float(max(0.0, s)) for s in cosine_matrix]
        else:
            dense_scores = [0.0] * total_chunks

        # Compute ranks for RRF
        bm25_order = np.argsort(norm_bm25_scores)[::-1]
        dense_order = np.argsort(dense_scores)[::-1]
        bm25_ranks = {idx: r + 1 for r, idx in enumerate(bm25_order)}
        dense_ranks = {idx: r + 1 for r, idx in enumerate(dense_order)}

        # 3. Reciprocal Rank Fusion (RRF constant k = 60)
        rrf_k = 60
        candidates = []
        for idx, chunk in enumerate(chunks):
            r_dense = dense_ranks[idx]
            r_bm25 = bm25_ranks[idx]
            s_dense = dense_scores[idx]
            s_bm25 = norm_bm25_scores[idx]

            # RRF standard formula: alpha/(60 + r_dense) + (1-alpha)/(60 + r_bm25)
            rrf_score = (alpha / (rrf_k + r_dense)) + ((1.0 - alpha) / (rrf_k + r_bm25))
            blended_score = (alpha * s_dense) + ((1.0 - alpha) * s_bm25)

            candidates.append({
                "chunk_id": chunk.get("id", f"c-{idx}"),
                "chunk_index": idx,
                "text": chunk.get("text", ""),
                "char_length": chunk.get("char_length", len(chunk.get("text", ""))),
                "metadata": chunk.get("metadata", {}),
                "dense_score": round(s_dense, 4),
                "dense_rank": r_dense,
                "bm25_score": round(s_bm25, 4),
                "bm25_rank": r_bm25,
                "rrf_score": round(rrf_score, 5),
                "hybrid_score": round(blended_score, 4)
            })

        # Rank candidates based on selected mode
        if mode == "dense":
            candidates.sort(key=lambda x: x["dense_score"], reverse=True)
        elif mode == "bm25":
            candidates.sort(key=lambda x: x["bm25_score"], reverse=True)
        else:
            candidates.sort(key=lambda x: x["rrf_score"], reverse=True)

        for rank, item in enumerate(candidates, start=1):
            item["retrieval_rank"] = rank

        return {
            "query": query,
            "query_tokens": query_tokens,
            "total_corpus_chunks": total_chunks,
            "alpha": alpha,
            "retrieval_mode": mode,
            "candidates": candidates[:top_k],
            "stats": {
                "dense_weight": f"{int(alpha * 100)}%",
                "bm25_weight": f"{int((1 - alpha) * 100)}%"
            }
        }
