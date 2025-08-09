import os
from typing import Optional
from app.settings.config import get_settings

try:
    from diffusers import StableDiffusionPipeline  # type: ignore
    import torch  # type: ignore
except Exception:  # pragma: no cover
    StableDiffusionPipeline = None  # type: ignore
    torch = None  # type: ignore

from PIL import Image, ImageDraw, ImageFont

_pipe = None


def _get_pipe():
    global _pipe
    if StableDiffusionPipeline is None or torch is None:
        return None
    if _pipe is None:
        device = "cuda" if get_settings().cuda_enabled and torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if (device == "cuda") else torch.float32
        _pipe = StableDiffusionPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5", torch_dtype=dtype
        )
        _pipe = _pipe.to(device)
    return _pipe


async def generate_image(prompt: str, width: int = 512, height: int = 512, steps: int = 25) -> str:
    pipe = _get_pipe()
    out_dir = os.path.join(get_settings().data_dir, "images")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "gen.png")

    if pipe is None:
        # Fallback: create a placeholder image with the prompt text
        img = Image.new("RGB", (width, height), color=(240, 240, 240))
        draw = ImageDraw.Draw(img)
        text = (prompt[:100] + "...") if len(prompt) > 100 else prompt
        draw.text((10, 10), f"Install diffusers/torch for image gen.\nPrompt: {text}", fill=(0, 0, 0))
        img.save(path)
        return path

    image = pipe(prompt, width=width, height=height, num_inference_steps=steps).images[0]
    image.save(path)
    return path