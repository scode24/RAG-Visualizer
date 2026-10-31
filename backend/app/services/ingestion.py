import os
import io
import json
import csv
import re
from typing import Dict, Any, List, Optional
from pypdf import PdfReader
from docx import Document as DocxDocument

class DocumentParser:
    @staticmethod
    def parse_file(file_bytes: bytes, filename: str) -> Dict[str, Any]:
        ext = os.path.splitext(filename)[1].lower()
        text = ""
        metadata = {
            "filename": filename,
            "format": ext.lstrip("."),
            "byte_size": len(file_bytes),
            "pages": 1
        }

        if ext == ".pdf":
            reader = PdfReader(io.BytesIO(file_bytes))
            pages_text = []
            for i, page in enumerate(reader.pages):
                extracted = page.extract_text() or ""
                pages_text.append(extracted)
            text = "\n\n".join(pages_text)
            metadata["pages"] = len(reader.pages)

        elif ext in [".docx", ".doc"]:
            doc = DocxDocument(io.BytesIO(file_bytes))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            text = "\n\n".join(paragraphs)
            metadata["paragraphs"] = len(paragraphs)

        elif ext in [".txt", ".text"]:
            text = file_bytes.decode("utf-8", errors="replace")

        elif ext in [".md", ".markdown"]:
            text = file_bytes.decode("utf-8", errors="replace")

        elif ext == ".json":
            raw_data = json.loads(file_bytes.decode("utf-8", errors="replace"))
            if isinstance(raw_data, list):
                text = "\n\n".join([json.dumps(item, indent=2) for item in raw_data])
            else:
                text = json.dumps(raw_data, indent=2)
            metadata["is_structured_json"] = True

        elif ext in [".csv", ".tsv"]:
            delimiter = "\t" if ext == ".tsv" else ","
            content = file_bytes.decode("utf-8", errors="replace")
            reader = csv.reader(io.StringIO(content), delimiter=delimiter)
            rows = list(reader)
            if rows:
                header = rows[0]
                lines = [f"Columns: {', '.join(header)}"]
                for row in rows[1:]:
                    lines.append(" | ".join(row))
                text = "\n".join(lines)
            metadata["row_count"] = len(rows)

        elif ext in [".html", ".htm"]:
            raw_html = file_bytes.decode("utf-8", errors="replace")
            # Strip tags cleanly
            clean = re.sub(r'<script.*?</script>', '', raw_html, flags=re.DOTALL)
            clean = re.sub(r'<style.*?</style>', '', clean, flags=re.DOTALL)
            clean = re.sub(r'<[^<]+?>', ' ', clean)
            text = re.sub(r'\s+', ' ', clean).strip()

        else:
            # Fallback text decoder
            text = file_bytes.decode("utf-8", errors="replace")

        # Clean multiple empty lines
        text = re.sub(r'\n{3,}', '\n\n', text).strip()
        metadata["char_count"] = len(text)
        metadata["word_count"] = len(text.split())

        return {
            "text": text,
            "metadata": metadata
        }

