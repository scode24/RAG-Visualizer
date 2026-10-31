from typing import List, Dict, Any, Optional
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    CharacterTextSplitter,
    MarkdownHeaderTextSplitter
)

class ChunkingService:
    """
    Production chunking service leveraging standard LangChain text splitters.
    """
    @staticmethod
    def chunk_document(
        text: str,
        strategy: str = "recursive",
        chunk_size: int = 500,
        chunk_overlap: int = 80,
        semantic_percentile: int = 85,
        doc_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        doc_metadata = doc_metadata or {}
        strategy = (strategy or "recursive").lower().strip()

        if strategy == "fixed":
            splitter = CharacterTextSplitter(
                separator=" ",
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                length_function=len,
                is_separator_regex=False
            )
            raw_docs = splitter.create_documents([text])

        elif strategy == "markdown":
            headers_to_split_on = [
                ("#", "Header 1"),
                ("##", "Header 2"),
                ("###", "Header 3"),
            ]
            md_splitter = MarkdownHeaderTextSplitter(
                headers_to_split_on=headers_to_split_on,
                strip_headers=False
            )
            md_docs = md_splitter.split_text(text)
            # If any header section is longer than chunk_size, further divide it
            sub_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
            raw_docs = sub_splitter.split_documents(md_docs)

        elif strategy in ["semantic", "sentence"]:
            # Sentence-aware recursive split using punctuation boundaries
            splitter = RecursiveCharacterTextSplitter(
                separators=[".\n", ". ", "? ", "! ", "\n\n", "\n"],
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )
            raw_docs = splitter.create_documents([text])

        else: # Standard "recursive"
            splitter = RecursiveCharacterTextSplitter(
                separators=["\n\n", "\n", " ", ""],
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                length_function=len
            )
            raw_docs = splitter.create_documents([text])

        # Format into unified chunk records
        chunks = []
        for idx, doc in enumerate(raw_docs):
            content = doc.page_content.strip()
            if not content:
                continue
            chunks.append({
                "id": f"chunk-{idx+1}",
                "index": idx,
                "text": content,
                "char_length": len(content),
                "token_estimate": max(1, len(content) // 4),
                "strategy": strategy,
                "metadata": {
                    **doc_metadata,
                    **doc.metadata,
                    "chunk_index": idx,
                    "total_chunks_estimate": len(raw_docs)
                }
            })
        return chunks
