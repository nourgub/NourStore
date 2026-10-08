"""Backward-compatible facade for the modular structured extraction provider."""
from .ai.extractor import ExtractedRequest, LLMProvider, MockLLMProvider, OpenAICompatibleProvider, extract, get_provider
__all__ = ["ExtractedRequest", "LLMProvider", "MockLLMProvider", "OpenAICompatibleProvider", "extract", "get_provider"]
