"""Structured extraction with a mock provider and optional OpenAI-compatible provider."""
import json, re, urllib.request
from abc import ABC, abstractmethod
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from ..config import settings

class ExtractedRequest(BaseModel):
    model_config=ConfigDict(extra="forbid")
    customer_id: str|None=None
    order_id: str|None=None
    intent: str|None=None
    amount: float=Field(default=0, ge=0)
    reason: str=Field(default="", max_length=500)
    urgency: str="normal"

class LLMProvider(ABC):
    @abstractmethod
    def extract_request(self, message:str, customer_id:str|None=None)->ExtractedRequest: ...

class MockLLMProvider(LLMProvider):
    def extract_request(self,message,customer_id=None):
        order=re.search(r"(?:order|commande)\s*#?([A-Za-z0-9-]+)",message,re.I)
        amount=re.search(r"(?:\$|€)\s*([0-9]+(?:\.[0-9]+)?)",message)
        return ExtractedRequest(customer_id=customer_id,order_id=order.group(1) if order else None,amount=float(amount.group(1)) if amount else 0.0,reason=message[:500],urgency="high" if any(x in message.lower() for x in ["urgent","security","sécurité"]) else "normal")

class OpenAICompatibleProvider(LLMProvider):
    def extract_request(self,message,customer_id=None):
        if not settings.llm_api_key or not settings.llm_base_url: raise RuntimeError("LLM provider is not fully configured")
        payload={"model":settings.llm_model,"temperature":0,"response_format":{"type":"json_object"},"messages":[{"role":"system","content":"Return only JSON with customer_id, order_id, intent, amount, reason, urgency. No extra keys."},{"role":"user","content":message}]}
        request=urllib.request.Request(settings.llm_base_url.rstrip('/')+'/chat/completions',data=json.dumps(payload).encode(),headers={'Authorization':'Bearer '+settings.llm_api_key,'Content-Type':'application/json'})
        with urllib.request.urlopen(request,timeout=settings.llm_timeout) as response: raw=json.loads(response.read())
        content=raw['choices'][0]['message']['content']
        return ExtractedRequest.model_validate(json.loads(content))

def get_provider()->LLMProvider:
    return OpenAICompatibleProvider() if settings.llm_provider.lower() not in {'mock','offline'} else MockLLMProvider()

def extract(message,customer_id=None)->dict[str,Any]:
    return get_provider().extract_request(message,customer_id).model_dump()
