"""Backward-compatible facade for safe enterprise adapters."""
from .workflows.actions import EnterpriseAdapter, MockEnterpriseAdapter, execute
__all__ = ["EnterpriseAdapter", "MockEnterpriseAdapter", "execute"]
