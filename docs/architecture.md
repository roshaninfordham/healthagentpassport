# System Architecture

HealthAgent Passport is an installable gateway and SDK with a Studio control
plane. The repo keeps the polished Next.js Studio at the root for the hackathon
demo, and adds a TypeScript SDK, CLI gateway, and real sample health API around
it.

## Repository Product Shape

```mermaid
flowchart TB
  subgraph Packages["Installable packages"]
    SDK["@healthagent/passport<br/>SDK + gateway engine"]
    CLI["@healthagent/passport-cli<br/>healthagent command"]
  end

  subgraph Apps["Runnable apps"]
    Studio["Studio dashboard<br/>Next.js"]
    Sample["Sample health API<br/>Fastify :4001"]
    Gateway["Gateway proxy<br/>Fastify :8787"]
  end

  Policy[healthagent.yaml]
  Hap[".hap agents + delegations"]

  CLI --> Gateway
  SDK --> Gateway
  Policy --> Gateway
  Hap --> Gateway
  Gateway --> Sample
  Gateway -->|POST /api/events/ingest| Studio
  Studio -->|EventSource /api/events/stream| Studio
```

## High-Level Architecture

```mermaid
flowchart TB
  subgraph Actors
    Trusted[TrustedCareAgent]
    Sketchy[SketchyScraperAgent]
  end

  subgraph App["Studio Next.js App Router"]
    UI[Dashboard UI]
    DemoRun["/api/demo/run"]
    EventIngest["/api/events/ingest"]
    EventStream["/api/events/stream"]
    Runs["/api/runs/:runId/events"]
    SandboxAPI["/api/sandbox/run"]
    AuditAPI["/api/audit"]
  end

  subgraph GatewayPkg["@healthagent/passport Gateway"]
    Proxy[Fastify Reverse Proxy]
    Crypto[Signature + Hashing]
    Consent[.hap Delegation Loader]
    PolicyEngine[healthagent.yaml Policy Engine]
    Trust[Trust Engine]
    Sandbox[Behavior Sandbox]
    Upstream[Upstream Fetch]
    AuditEvidence[Audit Hashes]
  end

  subgraph Store["SQLite via Prisma"]
    P[(Patient)]
    A[(AgentIdentity)]
    D[(Delegation)]
    N[(Nonce)]
    S[(SandboxRun)]
    E[(AuditEvent)]
  end

  Trusted --> UI
  Sketchy --> UI
  UI --> DemoRun
  DemoRun --> Proxy
  Proxy --> Crypto
  Proxy --> PolicyEngine
  Proxy --> Sandbox
  Proxy --> Consent
  Proxy --> Trust
  Proxy --> Upstream
  Proxy --> AuditEvidence
  Proxy --> EventIngest
  EventIngest --> EventStream
  EventStream --> UI
  Crypto --> Store
  Consent --> Store
  Trust --> Store
  Sandbox --> Store
  AuditAPI --> E
```

## Ecosystem Boundary

HealthAgent Passport can run as a standalone demo, but the intended production
shape is an integration layer beside existing horizontal infrastructure.

```mermaid
flowchart TD
  Agent[AI Agent] --> Identity[Identity provider<br/>Auth0 / Okta]
  Identity --> TrustRail[Agent trust rail<br/>Valiron or equivalent]
  TrustRail --> Passport[HealthAgent Passport<br/>healthcare authorization brain]
  Passport --> ApiGateway[API gateway<br/>Kong / agentgateway / Apigee]
  ApiGateway --> HealthApi[Healthcare API<br/>FHIR / payer / pharmacy]

  Passport --> Consent[Patient consent graph]
  Passport --> Scopes[FHIR / SMART scope policy]
  Passport --> Sandbox[Healthcare misuse sandbox]
  Passport --> Audit[Compliance audit ledger]

  classDef passport fill:#064e3b,stroke:#34d399,color:#ecfdf5;
  class Passport passport;
```

## Request Lifecycle

```mermaid
sequenceDiagram
  participant Agent as AI Agent / CLI
  participant Gateway as Gateway Proxy
  participant Studio as Studio Event Stream
  participant Crypto as Crypto Module
  participant Policy as healthagent.yaml
  participant Sandbox as Behavioral Sandbox
  participant Consent as Consent Engine
  participant Trust as Trust Engine
  participant Upstream as Sample Health API
  participant Audit as Audit Evidence

  Agent->>Gateway: signed HTTP request to :8787
  Gateway->>Studio: receive_request event
  Gateway->>Policy: load and match route
  Gateway->>Studio: parse_policy + match_route_policy events
  Gateway->>Crypto: verify public-key signature
  Gateway->>Gateway: reject replayed nonce
  Gateway->>Sandbox: run deterministic mock sandbox
  Gateway->>Consent: load .hap delegation and scopes
  Gateway->>Trust: compute score and route
  Gateway->>Studio: live step events
  alt Allowed
    Gateway->>Upstream: forward request to :4001
    Upstream-->>Gateway: synthetic FHIR / prior-auth response
    Gateway->>Audit: hash request + response
    Gateway->>Studio: upstream + audit + return_response events
    Gateway-->>Agent: HTTP 200 with upstream response
  else Denied
    Gateway->>Audit: hash denied request
    Gateway->>Studio: blocked before upstream event
    Gateway-->>Agent: 403 deny
  end
```

## Trust Decision Model

