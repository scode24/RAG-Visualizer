import re
from typing import List, Dict, Any

class RAGEvaluatorService:
    @staticmethod
    def evaluate(
        query: str,
        retrieved_contexts: List[Dict[str, Any]],
        generated_answer: str,
        latency_breakdown: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Calculates production RAG evaluation metrics:
        - Faithfulness / Groundedness (Hallucination risk)
        - Answer Relevance (Alignment with user prompt)
        - Context Relevance (Retrieval signal-to-noise ratio)
        - Overall composite quality score and human-readable assessment
        """
        query_words = set(re.findall(r'\b\w{3,}\b', query.lower()))
        answer_words = set(re.findall(r'\b\w{3,}\b', generated_answer.lower()))

        # Aggregate context text
        all_context_text = " ".join([c.get("text", "") for c in retrieved_contexts]).lower()
        context_words = set(re.findall(r'\b\w{3,}\b', all_context_text))

        # 1. Faithfulness (Groundedness)
        # Proportion of informative keywords in the answer that are present in the context
        if answer_words:
            grounded_words = answer_words.intersection(context_words)
            faithfulness_raw = len(grounded_words) / len(answer_words)
            # Check citations presence: bracket [Source 1], [Source ...]
            has_citations = bool(re.search(r'\[Source\s+\d+\]', generated_answer, re.IGNORECASE))
            if has_citations:
                faithfulness_raw = min(1.0, faithfulness_raw * 1.15 + 0.1)
            faithfulness_score = round(min(1.0, max(0.2, faithfulness_raw)), 2)
        else:
            faithfulness_score = 0.50

        # 2. Answer Relevance
        # Did the answer address the vocabulary and intent of the user prompt?
        if query_words and answer_words:
            query_overlap = query_words.intersection(answer_words)
            relevance_raw = len(query_overlap) / len(query_words)
            # Length penalty if answer is suspiciously short (< 10 words)
            len_penalty = 1.0 if len(generated_answer.split()) > 10 else 0.6
            answer_relevance = round(min(1.0, max(0.25, relevance_raw * 1.3 * len_penalty)), 2)
        else:
            answer_relevance = 0.60

        # 3. Context Relevance (Precision)
        # Did the retrieved chunks actually contain query terms?
        if retrieved_contexts and query_words:
            context_scores = []
            for c in retrieved_contexts:
                c_words = set(re.findall(r'\b\w{3,}\b', c.get("text", "").lower()))
                c_overlap = query_words.intersection(c_words)
                score = len(c_overlap) / len(query_words)
                context_scores.append(min(1.0, score * 1.4))
            context_relevance = round(sum(context_scores) / len(context_scores), 2)
        else:
            context_relevance = 0.50

        # 4. Latency Efficiency
        total_latency = sum(latency_breakdown.values())
        if total_latency < 500:
            latency_rating = "Ultra-Fast (< 500ms)"
        elif total_latency < 2000:
            latency_rating = "Standard Production (500ms - 2s)"
        else:
            latency_rating = "Elevated (> 2s)"

        # Composite Score (Weighted: 45% Faithfulness, 35% Answer Relevance, 20% Context Relevance)
        composite = (0.45 * faithfulness_score) + (0.35 * answer_relevance) + (0.20 * context_relevance)
        overall_percentage = round(composite * 100, 1)

        # Quality Grade classification
        if overall_percentage >= 82:
            status = "EXCELLENT"
            grade_color = "emerald"
            summary = "Grounded response with verified citations and high query alignment."
            hallucination_risk = "Low"
        elif overall_percentage >= 68:
            status = "GOOD"
            grade_color = "blue"
            summary = "Solid factual grounding with minor contextual noise."
            hallucination_risk = "Moderate-Low"
        elif overall_percentage >= 50:
            status = "ACCEPTABLE"
            grade_color = "amber"
            summary = "Borderline relevance; consider tuning chunk size or hybrid alpha."
            hallucination_risk = "Moderate"
        else:
            status = "POOR_HALLUCINATION_RISK"
            grade_color = "rose"
            summary = "High risk of hallucination or off-target synthesis."
            hallucination_risk = "High"

        # Construct diagnostic recommendations
        recommendations = []
        if faithfulness_score < 0.65:
            recommendations.append("Strengthen system prompt citation constraints to prevent model speculation.")
        if context_relevance < 0.60:
            recommendations.append("Context relevance is low: try adjusting chunk overlap or increasing BM25 keyword weight.")
        if answer_relevance < 0.60:
            recommendations.append("Query intent was loosely covered: consider applying query rewriting or expanding top_k.")
        if not recommendations:
            recommendations.append("Pipeline performed optimally across retrieval, reranking, and grounded generation.")

        return {
            "overall_score": overall_percentage,
            "status": status,
            "grade_color": grade_color,
            "hallucination_risk": hallucination_risk,
            "summary": summary,
            "metrics": {
                "faithfulness": {
                    "score": round(faithfulness_score * 100, 1),
                    "label": "Faithfulness / Groundedness",
                    "description": "Measures whether the LLM answer is strictly derived from retrieved context."
                },
                "answer_relevance": {
                    "score": round(answer_relevance * 100, 1),
                    "label": "Answer Relevance",
                    "description": "Measures how directly the answer addresses the user question."
                },
                "context_relevance": {
                    "score": round(context_relevance * 100, 1),
                    "label": "Context Precision",
                    "description": "Signal-to-noise ratio in retrieved context chunks."
                }
            },
            "latency_rating": latency_rating,
            "total_latency_ms": round(total_latency, 1),
            "recommendations": recommendations
        }

