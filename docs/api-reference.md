# API Reference

All API routes are implemented as Next.js App Router route handlers.

## Route Summary

```mermaid
flowchart LR
  UI[Dashboard] --> DemoRun["POST /api/demo/run"]
  CliGateway[CLI Gateway] --> EventIngest["POST /api/events/ingest"]
  UI --> EventStream["GET /api/events/stream"]
  UI --> Latest["GET /api/runs/latest"]
  UI --> RunEvents["GET /api/runs/:runId/events"]
  UI --> Status["GET /api/services/status"]
  UI --> UpstreamStats["GET /api/upstream/stats"]
  UI --> Audit["GET /api/audit"]
  UI --> Delegations["GET /api/delegations"]
  UI --> Reset["POST /api/demo/reset"]
  UI --> Sandbox["POST /api/sandbox/run"]
  External[Manual Caller] --> LegacyGateway["POST /api/gateway"]
```

## `POST /api/demo/run`

Launches a real signed agent request against the CLI gateway running at
`GATEWAY_URL` or `http://localhost:8787`. The route returns immediately with a
`runId`; live steps arrive through `/api/events/stream`.

Request:

```json
{
  "scenario": "trusted"
}
```

Allowed values:

```txt
trusted
sketchy
```

Response shape:

```json
{
  "runId": "uuid",
  "expectedRequests": 2
}
```

## `POST /api/events/ingest`

The gateway posts every live step to Studio.

```json
{
  "event": {
    "id": "uuid",
    "runId": "uuid",
    "requestId": "uuid",
    "ts": "2026-06-01T12:00:00.000Z",
    "phase": "verify_agent_identity",
    "label": "Ed25519 agent signature verified",
    "status": "passed",
    "durationMs": 651,
    "details": {}
  }
}
```

## `GET /api/events/stream`

Server-sent event stream consumed by the dashboard:

```ts
const source = new EventSource("/api/events/stream");
```

## `GET /api/runs/:runId/events`

Returns the in-memory run state for a live demo run:

```json
{
  "runId": "uuid",
  "events": [],
  "decisions": []
}
```

## `GET /api/services/status`

Checks Sample API, Gateway, Studio event stream, policy file, and demo delay.

## `GET /api/upstream/stats`

Proxies the sample upstream API stats:

```json
{
  "online": true,
  "stats": {
    "patientReadHits": 1,
    "priorAuthHits": 1,
    "bulkDumpHits": 0
  }
}
```

## `POST /api/gateway`

Runs the protected gateway decision engine for a signed healthcare API request.

Request:

```json
{
  "method": "GET",
  "path": "/fhir/patient/maya-001",
  "body": {},
  "headers": {
    "x-agent-id": "trusted-care-agent",
    "x-agent-timestamp": "2026-06-01T12:00:00.000Z",
    "x-agent-nonce": "unique-nonce",
    "x-agent-signature": "base64url-signature"
  }
}
```

Legacy in-process gateway route retained for local testing. The installable CLI
gateway uses the same signature ideas but runs as a real reverse proxy.

Signature base string for the legacy route:

```txt
HEALTHAGENT-PASSPORT-V1
METHOD
PATH
BODY_HASH
TIMESTAMP
NONCE
```

Response:

```json
{
  "requestId": "uuid",
  "allowed": true,
  "httpStatus": 200,
  "decision": "allow",
  "reason": "Agent identity, sandbox behavior, patient delegation, scopes, trust route, and payment checks passed.",
  "trust": {},
  "payment": {},
  "data": {},
  "audit": {}
}
```

Decision values:

```txt
allow
deny
sandbox
throttle
```

## `POST /api/sandbox/run`

Runs a sandbox scenario and stores the `SandboxRun` record.

Request:

```json
{
  "scenario": "trusted-care-agent"
}
```

Allowed values:

```txt
trusted-care-agent
sketchy-scraper-agent
```

Response:

```json
{
  "ok": true,
  "mode": "mock",
  "runtime": "deterministic mock sandbox",
  "agentId": "trusted-care-agent",
  "riskScore": 4,
  "verdict": "clean",
  "routeImpact": "no_change",
  "signals": []
}
```

## `GET /api/audit`

Returns the latest audit events.

Response:

```json
{
  "events": []
}
```

Audit events include:

- agent ID
- patient ID
- method and path
- decision and route
- trust tier and score
- required and granted scopes
- request hash and response hash
- sandbox verdict and risk score
- latency and HTTP status
- denial or allow reason

## `GET /api/delegations`

Returns the demo patient and active trusted delegation.

Response:

```json
{
  "patient": {},
  "delegation": {
    "agentId": "trusted-care-agent",
    "patientId": "maya-001",
    "scopes": []
  }
}
```

## `POST /api/demo/reset`

Resets local demo data. Disabled in production.

Required header:

```txt
x-demo-reset-token: local-demo-reset
```

Response:

```json
{
  "ok": true
}
```

## `GET /api/health`

Returns health and feature-flag status.

Response:

```json
{
  "ok": true,
  "name": "HealthAgent Passport",
  "demoMode": {
    "valiron": "mock",
    "solana": "mock",
    "payment": "mock",
    "llm": "mock",
    "sandbox": "mock"
  }
}
```
