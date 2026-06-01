# Architecture

PriorAuth Passport is built as a demoable local product with production-shaped
interfaces: a Studio UI, real HTTP EHR and payer services, a TypeScript core SDK,
CLI commands, config files, and a streaming event model.

## Logical Architecture

```mermaid
flowchart LR
  Operator["Practice operator"] --> Studio["Studio UI"]
  Developer["API developer"] --> CLI["priorauth CLI"]
  Studio --> DemoRun["Demo runner"]
  CLI --> StudioApi["Studio API routes"]
  DemoRun --> EHR["Sample EHR API"]
  DemoRun --> Payer["Sample payer API"]
  DemoRun --> Core["PriorAuth core SDK"]
  Core --> Evidence["Evidence matcher"]
  Core --> ROI["ROI calculator"]
  Core --> Audit["Audit hash writer"]
  Config["YAML configuration"] --> Core
  Agent["Demo agent and delegation"] --> DemoRun
  DemoRun --> Events["SSE event store"]
  Events --> Studio
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
  participant API as /api/demo/run
  participant Runner as Demo Runner
  participant Events as SSE Store
  participant EHR as EHR API
  participant Payer as Payer API
  participant Core as Core SDK

  UI->>API: POST scenario=complete
  API->>Runner: runElectronicPriorAuthDemo()
  Runner->>Events: start
  Events-->>UI: event stream
  Runner->>Events: toolCall + apiExchange metadata for every step
  Runner->>Core: getSeedCase()
  Runner->>EHR: GET /fhir/Patient/:id
  Runner->>EHR: GET /fhir/Condition
  Runner->>EHR: GET /fhir/MedicationRequest
  Runner->>EHR: GET /fhir/Observation
  Runner->>EHR: GET /documents
  Runner->>Payer: POST /prior-auth/requirements
  Runner->>Core: matchEvidence()
  alt complete evidence
    Runner->>Core: buildPriorAuthPackage()
    Runner->>Payer: POST /prior-auth/submit
    Runner->>Core: calculatePerAuthRoi()
    Runner->>Core: createAuditEvent()
    Runner->>Events: complete
  else missing evidence
    Runner->>Core: calculatePerAuthRoi()
    Runner->>Core: createAuditEvent()
    Runner->>Events: blocked
  end
```

## Event Observability

```mermaid
flowchart LR
  Step["Workflow step"] --> Tool["toolCall metadata"]
  Step --> Api["apiExchange metadata"]
  Step --> Summary["Human readable summary"]
  Tool --> Timeline["Live workflow timeline"]
  Api --> Inspector["Request and response inspector"]
  Tool --> CLI["Terminal stream"]
  Summary --> Timeline
```

The event stream is intentionally verbose for demo clarity. Each action waits
for the configured `DEMO_STEP_DELAY_MS`, clamped to at least 2 seconds in normal
demo mode, then emits enough metadata to show what the agent called, which API
was contacted, and what evidence or ROI artifact was produced.

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
| Sample EHR API | 4001 | 4101 |
| Sample Payer API | 4002 | 4102 |

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
