# HealthAgent Passport Documentation

This folder explains the product, architecture, security model, API surface, and
demo operations for HealthAgent Passport.

## Reading Path

1. [Developer Quickstart](quickstart.md) shows the CLI, SDK, gateway, sample
   API, and Studio demo path.
2. [System Architecture](architecture.md) explains the end-to-end design with
   Mermaid diagrams.
3. [Market Positioning](market-positioning.md) explains where HealthAgent
   Passport fits beside identity providers, agent trust rails, API gateways,
   and healthcare APIs.
4. [API Reference](api-reference.md) documents the route handlers and request
   payloads.
5. [Security Model](security-model.md) maps controls to the agentic healthcare
   threat model.
6. [Demo Guide](demo-guide.md) gives the live demo script, checklist, and
   troubleshooting steps.
7. [gVisor Setup](gvisor-setup.md) explains the optional real sandbox runtime.
8. [Rust Gateway Roadmap](rust-roadmap.md) explains what would move into a
   high-performance production data plane later.

## Product In One Diagram

```mermaid
flowchart LR
  A[AI Agent] --> B[HealthAgent Gateway]
  B --> C[Identity + Replay Protection]
  C --> D[Behavior Sandbox]
  D --> E[Patient Consent + FHIR Scopes]
  E --> F[Trust Route + Payment Receipt]
  F --> G{Route}
  G -->|prod / prod_throttled| H[Real Sample Health API]
  G -->|sandbox / sandbox_only| I[Block Before Upstream]
  B --> S[Studio Live Event Stream]
  H --> J[Audit Evidence]
  I --> J
```

## Core Invariants

- Every protected request must be signed.
- Every signed request must use a fresh nonce and timestamp.
- Every healthcare endpoint must have an explicit policy.
- Patient-scoped endpoints require active delegation and exact scopes.
- Trust cannot override missing consent.
- Sandbox results can downgrade trust, but cannot grant consent.
- Denied agents never receive protected synthetic FHIR data.
- Every allow or deny decision writes an audit event.

## Positioning In One Diagram

```mermaid
flowchart TD
  Agent[AI Agent] --> Identity[Auth0 / Okta]
  Identity --> Trust[Valiron]
  Trust --> Passport[HealthAgent Passport]
  Passport --> Gateway[Kong / Agent Gateway]
  Gateway --> APIs[FHIR / payer / pharmacy / public-health APIs]

  classDef passport fill:#064e3b,stroke:#34d399,color:#ecfdf5;
  class Passport passport;
```
