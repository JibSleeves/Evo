import os
from fastapi import UploadFile
from typing import List

try:
    from faster_whisper import WhisperModel  # type: ignore
except Exception:  # pragma: no cover
    WhisperModel = None  # type: ignore

_model_cache = None

def _get_model():
    global _model_cache
    if WhisperModel is None:
        return None
    if _model_cache is None:
        compute_type = "float16" if os.getenv("CUDA_ENABLED", "true").lower() == "true" else "int8"
        _model_cache = WhisperModel("base", device="cuda" if os.getenv("CUDA_ENABLED", "true").lower() == "true" else "cpu", compute_type=compute_type)
    return _model_cache


async def transcribe_file(file: UploadFile) -> str:
    if WhisperModel is None:
        return "[stt unavailable] Install faster-whisper to enable speech-to-text."
    raw = await file.read()
    tmp_path = f"/tmp/stt_{file.filename}"
    with open(tmp_path, "wb") as f:
        f.write(raw)
    model = _get_model()
    if model is None:
        return "[stt unavailable] Faster-Whisper model not loaded."
    segments, info = model.transcribe(tmp_path)
    text_parts: List[str] = [seg.text for seg in segments]
    try:
        os.remove(tmp_path)
    except Exception:
        pass
    return " ".join(text_parts).strip()