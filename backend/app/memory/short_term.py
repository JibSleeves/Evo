from typing import Dict, List, Any
from collections import defaultdict


class ShortTermMemory:
    def __init__(self) -> None:
        self._memory: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    def add(self, session_id: str, role: str, content: str) -> None:
        self._memory[session_id].append({"role": role, "content": content})
        # cap at last 50 messages
        if len(self._memory[session_id]) > 50:
            self._memory[session_id] = self._memory[session_id][-50:]

    def get(self, session_id: str) -> List[Dict[str, Any]]:
        return list(self._memory.get(session_id, []))

    def clear(self, session_id: str) -> None:
        self._memory.pop(session_id, None)