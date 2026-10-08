# Business case

## Business problem

Customer-operations teams receive repetitive questions about refunds, subscriptions, payments and orders. Manual triage consumes attention, produces inconsistent routing and makes it difficult to reconstruct why an action was taken.

## How a company could use the system

A company could place this workflow behind an existing support intake channel. The platform would validate the request, identify its likely intent, extract fields such as order ID and amount, retrieve the relevant internal policy, and apply deterministic rules. Low-risk, well-supported cases can demonstrate a simulated automatic action; uncertain, sensitive, incomplete or failed cases are placed in a human-review workflow.

## Expected operational value

The design targets:

- automation of repetitive customer-operations triage;
- less manual classification and policy lookup;
- faster handling of straightforward requests;
- consistent rule-based decisions;
- explicit human oversight for sensitive decisions; and
- auditability of classification, retrieval, rule evaluation, review and action events.

These are intended capabilities, not measured production outcomes. This repository does not invent ROI, savings, automation rates or customer-impact claims.

## Boundaries

The LLM is an assistant for structured extraction, not the final authority for a sensitive business decision. SQLite, local retrieval and mock adapters keep the portfolio implementation understandable and safe. Real CRM, email and payment integrations would require separate security, authorization, reliability and compliance review.
