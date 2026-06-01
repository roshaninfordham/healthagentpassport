# Security Model

PriorAuth Passport is an administrative workflow demo. Its first security
feature is a bright boundary: synthetic data only, no treatment decisions, and
no medical advice.

## Boundary Diagram

```mermaid
flowchart TD
  User["Practice operator"] --> UI["Studio"]
  UI --> Runner["Prior-auth runner"]
  Runner --> Synthetic{"Synthetic case?"}
  Synthetic -->|No| Reject["Reject"]
  Synthetic -->|Yes| Scope["Verify demo agent scopes"]
  Scope --> Evidence["Gather evidence from EHR API"]
  Evidence --> Complete{"All required evidence?"}
  Complete -->|No| Draft["Draft saved, no payer submission"]
  Complete -->|Yes| Submit["Submit to synthetic payer"]
  Draft --> Audit["Hash evidence and ROI"]
  Submit --> Audit
```

## What It Does Not Do

- Does not ingest real PHI.
- Does not make medical necessity decisions.
- Does not approve or deny care.
- Does not replace payer review.
- Does not call external LLMs in the default demo.
- Does not depend on blockchains, wallets, or hosted services.

## Controls

| Control | Demo implementation |
| --- | --- |
| Synthetic data boundary | EHR and payer APIs are local sample services |
| Evidence completeness | Incomplete case stops before payer submission |
| Agent scope check | Demo agent includes administrative prior-auth scopes |
| Audit integrity | Evidence and ROI are hashed in audit events |
| Realtime observability | Every phase streams to Studio over SSE |
| Resettable state | Demo reset clears event store and API counters |

## Threat Model

| Risk | Control |
| --- | --- |
| Submitting incomplete documentation | Evidence matcher blocks and saves draft |
| Inflated ROI claims | Transaction savings and labor sensitivity are separate |
| Hidden API behavior | EHR and payer counters are visible in Studio |
| Confusing demo data with PHI | UI, docs, config, and API health mark synthetic-only |
| Lost audit context | Completion and blocked paths both create audit hashes |

## Production Hardening Path

```mermaid
flowchart LR
  Demo["Synthetic local demo"] --> Auth["OIDC and service auth"]
  Auth --> Fhir["FHIR server integration"]
  Fhir --> Payer["Payer API integration"]
  Payer --> Store["Durable event and audit store"]
  Store --> Compliance["HIPAA controls, BAA, monitoring"]
```
