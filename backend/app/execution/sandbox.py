import subprocess
import tempfile
import os
from typing import Dict

LANG_TO_CMD = {
    "python": ["python", "-u"],
    "bash": ["bash"],
}


def run_code_safely(language: str, code: str, timeout_sec: int = 10) -> Dict[str, str]:
    if language not in LANG_TO_CMD:
        return {"error": f"Unsupported language: {language}"}
    with tempfile.TemporaryDirectory() as td:
        file_name = "main.py" if language == "python" else "run.sh"
        path = os.path.join(td, file_name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(code)
        if language == "bash":
            os.chmod(path, 0o755)
        try:
            proc = subprocess.run(LANG_TO_CMD[language] + [path], capture_output=True, text=True, timeout=timeout_sec)
            return {
                "stdout": proc.stdout,
                "stderr": proc.stderr,
                "returncode": str(proc.returncode),
            }
        except subprocess.TimeoutExpired:
            return {"error": "Execution timed out"}