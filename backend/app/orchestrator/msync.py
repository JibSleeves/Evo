import asyncio
from typing import List, Optional, Dict
from loguru import logger
from collections import Counter

from app.llm.ollama_client import OllamaClient


class MultiModelOrchestrator:
    def __init__(self, ollama: OllamaClient, default_models: List[str]) -> None:
        self.ollama = ollama
        self.default_models = default_models

    async def chat(self, prompt: str, models: Optional[List[str]] = None, context: Optional[str] = None, tools: Optional[List[str]] = None) -> str:
        model_list = models or self.default_models
        logger.info(f"MSync using models: {model_list}")

        async def ask(model_name: str) -> str:
            try:
                return await self.ollama.chat(model=model_name, prompt=prompt, context=context)
            except Exception as e:
                logger.warning(f"Model {model_name} failed: {e}")
                return ""

        answers = await asyncio.gather(*(ask(m) for m in model_list))
        non_empty = [a.strip() for a in answers if a and a.strip()]
        if not non_empty:
            return "(no answer)"

        # Simple fusion: choose the most common normalized answer; fallback to the longest
        normalized = [self._normalize(a) for a in non_empty]
        counts = Counter(normalized)
        best_norm, _ = counts.most_common(1)[0]
        candidates = [a for a in non_empty if self._normalize(a) == best_norm]
        return candidates[0] if candidates else max(non_empty, key=len)

    def _normalize(self, text: str) -> str:
        return " ".join(text.lower().split())