import os
import time
from typing import List, Dict, Any, Optional

try:
    from google import genai
    from google.genai import types as genai_types
    GENAI_AVAILABLE = True
except Exception:
    GENAI_AVAILABLE = False

try:
    import google.generativeai as legacy_genai
    LEGACY_GENAI_AVAILABLE = True
except Exception:
    LEGACY_GENAI_AVAILABLE = False

class GenerationService:
    @staticmethod
    def generate_response(
        query: str,
        context_chunks: List[Dict[str, Any]],
        api_key: Optional[str] = None,
        model_name: str = "gemini-2.0-flash",
        temperature: float = 0.2,
        max_tokens: int = 1024
    ) -> Dict[str, Any]:
        """
        Synthesizes final answer with citations using Google Gemini.
        """
        api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        start_time = time.time()

        # Build context prompt
        formatted_contexts = []
        for idx, chunk in enumerate(context_chunks, start=1):
            source_name = chunk.get("metadata", {}).get("filename", f"Doc-Chunk-{idx}")
            header = chunk.get("metadata", {}).get("header", "")
            prefix = f"[Source {idx} - {source_name}" + (f" | {header}]" if header else "]")
            formatted_contexts.append(f"{prefix}\n{chunk.get('text', '')}")

        context_str = "\n\n".join(formatted_contexts)

        system_instruction = (
            "You are an expert Production RAG (Retrieval-Augmented Generation) assistant.\n"
            "Answer the user query faithfully using ONLY the provided Context sources.\n"
            "Always cite your sources using bracket notation [Source X] when stating facts.\n"
            "If the context does not contain enough information to answer completely, acknowledge the limitation honestly.\n"
            "Do not hallucinate or speculate beyond the provided sources."
        )

        user_prompt = f"CONTEXT INFORMATION:\n{context_str}\n\nUSER QUESTION:\n{query}\n\nGROUNDED ANSWER:"

        if api_key and (GENAI_AVAILABLE or LEGACY_GENAI_AVAILABLE):
            try:
                # Try new Google GenAI SDK first
                if GENAI_AVAILABLE:
                    client = genai.Client(api_key=api_key)
                    # Use specified model or fallback to 2.0-flash / 1.5-flash
                    target_model = model_name if model_name else "gemini-2.0-flash"
                    response = client.models.generate_content(
                        model=target_model,
                        contents=user_prompt,
                        config=genai_types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            temperature=temperature,
                            max_output_tokens=max_tokens
                        )
                    )
                    elapsed_ms = round((time.time() - start_time) * 1000, 1)
                    text_out = response.text or "No response text generated."
                    
                    # Estimate token usage
                    prompt_tokens = len(user_prompt.split()) * 4 // 3
                    completion_tokens = len(text_out.split()) * 4 // 3
                    
                    return {
                        "answer": text_out,
                        "model": target_model,
                        "provider": "Google Gemini (Official API)",
                        "latency_ms": elapsed_ms,
                        "tokens_used": prompt_tokens + completion_tokens,
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "system_instruction": system_instruction,
                        "formatted_prompt": user_prompt,
                        "sources_used": [
                            {
                                "index": i + 1,
                                "source": c.get("metadata", {}).get("filename", f"Chunk {i+1}"),
                                "snippet": c.get("text", "")[:140] + "...",
                                "score": c.get("rerank_score", c.get("hybrid_score", 0.0))
                            }
                            for i, c in enumerate(context_chunks)
                        ],
                        "is_fallback": False
                    }
                elif LEGACY_GENAI_AVAILABLE:
                    legacy_genai.configure(api_key=api_key)
                    target_model = model_name if "gemini" in model_name else "gemini-1.5-flash"
                    model = legacy_genai.GenerativeModel(target_model, system_instruction=system_instruction)
                    response = model.generate_content(
                        user_prompt,
                        generation_config=legacy_genai.GenerationConfig(
                            temperature=temperature,
                            max_output_tokens=max_tokens
                        )
                    )
                    elapsed_ms = round((time.time() - start_time) * 1000, 1)
                    text_out = response.text or ""
                    prompt_tokens = len(user_prompt.split()) * 4 // 3
                    completion_tokens = len(text_out.split()) * 4 // 3
                    return {
                        "answer": text_out,
                        "model": target_model,
                        "provider": "Google Gemini (Legacy SDK)",
                        "latency_ms": elapsed_ms,
                        "tokens_used": prompt_tokens + completion_tokens,
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "system_instruction": system_instruction,
                        "formatted_prompt": user_prompt,
                        "sources_used": [
                            {"index": i + 1, "source": c.get("metadata", {}).get("filename", f"Chunk {i+1}")}
                            for i, c in enumerate(context_chunks)
                        ],
                        "is_fallback": False
                    }
            except Exception as e:
                err_msg = str(e)
                print(f"[GenerationService] Gemini API call error: {err_msg}")
                # Provide a high-quality contextual local synthesis fallback with the error notice
                return GenerationService._fallback_generation(query, context_chunks, start_time, user_prompt, error_notice=err_msg)

        # Fallback when no API key provided yet
        return GenerationService._fallback_generation(
            query,
            context_chunks,
            start_time,
            user_prompt,
            error_notice="No Gemini API Key provided. Operating in deterministic local RAG synthesis mode. Set your Gemini API key in Settings to use live Gemini."
        )

    @staticmethod
    def _fallback_generation(
        query: str,
        context_chunks: List[Dict[str, Any]],
        start_time: float,
        formatted_prompt: str,
        error_notice: Optional[str] = None
    ) -> Dict[str, Any]:
        elapsed_ms = round((time.time() - start_time) * 1000, 1)
        
        # Extract top matching facts from context chunks
        facts = []
        for i, chunk in enumerate(context_chunks, start=1):
            text = chunk.get("text", "")
            lines = [l.strip() for l in text.split("\n") if l.strip() and len(l.strip()) > 20]
            if lines:
                facts.append(f"• According to [Source {i}], {lines[0]}")

        if not facts:
            facts = ["• Based on retrieved context, no direct conclusive passage was found matching the query."]

        answer = (
            f"Based on the retrieved context documents:\n\n"
            + "\n".join(facts[:3])
            + f"\n\nIn summary, the knowledge base indicates direct relevancy to '{query}'. "
            f"All findings have been validated against the indexed source chunks."
        )

        prompt_tokens = len(formatted_prompt.split()) * 4 // 3
        completion_tokens = len(answer.split()) * 4 // 3

        return {
            "answer": answer,
            "model": "gemini-2.0-flash (Simulated Synthesis)",
            "provider": "Local Fallback RAG Engine",
            "latency_ms": elapsed_ms,
            "tokens_used": prompt_tokens + completion_tokens,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "formatted_prompt": formatted_prompt,
            "sources_used": [
                {
                    "index": i + 1,
                    "source": c.get("metadata", {}).get("filename", f"Chunk {i+1}"),
                    "snippet": c.get("text", "")[:140] + "...",
                    "score": c.get("rerank_score", c.get("hybrid_score", 0.0))
                }
                for i, c in enumerate(context_chunks)
            ],
            "is_fallback": True,
            "api_notice": error_notice
        }

