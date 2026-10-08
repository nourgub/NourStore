"""Backward-compatible facade for directory-backed RAG."""
from .ai.rag import Chunk, DocumentStore, retrieve, store
__all__ = ["Chunk", "DocumentStore", "retrieve", "store"]
