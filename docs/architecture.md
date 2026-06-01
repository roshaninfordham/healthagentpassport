# Architecture

PriorAuth Passport is built as a hosted-ready product demo with
production-shaped interfaces: a Studio UI, internal synthetic EHR and payer API
routes, a TypeScript core SDK, CLI commands, config files, and a streaming event
model.

## Logical Architecture

```mermaid
flowchart LR
  Operator["Practice operator"] --> Studio["Studio UI"]
  Developer["API developer"] --> CLI["priorauth CLI"]
  Studio --> DemoRun["NDJSON stream runner"]
  CLI --> StudioApi["Studio API routes"]
  DemoRun --> EHR["Internal synthetic EHR routes"]
  DemoRun --> Payer["Internal synthetic payer routes"]
  DemoRun --> Core["PriorAuth core SDK"]
  Core --> Evidence["Evidence matcher"]
  Core --> ROI["ROI calculator"]
  Core --> Audit["Audit hash writer"]
  Config["YAML configuration"] --> Core
  Agent["Demo agent and delegation"] --> DemoRun
  DemoRun --> Packet["Audit packet"]
  DemoRun --> Studio
  Packet --> Studio
```

## Package Layout

```mermaid
flowchart TD
  Repo["priorauth-passport"] --> Apps["apps"]
  Repo --> Packages["packages"]
  Repo --> StudioCode["Studio app code"]
  Repo --> ConfigDir["Configuration files"]
  Apps --> EHR["sample-ehr-api"]
  Apps --> Payer["sample-payer-api"]
  Packages --> Core["priorauth-core"]
  Packages --> Cli["cli"]
  StudioCode --> Routes["API routes"]
  StudioCode --> UI["Dashboard panels"]
```

## Runtime Sequence

```mermaid
sequenceDiagram
  participant UI as Studio UI
  participant API as /api/demo/stream
  participant Runner as Stream Runner
  participant EHR as Internal EHR Routes
  participant Payer as Internal Payer Routes
  participant Core as Core SDK

  UI->>API: POST scenario=complete
  API->>Runner: runPriorAuthWorkflowStream()
  Runner-->>UI: NDJSON start event
  Runner-->>UI: toolCall + apiExchange metadata for every step
  Runner->>Core: getSeedCase()
  Runner->>EHR: GET /api/demo/ehr/patient/:id
  Runner->>EHR: GET /api/demo/ehr/conditions
  Runner->>EHR: GET /api/demo/ehr/medications
  Runner->>EHR: GET /api/demo/ehr/observations
  Runner->>EHR: GET /api/demo/ehr/documents
  Runner->>Payer: POST /api/demo/payer/requirements
  Runner->>Core: matchEvidence()
  alt complete evidence
    Runner->>Core: buildPriorAuthPackage()
    Runner->>Payer: POST /api/demo/payer/submit
    Runner->>Core: calculatePerAuthRoi()
    Runner->>Core: createAuditEvent()
    Runner-->>UI: audit packet submitted
  else missing evidence
    Runner->>Core: calculatePerAuthRoi()
    Runner->>Core: createAuditEvent()
    Runner-->>UI: audit packet needs human review
  end
```

## Event Observability

```mermaid
flowchart LR
  Step["Workflow step"] --> Tool["toolCall metadata"]
  Step --> Api["apiExchange metadata"]
  Step --> Proof["HTTP status, latency, hash"]
  Step --> Summary["Human readable summary"]
  Tool --> Timeline["Live workflow timeline"]
  Api --> Inspector["Request and response inspector"]
  Proof --> Packet["Audit packet"]
  Tool --> CLI["Terminal stream"]
  Summary --> Timeline
```

The event stream is intentionally visible for demo clarity. Each action waits for
the configured `DEMO_STEP_DELAY_MS`, clamped to at least 1.2 seconds in normal
demo mode, then emits enough metadata to show what the agent called, which API
was contacted, and what evidence, ROI, proof, or audit artifact was produced.

## Evidence State Machine

```mermaid
stateDiagram-v2
  [*] --> Intake
  Intake --> RequirementsFetched
  RequirementsFetched --> EvidenceMatched
  EvidenceMatched --> Submitted: all required evidence matched
  EvidenceMatched --> DraftBlocked: missing required evidence
  Submitted --> AuditWritten
  DraftBlocked --> AuditWritten
  AuditWritten --> [*]
```

## Ports

| Service | Default | Test |
| --- | ---: | ---: |
| Studio | 3000 | 3100 |
| Internal EHR routes | same host | same host |
| Internal payer routes | same host | same host |
| Optional sample EHR API | 4001 | 4101 |
| Optional sample payer API | 4002 | 4102 |

## Config Files

| File | Purpose |
| --- | --- |
| `config/roi.yaml` | Cost, time, volume, and pricing assumptions |
| `config/priorauth-policy.yaml` | Demo product safety and workflow settings |
| `config/payer-rules.yaml` | Required evidence for the demo service |
| `.priorauth/agents/*.json` | Demo agent identity files |
| `.priorauth/delegations/*.json` | Demo administrative delegation |

## Safety Architecture

```mermaid
flowchart TD
  Run["Prior-auth run"] --> Synthetic{"Synthetic only?"}
  Synthetic -->|No| Block["Block"]
  Synthetic -->|Yes| Evidence{"Required evidence complete?"}
  Evidence -->|No| Draft["Draft saved, no payer submission"]
  Evidence -->|Yes| Submit["Submit to synthetic payer API"]
  Submit --> Audit["Audit hashes"]
  Draft --> Audit
```
