# Developer Quickstart

HealthAgent Passport is now a developer product demo: a TypeScript SDK, CLI,
reverse proxy gateway, sample health API, and live Studio control plane.

## Run The Full Demo

```bash
pnpm install
pnpm demo
```

Open:

```txt
http://localhost:3000
```

The command starts:

```txt
Sample health API        http://localhost:4001
HealthAgent gateway      http://localhost:8787
Studio dashboard         http://localhost:3000
```

## CLI Flow

```bash
pnpm sample-api
pnpm gateway
pnpm studio
```

Then, in another terminal:

```bash
pnpm --filter @healthagent/passport-cli dev agent run trusted \
  --gateway http://localhost:8787 \
  --patient maya-001

pnpm --filter @healthagent/passport-cli dev agent run attack \
  --gateway http://localhost:8787
```

Trusted traffic is forwarded upstream. Attack traffic receives HTTP 403 before
the upstream API is called.

## Protect Another API

Edit [healthagent.yaml](../healthagent.yaml), then run:

```bash
npx healthagent gateway \
  --policy ./healthagent.yaml \
  --upstream https://my-health-api.example \
  --port 8787 \
  --studio http://localhost:3000
```

Point agents at:

```txt
http://localhost:8787
```

not the upstream API directly.

## SDK Flow

```ts
import { createGateway, signAgentRequest } from "@healthagent/passport";

const gateway = createGateway({
  policyFile: "./healthagent.yaml",
  upstream: "http://localhost:4001",
  studio: "http://localhost:3000",
  demoDelayMs: 650
});

await gateway.listen(8787);

const signed = await signAgentRequest({
  agentKeyFile: ".hap/agents/trusted-care-agent.json",
  method: "GET",
  path: "/fhir/patient/maya-001"
});

await fetch("http://localhost:8787/fhir/patient/maya-001", {
  headers: signed.headers
});
```

## Policy File

The demo policy lives in [healthagent.yaml](../healthagent.yaml). It defines:

- service metadata and upstream URL
- agent public key files
- protected routes
- required FHIR/SMART scopes
- minimum trust scores
- sandbox risk thresholds
- deny rules such as `/fhir/all`

## Demo Limits

- Synthetic data only
- No PHI
- No medical advice
- Deterministic mock sandbox by default
- In-memory live event store for hackathon demo speed
