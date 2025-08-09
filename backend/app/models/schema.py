from pydantic import BaseModel
from typing import List, Optional


class ChatRequest(BaseModel):
    message: str
    models: Optional[List[str]] = None


class ChatResponse(BaseModel):
    reply: str


class RagIngestResponse(BaseModel):
    ok: bool
    path: str