import httpx
from typing import Any, Dict, List, Optional
from loguru import logger
import asyncio
import os


class OllamaClient:
    def __init__(self, base_url: str = "http://localhost:11434") -> None:
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(timeout=60)

    async def list_models(self) -> Dict[str, Any]:
        url = f"{self.base_url}/api/tags"
        resp = await self._client.get(url)
        resp.raise_for_status()
        return resp.json()

    async def chat(self, model: str, prompt: str, images: Optional[List[str]] = None, context: Optional[str] = None, tools: Optional[List[Dict[str, Any]]] = None) -> str:
        url = f"{self.base_url}/api/chat"
        messages = []
        if context:
            messages.append({"role": "system", "content": context})
        messages.append({"role": "user", "content": prompt})
        body: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": False,
        }
        if images:
            # Ollama vision models support images array in messages content
            body["messages"] = [
                m if m["role"] != "user" else {"role": "user", "content": prompt, "images": images}
                for m in body["messages"]
            ]
        if tools:
            body["tools"] = tools
        resp = await self._client.post(url, json=body)
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "")

    async def embed(self, model: str, text: str) -> List[float]:
        url = f"{self.base_url}/api/embeddings"
        resp = await self._client.post(url, json={"model": model, "prompt": text})
        resp.raise_for_status()
        data = resp.json()
        return data.get("embedding", [])

    async def create_model(self, name: str, modelfile_path: str) -> None:
        # Note: Ollama model create is via CLI; we shell out here for simplicity
        import subprocess
        logger.info(f"Creating Ollama model: {name} from {modelfile_path}")
        subprocess.run(["ollama", "create", name, "-f", modelfile_path], check=True)

    async def aclose(self) -> None:
        await self._client.aclose()