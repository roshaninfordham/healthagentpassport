# Demo Guide

This guide is for running a clear live demo of HealthAgent Passport.

## Setup

```bash
pnpm install
pnpm demo:reset
pnpm dev
```

Open the local URL printed by Next.js.

## Visual Walkthrough

```mermaid
flowchart LR
  Hero[Hero: product in 10 seconds] --> Patient[Patient Passport]
  Patient --> Controls[Demo Controls]
  Controls --> Trusted[Run TrustedCareAgent]
  Trusted --> Granted[ACCESS GRANTED]
  Granted --> Sketchy[Run SketchyScraperAgent]
  Sketchy --> Denied[ACCESS DENIED]
  Denied --> Audit[Audit Ledger Proof]
```

## Opening Script

Healthcare APIs were built for humans and apps, not autonomous AI agents. Before
an agent touches patient records, payer APIs, pharmacy workflows, or public
health infrastructure, we need to know:

```txt
Who is this agent?
What is it allowed to access?
How does it behave under observation?
Should it be routed to production, throttled, sandboxed, or blocked?
```

HealthAgent Passport answers those questions before forwarding a request.

## Trusted Agent Flow

Click `Run TrustedCareAgent`.

Expected result:

```txt
ACCESS GRANTED
Trust score: 97/100
Tier: AAA
Route: prod
Sandbox: CLEAN risk 4/100
FHIR resources: 5
Prior auth: pa-demo-...
Audit events: 2
```

Talk track:

```txt
TrustedCareAgent signs its request. The gateway verifies identity, prevents
replay, checks Maya's active delegation, validates the required scopes, observes
clean sandbox behavior, computes a prod trust route, writes an audit event, and
only then calls the protected synthetic FHIR API.
```

## Sketchy Agent Flow

Click `Run SketchyScraperAgent`.

Expected result:

```txt
ACCESS DENIED
Trust score: 15/100
Tier: C
Route: sandbox_only
Sandbox: BLOCK risk 100/100
Protected API not called
Audit events: +1
```

Talk track:

```txt
SketchyScraperAgent tries a bulk dump path. The behavioral sandbox detects
secret probing, filesystem probing, outbound network intent, and bulk access.
The route is downgraded to sandbox_only, and the gateway denies access before
protected health data is returned.
```

## Closing Line

```txt
Identity tells us who the agent claims to be.
Consent tells us what it may access.
Sandboxing tells us how it behaves.
HealthAgent Passport turns those signals into a route decision and audit trail.
```

## Demo Checklist

- Page loads and hero is understandable in 10 seconds.
- Patient card shows Maya Patel.
- Consent hash and mock Solana anchor are visible.
- `Run TrustedCareAgent` shows `ACCESS GRANTED`.
- Trusted route is `prod`.
- Trusted sandbox result is `CLEAN risk 4/100`.
- Synthetic FHIR and prior-auth details appear.
- Audit rows appear for the trusted GET and POST.
- `Run SketchyScraperAgent` shows `ACCESS DENIED`.
- Sketchy route is `sandbox_only`.
- Sketchy sandbox result is `BLOCK risk 100/100`.
- UI states that protected API was not called.
- Audit row explains the denial.

## Troubleshooting

If the page opens on a different port, use the URL printed by Next.js.

If the database looks stale:

```bash
pnpm demo:reset
```

If dependencies are missing:

```bash
pnpm install
```

If you want a full verification pass:

```bash
pnpm verify
pnpm e2e
```
