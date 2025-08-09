from transformers import pipeline

_summarizer = None
_sentiment = None


def get_summarizer():
    global _summarizer
    if _summarizer is None:
        _summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
    return _summarizer


def get_sentiment():
    global _sentiment
    if _sentiment is None:
        _sentiment = pipeline("sentiment-analysis")
    return _sentiment


def summarize(text: str) -> str:
    summarizer = get_summarizer()
    pieces = summarizer(text[:4000], max_length=200, min_length=50, do_sample=False)
    return pieces[0]["summary_text"]


def sentiment(text: str):
    clf = get_sentiment()
    res = clf(text[:2000])
    return res