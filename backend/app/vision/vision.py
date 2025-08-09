import httpx
import base64
import cv2
import numpy as np
from typing import Optional
from app.settings.config import get_settings
from app.llm.ollama_client import OllamaClient


async def analyze_image(image_url: str) -> str:
    # Try Ollama vision model if available
    settings = get_settings()
    ollama = OllamaClient(base_url=settings.ollama_host)
    try:
        # Ask a vision-capable model (user should have pulled one)
        answer = await ollama.chat(model="llama3.2-vision", prompt="Describe the image.", images=[image_url])
        if answer:
            return answer
    except Exception:
        pass

    # Fallback: download and do basic analysis
    async with httpx.AsyncClient() as client:
        r = await client.get(image_url)
        r.raise_for_status()
        data = np.frombuffer(r.content, np.uint8)
        img = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if img is None:
            return "(could not read image)"
        h, w, c = img.shape
        mean_color = img.mean(axis=(0, 1)).astype(int)
        return f"Image {w}x{h}, mean BGR={mean_color.tolist()}"