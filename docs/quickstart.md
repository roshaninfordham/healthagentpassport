# Quickstart

## Prerequisites

- Node.js 20+
- pnpm
- No external payer, EHR, wallet, LLM, or PHI dependency

## Install

```bash
pnpm install
```

## Run the Demo

```bash
pnpm studio
```

Open [http://localhost:3000](http://localhost:3000).

The default web demo uses internal Next.js API routes, so it also works on
Vercel without local EHR or payer services.

Use `pnpm demo` only when you want the optional Fastify EHR and payer services
running beside Studio for local API experiments.

```mermaid
flowchart LR
  Demo["pnpm studio"] --> Studio["PriorAuth Studio on port 3000"]
  Studio --> EHR["/api/demo/ehr routes"]
  Studio --> Payer["/api/demo/payer routes"]
  Studio --> Stream["POST /api/demo/stream"]
```

## Try Both Cases

1. Click `Start live demo`.
2. Watch the timeline stream EHR reads, payer requirements, evidence matching,
   package build, payer submission, ROI, and audit.
3. Click `Check gaps`.
4. Confirm missing evidence appears and no payer submission is sent.

## CLI

```bash
pnpm run doctor
pnpm priorauth submit --case pa-case-001
pnpm priorauth submit --case pa-case-001 --scenario incomplete
pnpm priorauth sign
```

`pnpm priorauth submit` starts a Studio run and then polls the run events, so
the terminal and browser show the same agent actions.

## Environment

```bash
NEXT_PUBLIC_DEMO_MODE="vercel"
NEXT_PUBLIC_SHOW_LOCALHOST_STATUS="false"
DEMO_STEP_DELAY_MS="1200"
ALLOW_REAL_PHI="false"
SYNTHETIC_DATA_ONLY="true"
```

Set `EHR_API_URL` or `PAYER_API_URL` only when you intentionally want to use the
optional local Fastify services.

## Expected Output

The complete case should show:

- Prior-auth ID like `PA-DEMO-1001`
- Payer decision `pending_payer_review`
- `$5.18` transaction savings
- `7 min` baseline time saved
- Evidence hash and ROI hash
- HTTP proof rows with status, latency, and response hash

The incomplete case should show:

- Missing `Recent relevant observation`
- Missing `Referral note`
- `needs_human_review`
- Payer submission skipped
- Draft audit packet

## Studio Tabs

| Tab | Purpose |
| --- | --- |
| Overview | Product explanation, service status, system map, market assumptions |
| Prior Auth Inbox | Operator case queue with complete and incomplete demo cases |
| Live Workflow | Timeline, tool calls, request/response inspector |
| ROI Calculator | Per-case and adjustable practice-level ROI model |
| Evidence & Requirements | Payer requirements and matched/missing EHR evidence |
| Audit Ledger | API proof, audit hashes, copy/download packet |
| Developer Mode | CLI and SDK integration examples |
| Settings | ROI assumptions, payer rules, agent identity, safety boundary |
