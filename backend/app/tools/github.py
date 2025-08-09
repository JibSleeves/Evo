import os
import subprocess
from typing import Optional


def clone_repo(url: str, dest_dir: str, token: Optional[str] = None) -> str:
    os.makedirs(dest_dir, exist_ok=True)
    env = os.environ.copy()
    if token and url.startswith("https://"):
        # inject token into URL (basic) — user should prefer SSH for security
        url = url.replace("https://", f"https://{token}@")
    subprocess.run(["git", "clone", "--depth", "1", url], cwd=dest_dir, check=True)
    return os.path.join(dest_dir, os.path.basename(url).replace('.git',''))