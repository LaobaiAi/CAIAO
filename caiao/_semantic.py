import re
from typing import Any


def tokenize(text: str) -> set[str]:
    normalized = text.replace("_", " ").replace("-", " ")
    normalized = re.sub(r'([a-z])([A-Z])', r'\1 \2', normalized)
    tokens = re.findall(r'[a-zA-Z0-9]+', normalized.lower())
    return {t for t in tokens if len(t) > 1}


def jaccard_similarity(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)


def ngram_similarity(a: str, b: str, n: int = 3) -> float:
    if not a or not b:
        return 0.0
    a_ngrams = {a[i:i+n] for i in range(len(a) - n + 1)}
    b_ngrams = {b[i:i+n] for i in range(len(b) - n + 1)}
    if not a_ngrams or not b_ngrams:
        return 0.0
    intersection = a_ngrams & b_ngrams
    union = a_ngrams | b_ngrams
    return len(intersection) / len(union)


def semantic_search(
    query: str,
    index: list[dict[str, Any]],
    threshold: float = 0.20,
) -> dict[str, Any] | None:
    query_keywords = tokenize(query)
    if not query_keywords:
        return None
    best: dict[str, Any] | None = None
    best_score = 0.0
    best_name_score = 0.0
    best_ngram = 0.0
    for entry in index:
        score = jaccard_similarity(query_keywords, entry["keywords"])
        name_score = 0.0
        if query.lower() in entry["name"].lower():
            name_score = 0.5
            score = max(score, name_score)
        for nt in tokenize(entry["name"]):
            if nt in query_keywords:
                name_score = max(name_score, 0.3)
        ng = ngram_similarity(query.lower(), entry["name"].lower())
        if (score > best_score or
            (abs(score - best_score) < 0.01 and name_score > best_name_score) or
            (abs(score - best_score) < 0.01 and name_score == best_name_score and ng > best_ngram)):
            best_score = score
            best_name_score = name_score
            best_ngram = ng
            best = entry
    if best and best_score >= threshold:
        return {"name": best["name"], "score": round(best_score, 3), "description": best["description"]}
    return None
