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
    amount: float|None=Field(default=None, ge=0)
    reason: str=Field(default="", max_length=500)
    urgency: str="normal"

class LLMProvider(ABC):
    @abstractmethod
    def extract_request(self, message:str, customer_id:str|None=None)->ExtractedRequest: ...

_CURRENCY=r"(?<![a-z])(?:\$|€|£|usd|eur|euros?|dollars?|dzd|da)"
_NUMBER=r"([0-9]+(?:[.,][0-9]+)?)"
# A number counts as an amount when a currency marker or the word "amount" is next to it.
_AMOUNT_PATTERNS=(
    re.compile(_CURRENCY+r"\s*"+_NUMBER, re.I),
    re.compile(_NUMBER+r"\s*"+_CURRENCY+r"(?![a-z])(?!\s*[0-9])", re.I),
    re.compile(r"(?:amount|montant|total)\s*(?:of|is|de|:)?\s*"+_NUMBER, re.I),
)
_ORDER=re.compile(r"(?:order|commande)\s*#?([A-Za-z0-9-]+)", re.I)
SENSITIVE_TERMS=("urgent","security","sécurité","hacked","fraud","stolen","unauthori","chargeback","dispute","lawyer","legal")

def extract_amount(message):
    """Return the largest amount mentioned, or None when no amount can be read.

    Taking the largest value is the conservative choice for the approval limit check.
    """
    text=_ORDER.sub(" ",message)  # order numbers are identifiers, not amounts
    values=[float(m.group(1).replace(',','.')) for pattern in _AMOUNT_PATTERNS for m in pattern.finditer(text)]
    return max(values) if values else None

class MockLLMProvider(LLMProvider):
    def extract_request(self,message,customer_id=None):
        order=_ORDER.search(message)
        lowered=message.lower()
        return ExtractedRequest(customer_id=customer_id,order_id=order.group(1) if order else None,amount=extract_amount(message),reason=message[:500],urgency="high" if any(term in lowered for term in SENSITIVE_TERMS) else "normal")

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
