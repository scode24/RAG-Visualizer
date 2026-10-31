import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.app.api.routes import router as api_router
from backend.app.services.pipeline import global_kb
from backend.app.sample_data.default_docs import DEFAULT_DOCUMENTS

app = FastAPI(
    title="Production RAG Pipeline & Visualizer API",
    description="End-to-end production RAG engine with guardrails, hybrid search, semantic caching, reranking, Gemini synthesis, and automated evaluation.",
    version="1.0.0"
)

# CORS middleware for seamless communication with React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Static frontend files mounting for unified production deployment
FRONTEND_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/dist"))

if os.path.isdir(FRONTEND_DIST_DIR):
    assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Don't intercept API routes or docs
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return None
        file_path = os.path.join(FRONTEND_DIST_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(FRONTEND_DIST_DIR, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return {"service": "Production RAG Visualizer API", "status": "online"}
else:
    @app.get("/")
    def root():
        return {
            "service": "Production RAG Visualizer API",
            "status": "online",
            "docs": "/docs",
            "health": "/health"
        }

@app.on_event("startup")
async def startup_event():
    # Populate knowledge base with initial sample documents if not already loaded
    if not global_kb.documents:
        print("[Startup] Initializing Knowledge Base with sample enterprise documents...")
        for doc in DEFAULT_DOCUMENTS:
            global_kb.add_document(doc["filename"], doc["text"])
        print(f"[Startup] Loaded {len(global_kb.documents)} documents, created {len(global_kb.chunks)} chunks.")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "knowledge_base": {
            "documents": len(global_kb.documents),
            "chunks": len(global_kb.chunks)
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
