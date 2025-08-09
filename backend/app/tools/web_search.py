import httpx
from bs4 import BeautifulSoup
from typing import List, Dict

_summarizer = None


def _get_summarizer():
    global _summarizer
    if _summarizer is None:
        try:
            from transformers import pipeline  # type: ignore
            _summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
        except Exception:
            _summarizer = None
    return _summarizer


async def ddg_search(query: str) -> List[Dict[str, str]]:
    url = "https://duckduckgo.com/html/"
    async with httpx.AsyncClient(headers={"User-Agent": "Mozilla/5.0"}) as client:
        r = await client.post(url, data={"q": query})
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        results = []
        for a in soup.select("a.result__a")[:5]:
            href = a.get("href")
            title = a.get_text(" ")
            results.append({"title": title, "url": href})
        return results


async def fetch_text(url: str) -> str:
    async with httpx.AsyncClient(headers={"User-Agent": "Mozilla/5.0"}, follow_redirects=True, timeout=20) as client:
        r = await client.get(url)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        # Basic extraction
        paragraphs = [p.get_text(" ") for p in soup.select("p")]
        text = "\n".join(paragraphs)
        return text[:20000]


async def search_and_summarize(query: str) -> Dict[str, str]:
    results = await ddg_search(query)
    texts: List[str] = []
    for res in results:
        try:
            t = await fetch_text(res["url"]) 
            if t:
                texts.append(t)
        except Exception:
            continue
    joined = "\n\n".join(texts)[:35000]
    if not joined:
        return {"summary": "No results"}
    summarizer = _get_summarizer()
    if summarizer is None:
        # naive fallback summarization
        trimmed = joined[:1000]
        return {"summary": trimmed}
    summary = summarizer(joined[:4000], max_length=256, min_length=80, do_sample=False)
    return {"summary": summary[0]["summary_text"]}