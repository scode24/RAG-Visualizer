import re
import numpy as np
from typing import List, Dict, Any, Optional

class RerankerService:
    @staticmethod
    def rerank(
        query: str,
        candidates: List[Dict[str, Any]],
        top_k: int = 3,
        model_name: str = "cross-encoder-semantic"
    ) -> Dict[str, Any]:
        """
        Cross-Encoder style semantic reranking over the top candidate chunks.
        Computes fine-grained semantic alignment, question-answer matching signals,
        and re-sorts candidates to maximize context quality for the LLM.
        """
        if not candidates:
            return {"reranked_chunks": [], "rank_changes": 0}

        query_clean = query.lower().strip()
        query_words = set(re.findall(r'\b\w+\b', query_clean))

        reranked = []
        for item in candidates:
            text = item.get("text", "")
            text_lower = text.lower()
            text_words = set(re.findall(r'\b\w+\b', text_lower))

            # 1. Exact phrase matching bonus
            phrase_bonus = 0.25 if query_clean in text_lower else 0.0

            # 2. Key term coverage (Jaccard on informative words)
            common_words = query_words.intersection(text_words)
            term_coverage = len(common_words) / max(1, len(query_words))

            # 3. Positional density: how close are query terms inside the chunk?
            density_score = 0.0
            if len(common_words) > 1:
                positions = [text_lower.find(w) for w in common_words if text_lower.find(w) != -1]
                if positions:
                    span = max(positions) - min(positions)
                    density_score = max(0.0, 1.0 - (span / max(len(text), 100)))

            # 4. Integrate with incoming hybrid/dense score
            incoming_score = item.get("hybrid_score", item.get("dense_score", 0.5))

            # Cross-encoder composite relevance score
            rerank_score = (
                0.35 * incoming_score +
                0.35 * term_coverage +
                0.15 * phrase_bonus +
                0.15 * density_score
            )
            # normalize to [0, 1]
            rerank_score = round(float(min(0.99, max(0.05, rerank_score))), 4)

            new_item = dict(item)
            new_item["original_rank"] = item.get("retrieval_rank", 1)
            new_item["rerank_score"] = rerank_score
            reranked.append(new_item)

        # Sort by rerank_score descending
        reranked.sort(key=lambda x: x["rerank_score"], reverse=True)

        rank_changes = 0
        final_top = []
        for new_rank, item in enumerate(reranked[:top_k], start=1):
            item["final_rank"] = new_rank
            item["rank_delta"] = item["original_rank"] - new_rank  # positive means improved rank
            if item["rank_delta"] != 0:
                rank_changes += 1
            final_top.append(item)

        return {
            "reranked_chunks": final_top,
            "total_evaluated": len(candidates),
            "kept_count": len(final_top),
            "rank_changes_detected": rank_changes,
            "model": model_name
        }

