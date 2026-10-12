# Architecture

```mermaid
flowchart TD
  A[POST /requests] --> B[Pydantic validation]
  B --> C[Intent classifier]
  C --> D[Structured extraction]
  D --> E[Policy chunk retrieval]
  E --> F[Deterministic risk rules]
  F -->|safe| G[Mock CRM/refund actions]
  F -->|risky or invalid| H[Human review queue]
  G --> I[(SQLite audit store)]
  H --> I
  I --> J[API + dashboard]
```

The orchestration layer persists every stage and emits an audit event with timestamp, actor, stage, confidence and error details. The normal application has no update/delete endpoint for audit events.

## Decision boundary

The model proposes intent and fields. Rules decide execution. A refund is auto-approved only if the request is valid, confidence is above threshold, policy allows it, the amount is within the configured limit, and the order is eligible. Subscription cancellation is treated as a sensitive action and goes to a human by default.
