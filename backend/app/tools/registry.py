from typing import Dict, Callable, Awaitable

from app.tools.web_search import search_and_summarize


ToolFunc = Callable[[str], Awaitable[str]]


async def tool_web_search(query: str) -> str:
    res = await search_and_summarize(query)
    return f"[web_search]\n{res.get('summary', '')}"


TOOLS: Dict[str, ToolFunc] = {
    "web_search": tool_web_search,
}


async def run_tools(tool_names: list[str], input_text: str) -> str:
    outputs: list[str] = []
    for name in tool_names:
        if name in TOOLS:
            out = await TOOLS[name](input_text)
            outputs.append(out)
    return "\n\n".join(outputs)