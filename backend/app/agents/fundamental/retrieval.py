from __future__ import annotations

import math
import re
from collections import Counter

from backend.app.schemas import DocumentChunk


TOKEN_PATTERN = re.compile(r"[a-zA-Z0-9]+")


def _vector(text: str) -> Counter[str]:
    return Counter(token.lower() for token in TOKEN_PATTERN.findall(text) if len(token) > 2)


def _cosine(left: Counter[str], right: Counter[str]) -> float:
    numerator = sum(value * right.get(key, 0) for key, value in left.items())
    left_norm = math.sqrt(sum(value * value for value in left.values()))
    right_norm = math.sqrt(sum(value * value for value in right.values()))
    if not left_norm or not right_norm:
        return 0.0
    return numerator / (left_norm * right_norm)


def retrieve(query: str, chunks: list[DocumentChunk], limit: int = 2) -> list[tuple[DocumentChunk, float]]:
    query_vector = _vector(query)
    ranked = sorted(
        ((chunk, _cosine(query_vector, _vector(chunk.text))) for chunk in chunks),
        key=lambda item: item[1],
        reverse=True,
    )
    return ranked[:limit]
