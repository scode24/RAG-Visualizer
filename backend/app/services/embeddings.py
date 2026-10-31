import os
import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

try:
    from google import genai
    GENAI_AVAILABLE = True
except Exception:
    GENAI_AVAILABLE = False

class EmbeddingService:
    @staticmethod
    def get_available_models() -> List[Dict[str, Any]]:
        return [
            {
                "id": "gemini-text-embedding-004",
                "name": "Google Gemini (text-embedding-004)",
                "provider": "gemini",
                "dimensions": 768,
                "description": "Production standard Google high-density multilingual embeddings",
                "requires_api_key": True
            },
            {
                "id": "fast-local-tfidf",
                "name": "Scikit-Learn TF-IDF Dense (384-dim)",
                "provider": "fast-local",
                "dimensions": 384,
                "description": "Standard Scikit-Learn TF-IDF sublinear normalized dense representation",
                "requires_api_key": False
            }
        ]

    @staticmethod
    def embed_texts(
        texts: List[str],
        provider: str = "gemini",
        api_key: Optional[str] = None
    ) -> List[List[float]]:
        if not texts:
            return []

        clean_texts = [t.strip() if t.strip() else "empty document" for t in texts]

        # 1. Google Gemini Embeddings API
        if provider.startswith("gemini") and api_key and GENAI_AVAILABLE:
            try:
                client = genai.Client(api_key=api_key)
                result = client.models.embed_content(
                    model="text-embedding-004",
                    contents=clean_texts
                )
                if hasattr(result, "embeddings") and result.embeddings:
                    embeddings = [e.values for e in result.embeddings]
                    return [EmbeddingService._normalize(np.array(emb, dtype=np.float32)).tolist() for emb in embeddings]
            except Exception as e:
                print(f"[EmbeddingService] Gemini API embed failed ({e}), using Scikit-Learn vectorizer.")

        # 2. Scikit-Learn standard TfidfVectorizer fallback
        return EmbeddingService._embed_sklearn_tfidf(clean_texts)

    @staticmethod
    def embed_query(
        query: str,
        provider: str = "gemini",
        api_key: Optional[str] = None
    ) -> List[float]:
        results = EmbeddingService.embed_texts([query], provider=provider, api_key=api_key)
        return results[0] if results else [0.0] * 384

    @staticmethod
    def _normalize(vec: np.ndarray) -> np.ndarray:
        norm = np.linalg.norm(vec)
        return (vec / norm) if norm > 1e-8 else vec

    @staticmethod
    def _embed_sklearn_tfidf(texts: List[str], dim: int = 384) -> List[List[float]]:
        """
        Uses standard Scikit-Learn TfidfVectorizer to create normalized dense vectors.
        """
        vectorizer = TfidfVectorizer(
            max_features=dim,
            sublinear_tf=True,
            norm='l2',
            ngram_range=(1, 2)
        )
        try:
            tfidf_matrix = vectorizer.fit_transform(texts).toarray()
            # Pad if vocabulary is smaller than dim
            if tfidf_matrix.shape[1] < dim:
                pad = np.zeros((tfidf_matrix.shape[0], dim - tfidf_matrix.shape[1]), dtype=np.float32)
                tfidf_matrix = np.hstack([tfidf_matrix, pad])
            return tfidf_matrix.astype(np.float32).tolist()
        except ValueError:
            # Empty vocabulary fallback
            return np.zeros((len(texts), dim), dtype=np.float32).tolist()