```mermaid
flowchart LR
  I[Identity Score] --> Score[Weighted Trust Score]
  R[On-chain / Registry Score] --> Score
  B[Behavior Score] --> Score
  C[Compliance Score] --> Score
  D[Delegation Score] --> Score
  SandboxRisk[Sandbox Risk] --> EffectiveBehavior[Effective Behavior Score]
  EffectiveBehavior --> Score
  Score --> Route{Route Threshold}
  Route -->|85-100| Prod[prod]
  Route -->|70-84| Throttled[prod_throttled]
  Route -->|50-69| Sandbox[sandbox]
  Route -->|0-49| SandboxOnly[sandbox_only]
  SandboxRisk --> Downgrade[Route Downgrade]
  Downgrade --> Sandbox
  Downgrade --> SandboxOnly
```

Formula:

```txt
trustScore = round(
  0.20 * identityScore +
  0.25 * onChainScore +
  0.20 * behaviorScore +
  0.15 * complianceScore +
  0.20 * delegationScore
)
```

When a sandbox report exists:

```txt
sandboxBehaviorScore = 100 - sandboxRiskScore
effectiveBehaviorScore = min(agent.behaviorScore, sandboxBehaviorScore)
```

The sandbox can downgrade a route. It cannot override missing consent.

## Endpoint Policy Model

```mermaid
flowchart TD
  Request[Incoming Gateway Request] --> Match{Policy Match?}
  Match -->|No| DenyUnknown[Deny unknown endpoint]
  Match -->|Yes| Patient{Patient Context?}
  Patient -->|No| DenyContext[Deny missing patient context]
  Patient -->|Yes| Scopes[Required Scopes]
  Scopes --> Delegation{Active Delegation?}
  Delegation -->|No| DenyDelegation[Deny missing delegation]
  Delegation -->|Yes| ScopeCheck{All scopes granted?}
  ScopeCheck -->|No| DenyScope[Deny missing scope]
  ScopeCheck -->|Yes| TrustRoute{Allowed route?}
  TrustRoute -->|prod/prod_throttled| Allow[Forward to protected API]
  TrustRoute -->|sandbox/sandbox_only| DenyRoute[Deny or redact]
```

Current endpoint policies:

| Method | Path | Required scopes |
| --- | --- | --- |
| `GET` | `/fhir/patient/:patientId` | `patient/Patient.read`, `patient/Condition.read`, `patient/MedicationRequest.read`, `patient/Observation.read` |
| `POST` | `/prior-auth` | `payer/PriorAuth.write` |
| `GET` | `/fhir/all?dump=true` | No policy. Always denied. |

## Data Model

```mermaid
erDiagram
  Patient {
    string id PK
    string displayName
    string dateOfBirth
    string sex
    string syntheticLabel
    string fhirBundleJson
  }

  AgentIdentity {
    string id PK
    string displayName
    string kind
    string publicKeyPem
    string privateKeyPem
    string defaultTier
    string defaultRoute
    int onChainScore
    int behaviorScore
    int identityScore
    int complianceScore
  }

  Delegation {
    string id PK
    string patientId
    string agentId
    string scopesJson
    string purpose
    datetime expiresAt
    string status
    string delegationHash
    string patientSignature
    string solanaSignature
  }

  SandboxRun {
    string id PK
    string agentId
    string scenario
    string mode
    string runtime
    int riskScore
    string verdict
    string routeImpact
    string observedEventsJson
    string signalsJson
  }

  AuditEvent {
    string id PK
    string requestId
    string agentId
    string patientId
    string method
    string path
    string decision
    string route
    int trustScore
    string reason
    string requestHash
    string responseHash
    string sandboxRunId
    int sandboxRiskScore
    string sandboxVerdict
  }

  Nonce {
    string agentId PK
    string nonce PK
    datetime expiresAt
  }

  Patient ||--o{ Delegation : grants
  AgentIdentity ||--o{ Delegation : receives
  AgentIdentity ||--o{ Nonce : uses
  AgentIdentity ||--o{ SandboxRun : evaluated_by
  SandboxRun ||--o{ AuditEvent : informs
  Patient ||--o{ AuditEvent : scoped_to
  AgentIdentity ||--o{ AuditEvent : performs
```

## Behavioral Sandbox Architecture

```mermaid
flowchart TB
  Scenario[Known Scenario Manifest] --> Runner[Sandbox Runner]
  Runner --> Mode{SANDBOX_MODE}
  Mode -->|mock| Mock[Deterministic Mock Events]
  Mode -->|docker| Docker[Docker Container]
  Mode -->|gvisor| Gvisor[Docker with runsc Runtime]
  Docker --> Limits[No network by default, read-only FS, CPU/memory/pids limits]
  Gvisor --> Limits
  Mock --> Report[Sandbox Report]
  Limits --> Report
  Report --> Score[Risk Score + Verdict]
  Score --> Store[(SandboxRun)]
  Score --> Trust[Trust Route Downgrade]
```

The sandbox intentionally runs known scenario manifests, not arbitrary frontend
code. This keeps the hackathon demo deterministic and avoids unsafe execution.

## Runtime Modes

| Mode | Default | Purpose |
| --- | --- | --- |
| `VALIRON_MODE=mock` | Yes | Local trust routing without sponsor dependency |
| `SOLANA_MODE=mock` | Yes | Consent hash anchor display without wallet dependency |
| `PAYMENT_MODE=mock` | Yes | x402/MPP-style receipt display without settlement |
| `LLM_MODE=mock` | Yes | Deterministic care-admin summary |
| `SANDBOX_MODE=mock` | Yes | Deterministic behavior scoring |
| `SANDBOX_MODE=gvisor` | No | Optional Linux/gVisor sandbox runtime |

## Production Roadmap

```mermaid
flowchart LR
  Demo[Demo: Next.js + SQLite + mocks] --> Pilot[Pilot: Postgres + real agent registry + FHIR integration]
  Pilot --> Enterprise[Enterprise: multi-tenant gateway + SIEM + KMS + mTLS + policy-as-code]
```
