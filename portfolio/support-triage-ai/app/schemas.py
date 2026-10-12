from enum import Enum
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

class WorkflowStatus(str, Enum):
    RECEIVED="RECEIVED"; CLASSIFIED="CLASSIFIED"; PROCESSING="PROCESSING"; AUTO_APPROVED="AUTO_APPROVED"; REQUIRES_HUMAN_REVIEW="REQUIRES_HUMAN_REVIEW"; APPROVED_BY_HUMAN="APPROVED_BY_HUMAN"; REJECTED="REJECTED"; COMPLETED="COMPLETED"; FAILED="FAILED"
class RequestIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    message: str = Field(min_length=3, max_length=10000)
    customer_id: str | None = Field(default=None, max_length=100)
    channel: str = Field(default="api", min_length=1, max_length=50)
class Decision(BaseModel):
    intent: str
    confidence: float = Field(ge=0, le=1)
    extracted: dict[str, Any]
    sources: list[dict[str, Any]]
    proposed_action: str
    reason: str
class ReviewIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    reviewer: str = Field(min_length=1, max_length=100)
    note: str = Field(default="", max_length=2000)
class WorkflowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    customer_id: str | None = None
    original_request: str
    status: WorkflowStatus
    intent: str | None = None
    confidence: float | None = None
    extracted: dict[str, Any] | None = None
    sources: list[dict[str, Any]] | None = None
    proposed_action: str | None = None
    final_action: dict[str, Any] | None = None
    reason: str | None = None
    created_at: float
    updated_at: float
class AuditEventOut(BaseModel):
    id: int
    workflow_id: str
    event_type: str
    component: str
    status: str
    duration_ms: float | None = None
    metadata: dict[str, Any] = {}
    created_at: float
class HealthOut(BaseModel):
    status: str
    database: str
    llm_provider: str
