# Production Roadmap

The current repo is optimized for a fast, working demo. The production path is
to keep the same interfaces while replacing synthetic components with secure,
durable infrastructure.

## Roadmap

```mermaid
gantt
  title PriorAuth Passport Roadmap
  dateFormat  YYYY-MM-DD
  section Demo
  Local EHR + payer APIs           :done, 2026-06-01, 1d
  Studio realtime workflow         :done, 2026-06-01, 1d
  ROI + audit proof                :done, 2026-06-01, 1d
  section Pilot
  Durable run store                :active, 2026-06-02, 14d
  Authenticated service clients    :2026-06-10, 21d
  FHIR server connector            :2026-06-15, 30d
  Payer API adapter kit            :2026-06-20, 30d
  section Production
  Tenant isolation                 :2026-07-15, 30d
  Compliance controls              :2026-07-20, 45d
  Observability + SIEM export      :2026-08-01, 30d
```

## Replaceable Demo Parts

| Demo component | Production replacement |
| --- | --- |
| In-memory event store | Postgres, Kafka, or durable workflow event table |
| Sample EHR API | FHIR server connector with OAuth/OIDC |
| Sample payer API | Payer-specific or standards-based prior-auth adapter |
| Static agent file | KMS-backed service identity |
| Local YAML config | Versioned policy bundle with review workflow |
| Synthetic audit hashes | Immutable audit store with retention policy |

## Deployment Shape

```mermaid
flowchart LR
  Studio["Studio"] --> Api["PriorAuth API"]
  Api --> Worker["Workflow worker"]
  Worker --> FHIR["FHIR connector"]
  Worker --> Payer["Payer adapter"]
  Worker --> Policy["Policy service"]
  Worker --> Store["Run and audit database"]
  Worker --> Queue["Event queue"]
  Queue --> Studio
```

## Non-Goals

- Do not make treatment decisions.
- Do not become a payer medical review engine.
- Do not store real PHI until compliance controls, contracts, and tenant
  isolation are in place.
