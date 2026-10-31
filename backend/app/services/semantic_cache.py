import time
import numpy as np
from typing import Dict, Any, List, Optional
from sklearn.metrics.pairwise import cosine_similarity

class SemanticCache:
    def __init__(self, default_threshold: float = 0.88):
        self.default_threshold = default_threshold
        self._cache_entries: List[Dict[str, Any]] = []
        self._stats = {
            "total_queries": 0,
            "hits": 0,
            "misses": 0,
            "estimated_saved_latency_ms": 0.0,
            "estimated_saved_tokens": 0
        }

    def check(
        self,
        query: str,
        query_embedding: List[float],
        threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        self._stats["total_queries"] += 1
        threshold = threshold if threshold is not None else self.default_threshold

        if not self._cache_entries or not query_embedding:
            self._stats["misses"] += 1
            return {
                "hit": False,
                "similarity": 0.0,
                "threshold": threshold,
                "cached_entry": None,
                "message": "Cache is empty"
            }

        # Vectorized cosine similarity using Scikit-Learn
        q_vec = np.array([query_embedding], dtype=np.float32)
        cache_matrix = np.array([e["embedding"] for e in self._cache_entries], dtype=np.float32)

        if q_vec.shape[1] != cache_matrix.shape[1]:
            self._stats["misses"] += 1
            return {"hit": False, "similarity": 0.0, "threshold": threshold, "message": "Dimension mismatch"}

        similarities = cosine_similarity(q_vec, cache_matrix)[0]
        best_idx = int(np.argmax(similarities))
        best_score = float(similarities[best_idx])
        best_entry = self._cache_entries[best_idx]

        if best_score >= threshold:
            self._stats["hits"] += 1
            best_entry["hit_count"] += 1
            saved_ms = best_entry.get("latency_ms", 1200.0)
            saved_tokens = best_entry.get("tokens_used", 350)
            self._stats["estimated_saved_latency_ms"] += saved_ms
            self._stats["estimated_saved_tokens"] += saved_tokens

            return {
                "hit": True,
                "similarity": round(best_score, 4),
                "threshold": threshold,
                "matched_query": best_entry["prompt"],
                "cached_response": best_entry["response"],
                "cached_at": best_entry["created_at"],
                "hit_count": best_entry["hit_count"],
                "saved_latency_ms": round(saved_ms, 1),
                "saved_tokens": saved_tokens,
                "sources": best_entry.get("sources", []),
                "evaluation": best_entry.get("evaluation", None)
            }
        else:
            self._stats["misses"] += 1
            return {
                "hit": False,
                "similarity": round(max(0.0, best_score), 4),
                "threshold": threshold,
                "nearest_candidate": best_entry["prompt"],
                "message": f"Similarity ({round(best_score, 3)}) below threshold ({threshold})"
            }

    def set(
        self,
        prompt: str,
        query_embedding: List[float],
        response: str,
        sources: Optional[List[Dict[str, Any]]] = None,
        latency_ms: float = 1200.0,
        tokens_used: int = 350,
        evaluation: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        entry_id = f"cache-{len(self._cache_entries)+1}"
        entry = {
            "id": entry_id,
            "prompt": prompt,
            "embedding": query_embedding,
            "response": response,
            "sources": sources or [],
            "latency_ms": latency_ms,
            "tokens_used": tokens_used,
            "evaluation": evaluation,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "hit_count": 0
        }
        self._cache_entries.append(entry)
        if len(self._cache_entries) > 100:
            self._cache_entries.pop(0)
        return {"status": "saved", "id": entry_id, "size": len(self._cache_entries)}

    def get_stats(self) -> Dict[str, Any]:
        total = self._stats["total_queries"]
        hits = self._stats["hits"]
        hit_rate = round((hits / total * 100), 1) if total > 0 else 0.0
        return {
            "total_queries": total,
            "hits": hits,
            "misses": self._stats["misses"],
            "hit_rate_percent": hit_rate,
            "entries_count": len(self._cache_entries),
            "estimated_saved_latency_ms": round(self._stats["estimated_saved_latency_ms"], 1),
            "estimated_saved_tokens": self._stats["estimated_saved_tokens"],
            "recent_entries": [
                {
                    "id": e["id"],
                    "prompt": e["prompt"],
                    "hit_count": e["hit_count"],
                    "created_at": e["created_at"],
                    "response_preview": e["response"][:100] + "..." if len(e["response"]) > 100 else e["response"]
                }
                for e in reversed(self._cache_entries[-8:])
            ]
        }

    def clear(self) -> None:
        self._cache_entries = []
        self._stats = {
            "total_queries": 0,
            "hits": 0,
            "misses": 0,
            "estimated_saved_latency_ms": 0.0,
            "estimated_saved_tokens": 0
        }

# Global singleton
global_semantic_cache = SemanticCache()
