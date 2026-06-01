# System Architecture

HealthAgent Passport is a single full-stack Next.js app designed for a reliable
demo and a clear production roadmap. The core behavior is deterministic in mock
mode, while external integrations are kept behind feature flags.

## High-Level Architecture

```mermaid
flowchart TB
  subgraph Actors
    Trusted[TrustedCareAgent]
    Sketchy[SketchyScraperAgent]
  end

  subgraph App["Next.js App Router"]
    UI[Dashboard UI]
    AgentAPI["/api/agent/run"]
    GatewayAPI["/api/gateway"]
    SandboxAPI["/api/sandbox/run"]
    AuditAPI["/api/audit"]
  end

  subgraph Domain["Domain Layer"]
    Runner[Agent Runner]
    Crypto[Signature + Hashing]
    Consent[Consent Engine]
    Policy[Policy Engine]
    Trust[Trust Engine]
    Sandbox[Behavior Sandbox]
    FHIR[Synthetic FHIR Service]
    PriorAuth[Prior Auth Mock]
    Summary[Safe Summary]
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
  UI --> AgentAPI
  AgentAPI --> Runner
  Runner --> Sandbox
  Runner --> GatewayAPI
  GatewayAPI --> Crypto
  GatewayAPI --> Policy
  GatewayAPI --> Consent
  GatewayAPI --> Trust
  GatewayAPI --> FHIR
  GatewayAPI --> PriorAuth
  Runner --> Summary
  Crypto --> Store
  Consent --> Store
  Trust --> Store
  Sandbox --> Store
  FHIR --> Store
  PriorAuth --> Store
  GatewayAPI --> E
  AuditAPI --> E
```

## Request Lifecycle

```mermaid
sequenceDiagram
  participant Agent as Agent Runner
  participant Sandbox as Sandbox Runner
  participant Gateway as Gateway
  participant Crypto as Crypto Module
  participant Policy as Policy Engine
  participant Consent as Consent Engine
  participant Trust as Trust Engine
  participant Upstream as Protected API
  participant Audit as AuditEvent Table

  Agent->>Sandbox: runAgentSandbox(agent scenario)
  Sandbox-->>Agent: SandboxReport
  Agent->>Crypto: sign(method, path, body, timestamp, nonce)
  Agent->>Gateway: signed GatewayInput + SandboxReport
  Gateway->>Crypto: verify public-key signature
  Gateway->>Gateway: reject replayed nonce
  Gateway->>Policy: find endpoint policy
  alt Unknown endpoint
    Gateway->>Trust: evaluate known identity + sandbox downgrade
    Gateway->>Audit: write deny event
    Gateway-->>Agent: 403 deny
  else Known endpoint
    Gateway->>Consent: check delegation and scopes
    Gateway->>Trust: compute score and route
    alt route allows production and consent valid
      Gateway->>Upstream: call synthetic FHIR or prior-auth
      Upstream-->>Gateway: synthetic response
      Gateway->>Audit: write allow event
      Gateway-->>Agent: 200 allow
    else route or consent fails
      Gateway->>Audit: write deny/sandbox event
      Gateway-->>Agent: 403 deny or sandbox
    end
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
