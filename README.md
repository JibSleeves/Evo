# Local Cognitive AGI System (Ollama-powered)

An extensible, privacy-first, locally running cognitive system that orchestrates multiple Ollama models with GPU acceleration, Retrieval-Augmented Generation (RAG), vision, image generation, speech-to-text, tool use, sandboxed code execution, and more.

This repository provides a production-lean, modular blueprint you can run locally. It emphasizes:
- CUDA-accelerated inference where available
- Multiple synchronized models (MSync) for robustness
- Document/PDF RAG with GUI uploading
- Vision and image generation capabilities (local-first)
- GGUF upload/management via Ollama
- Rich settings, memory, and autonomous tools (web search, code execution)


## High-level Architecture

- `backend/` (FastAPI, Python 3.10+)
  - `app/llm/ollama_client.py`: Async client for Ollama chat/generate, model listing, and image workflows
  - `app/orchestrator/msync.py`: Multi-model synchronization (parallel querying + fusion strategies)
  - `app/rag/`: RAG pipeline (PDF/text ingestion, chunking, embedding, FAISS vector search)
  - `app/vision/vision.py`: Vision analysis via Ollama vision models (e.g., llama-vision/llava) or YOLO fallback
  - `app/imggen/generator.py`: Image generation (Diffusers/Stable Diffusion or Ollama model if present)
  - `app/stt/whisper.py`: Speech-to-text via Faster-Whisper (CUDA if available)
  - `app/tools/web_search.py`: Local autonomous web retrieval (DuckDuckGo HTML + scraping)
  - `app/execution/sandbox.py`: Sandboxed code execution with resource/time limits
  - `app/settings/config.py`: Central config and runtime settings
  - `app/models/schema.py`: Pydantic API schemas
  - `app/main.py`: API wiring, routes, and middleware

- `frontend/` (Vite + React + TypeScript)
  - Minimal GUI to chat, upload files (PDF, text, images), select models (multi-select), run STT, configure settings, and view generated images.

- Optional `docker-compose.yml` to run Ollama + backend + frontend (GPU passthrough if available).


## Key Capabilities

- CUDA Support: Uses PyTorch + Faster-Whisper CUDA where available; Ollama can leverage GPU when built with CUDA.
- Deep Reasoning: Compose capable reasoning models (Llama 3.x, Qwen, Mistral variants). Tool-calling and RAG improve reasoning depth.
- Multi-Model Sync (MSync): Query multiple models in parallel and fuse outputs via self-consistency and reranking.
- RAG: Upload PDFs or docs; chunks are embedded (Ollama embeddings or sentence-transformers) and stored in FAISS for retrieval.
- Vision: Image understanding via Ollama vision models (e.g., `llava`, `llama3.2-vision`, `moondream`) with fallback pipelines.
- Image Generation: Optional local Stable Diffusion via Diffusers; or Ollama image models if present.
- GGUF Management: Upload GGUF files, register via Modelfile, and create Ollama models.
- Memory: Short-term per-session memory and long-term SQLite-backed memory.
- Web Search: Local web retrieval for Autonomous RAG.
- Code Generation + Execution: Generate code and safely execute in a sandbox.
- Screen Observation (optional): Browser-based screen-share to the backend for analysis.
- STT: Microphone capture -> Faster-Whisper transcription.
- Tool Calling: Extensible tool registry exposed to the LLM.


## Prerequisites

- Linux with NVIDIA GPU (optional but recommended for CUDA acceleration)
- Ollama installed and running locally
  - See `https://ollama.com` for installation instructions
  - Start the server: `ollama serve`
- Python 3.10+
- Node.js 18+ (for frontend)

Optional heavy models (download on first-run):
- Stable Diffusion (Diffusers) weights
- YOLO weights (Ultralytics)


## Quick Start (Local, no Docker)

1) Start Ollama in another terminal:

```
ollama serve
```

Optionally pull recommended models:

```
ollama pull llama3
ollama pull llama3.2-vision
ollama pull mistral
ollama pull qwen2
ollama pull llava:13b
ollama pull nomic-embed-text
```

2) Backend setup:

```
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

3) Frontend setup:

```
cd frontend
npm install
npm run dev
```

- Backend API: `http://localhost:8080`
- Frontend dev: `http://localhost:5173`


## Environment Variables

Create `backend/.env` (optional):

```
OLLAMA_HOST=http://localhost:11434
DATA_DIR=/workspace/data
EMBEDDING_MODEL=nomic-embed-text
DEFAULT_CHAT_MODELS=llama3,mistral
CUDA_ENABLED=true
ALLOW_WEB_ACCESS=true
```


## GGUF Upload & Model Creation

- Use the GUI or POST `/api/models/gguf` to upload a `.gguf` file.
- The backend generates a minimal Modelfile and runs `ollama create <name> -f Modelfile`.
- New models appear in `/api/models` once created.


## Security & Privacy

- Local-first: No data leaves your machine unless you enable web tools.
- Long-term memory stored locally under `backend/.data` (SQLite) by default.
- Screen capture and web search are opt-in.


## Notes on Advanced Features

- Self-coding: The system can draft edits to a sandbox workspace; you decide whether to apply.
- Reinforcement/Unsupervised: Hooks exist for logging interactions and running offline optimization.
- Subjective/Imaginative reasoning: Achieved via model ensembles and prompting strategies.


## Roadmap

- Add GPU-optional YOLO and Diffusers auto-setup
- Expand multi-agent tool planning
- Plugin SDK for third-party tools


## License

Apache-2.0
