from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os

from app.settings.config import Settings, get_settings
from app.models.schema import ChatRequest, ChatResponse, RagIngestResponse
from app.llm.ollama_client import OllamaClient
from app.orchestrator.msync import MultiModelOrchestrator
from app.rag.pipeline import RagPipeline
from app.stt.whisper import transcribe_file
from app.vision.vision import analyze_image
from app.imggen.generator import generate_image
from app.execution.sandbox import run_code_safely
from app.memory.short_term import ShortTermMemory
from app.memory.long_term import init_db, add_message, get_messages
from app.semantics.analyze import summarize as summarize_text, sentiment as sentiment_text
from app.tools.registry import run_tools

settings: Settings = get_settings()

app = FastAPI(title="Local Cognitive AGI (Ollama)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ollama_client = OllamaClient(base_url=settings.ollama_host)
rag = RagPipeline(data_dir=settings.data_dir, embedding_model=settings.embedding_model, ollama_client=ollama_client)
orchestrator = MultiModelOrchestrator(ollama=ollama_client, default_models=settings.default_chat_models)
short_mem = ShortTermMemory()


@app.on_event("startup")
async def on_startup():
    await init_db()


@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/models")
async def list_models():
    return await ollama_client.list_models()


class ChatBody(BaseModel):
    message: str
    models: Optional[List[str]] = None
    use_rag: bool = False
    image_urls: Optional[List[str]] = None
    tools: Optional[List[str]] = None
    session_id: Optional[str] = "default"


@app.post("/api/chat")
async def chat(body: ChatBody):
    session_id = body.session_id or "default"

    context_docs: List[str] = []
    if body.use_rag:
        context_docs = rag.retrieve(body.message, top_k=4)

    import logging
    logger = logging.getLogger(__name__)

    image_context: List[str] = []
    if body.image_urls:
        for url in body.image_urls:
            try:
                desc = await analyze_image(url)
                image_context.append(desc)
            except Exception as e:
                logger.error(f"Image analysis failed for URL {url}: {e}", exc_info=True)
                image_context.append(f"Image analysis failed for {url}.")
                continue

    tool_context = ""
    if body.tools:
        tool_context = await run_tools(body.tools, body.message)

    short_history = short_mem.get(session_id)
    history_text = "\n".join([f"{m['role']}: {m['content']}" for m in short_history[-8:]])

    guidance_parts = []
    if history_text:
        guidance_parts.append("Conversation history:\n" + history_text)
    if context_docs:
        guidance_parts.append("Retrieved context:\n" + "\n---\n".join(context_docs))
    if image_context:
        guidance_parts.append("Image analysis:\n" + "\n".join(image_context))
    if tool_context:
        guidance_parts.append("Tools:\n" + tool_context)
    guidance = "\n\n".join(guidance_parts) if guidance_parts else None

    short_mem.add(session_id, "user", body.message)
    await add_message(session_id, "user", body.message)

    reply = await orchestrator.chat(
        prompt=body.message,
        models=body.models,
        context=guidance,
        tools=body.tools or [],
    )

    short_mem.add(session_id, "assistant", reply)
    await add_message(session_id, "assistant", reply)

    return {"reply": reply}


@app.post("/api/rag/ingest")
async def rag_ingest(file: UploadFile = File(...)) -> RagIngestResponse:
    path = await rag.save_and_ingest(file)
    return RagIngestResponse(ok=True, path=path)


@app.post("/api/stt")
async def stt(file: UploadFile = File(...)):
    text = await transcribe_file(file)
    return {"text": text}


class CodeExecBody(BaseModel):
    language: str
    code: str
    timeout_sec: int = 10


@app.post("/api/exec")
async def exec_code(body: CodeExecBody):
    result = run_code_safely(language=body.language, code=body.code, timeout_sec=body.timeout_sec)
    return result


class ImageGenBody(BaseModel):
    prompt: str
    width: int = 512
    height: int = 512
    steps: int = 25


@app.post("/api/image/generate")
async def image_generate(body: ImageGenBody):
    image_path = await generate_image(prompt=body.prompt, width=body.width, height=body.height, steps=body.steps)
    return {"image_path": image_path}


class GGUFCreateBody(BaseModel):
    name: str


@app.post("/api/models/gguf")
async def upload_gguf(name: str = Form(...), file: UploadFile = File(...)):
    # Save GGUF
    models_dir = os.path.join(settings.data_dir, "gguf")
    os.makedirs(models_dir, exist_ok=True)
    dest_path = os.path.join(models_dir, file.filename)
    content = await file.read()
    with open(dest_path, "wb") as f:
        f.write(content)

    # Create Modelfile and run "ollama create"
    modelfile = f"FROM {dest_path}\nPARAMETER temperature 0.7\n"
    tmp_modelfile = os.path.join(models_dir, f"{name}.Modelfile")
    with open(tmp_modelfile, "w") as f:
        f.write(modelfile)

    await ollama_client.create_model(name=name, modelfile_path=tmp_modelfile)
    return {"ok": True, "name": name}


@app.get("/api/search")
async def web_search(q: str):
    if not settings.allow_web_access:
        raise HTTPException(status_code=403, detail="Web access disabled")
    from app.tools.web_search import search_and_summarize
    result = await search_and_summarize(q)
    return result


@app.get("/api/semantics")
async def semantics(q: str):
    return {
        "summary": summarize_text(q),
        "sentiment": sentiment_text(q),
    }


class SettingsUpdate(BaseModel):
    allow_web_access: Optional[bool] = None
    cuda_enabled: Optional[bool] = None


@app.post("/api/settings")
async def update_settings(body: SettingsUpdate):
    if body.allow_web_access is not None:
        settings.allow_web_access = body.allow_web_access
    if body.cuda_enabled is not None:
        settings.cuda_enabled = body.cuda_enabled
    return {"ok": True, "settings": settings.model_dump()}