import os
import io
from typing import List
from loguru import logger
import numpy as np
from PyPDF2 import PdfReader
from fastapi import UploadFile

from app.llm.ollama_client import OllamaClient


def _normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v) + 1e-8
    return v / n


class RagPipeline:
    def __init__(self, data_dir: str, embedding_model: str, ollama_client: OllamaClient) -> None:
        self.data_dir = os.path.join(data_dir, "rag")
        os.makedirs(self.data_dir, exist_ok=True)
        self.embedding_model_name = embedding_model
        self.ollama = ollama_client
        self.store_path = os.path.join(self.data_dir, "store.txt")
        self.emb_path = os.path.join(self.data_dir, "emb.npy")
        self.docs: List[str] = []
        self.embeddings: np.ndarray | None = None
        self._load()

    def _load(self) -> None:
        if os.path.exists(self.store_path):
            with open(self.store_path, "r", encoding="utf-8") as f:
                self.docs = [line.rstrip("\n") for line in f]
        if os.path.exists(self.emb_path):
            self.embeddings = np.load(self.emb_path)

    async def save_and_ingest(self, file: UploadFile) -> str:
        raw = await file.read()
        ext = os.path.splitext(file.filename)[1].lower()
        text = ""
        if ext in [".pdf"]:
            text = self._pdf_to_text(raw)
        else:
            try:
                text = raw.decode("utf-8", errors="ignore")
            except Exception:
                text = ""
        chunks = self._chunk(text)
        await self._add_documents(chunks)
        return os.path.join(self.data_dir, file.filename)

    def _pdf_to_text(self, raw: bytes) -> str:
        reader = PdfReader(io.BytesIO(raw))
        parts: List[str] = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        return "\n".join(parts)

    def _chunk(self, text: str, max_tokens: int = 500) -> List[str]:
        words = text.split()
        chunks: List[str] = []
        current: List[str] = []
        for w in words:
            current.append(w)
            if len(current) >= max_tokens:
                chunks.append(" ".join(current))
                current = []
        if current:
            chunks.append(" ".join(current))
        return chunks

    async def _embed_texts(self, texts: List[str]) -> np.ndarray:
        vectors = []
        for t in texts:
            try:
                v = await self.ollama.embed(model=self.embedding_model_name, text=t)
                if not v:
                    raise RuntimeError("Empty embedding from Ollama")
                vectors.append(v)
            except Exception:
                # naive hashing-based fallback embedding
                seed = abs(hash(t)) % (10**8)
                rng = np.random.default_rng(seed)
                vectors.append(rng.standard_normal(384).tolist())
        arr = np.array(vectors, dtype=np.float32)
        arr = np.apply_along_axis(_normalize, 1, arr)
        return arr

    async def _add_documents(self, chunks: List[str]) -> None:
        if not chunks:
            return
        new_vecs = await self._embed_texts(chunks)
        if self.embeddings is None:
            self.embeddings = new_vecs
        else:
            self.embeddings = np.vstack([self.embeddings, new_vecs])
        self.docs.extend(chunks)
        # persist
        with open(self.store_path, "w", encoding="utf-8") as f:
            for d in self.docs:
                f.write(d + "\n")
        np.save(self.emb_path, self.embeddings)

    def retrieve(self, query: str, top_k: int = 4) -> List[str]:
        if self.embeddings is None or not self.docs:
            return []
        import asyncio
        loop = asyncio.get_event_loop()
        qv = loop.run_until_complete(self._embed_texts([query]))[0]
        sims = (self.embeddings @ qv)
        idxs = np.argsort(-sims)[:top_k]
        return [self.docs[i] for i in idxs]