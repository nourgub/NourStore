from enum import Enum
from typing import Any
from pydantic import BaseModel, Field, field_validator

class WorkflowStatus(str, Enum):
    RECEIVED="RECEIVED"; CLASSIFIED="CLASSIFIED"; PROCESSING="PROCESSING"; AUTO_APPROVED="AUTO_APPROVED"; REQUIRES_HUMAN_REVIEW="REQUIRES_HUMAN_REVIEW"; APPROVED_BY_HUMAN="APPROVED_BY_HUMAN"; REJECTED="REJECTED"; COMPLETED="COMPLETED"; FAILED="FAILED"
class RequestIn(BaseModel):
    message: str = Field(min_length=3, max_length=10000)
    customer_id: str | None = Field(default=None, max_length=100)
    channel: str = Field(default="api", max_length=50)
class Decision(BaseModel):
    intent: str
    confidence: float = Field(ge=0, le=1)
    extracted: dict[str, Any]
    sources: list[dict[str, str]]
    proposed_action: str
    reason: str
class ReviewIn(BaseModel):
    reviewer: str = Field(min_length=1, max_length=100)
    note: str = Field(default="", max_length=2000)
