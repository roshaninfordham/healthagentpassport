#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Command } from "commander";
import {
  getSeedCase,
  loadRoiConfig,
  signText,
  type PriorAuthRunEvent
} from "@priorauth/passport-core";

const program = new Command();
const userCwd = process.env.INIT_CWD ?? process.cwd();

function fromUserCwd(path: string) {
  return resolve(userCwd, path);
}

async function writeJson(path: string, value: unknown) {
  const resolved = fromUserCwd(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(value, null, 2)}\n`);
}

async function checkFile(label: string, path: string) {
  try {
    await access(fromUserCwd(path));
    console.log(`[ok] ${label}: found ${path}`);
    return true;
  } catch {
    console.log(`[missing] ${label}: missing ${path}`);
    return false;
  }
}

async function checkUrl(label: string, url: string) {
  try {
    const response = await fetch(url);
    console.log(
      `${response.ok ? "[ok]" : "[warn]"} ${label}: ${
        response.ok ? "reachable" : "unhealthy"
      } ${url}`
    );
    return response.ok;
  } catch {
    console.log(`[offline] ${label}: offline ${url}`);
    return false;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function eventLine(event: PriorAuthRunEvent) {
  const prefix =
    event.status === "passed"
      ? "[ok]"
      : event.status === "running"
        ? "[run]"
        : event.status === "blocked"
          ? "[blocked]"
          : event.status === "failed"
            ? "[failed]"
            : "[info]";
  const summary =
    typeof event.details?.summary === "string" ? ` - ${event.details.summary}` : "";

  return `${prefix} ${event.label}${summary}`;
}

async function waitForRun(studio: string, runId: string) {
  const seen = new Set<string>();

  while (true) {
    const response = await fetch(new URL(`/api/runs/${runId}/events`, studio), {
      cache: "no-store"
    });

    if (response.ok) {
      const run = (await response.json()) as {
        events: PriorAuthRunEvent[];
        result: {
          submission?: {
            priorAuthId?: string;
            decision?: string;
            status?: string;
          };
          roi?: {
            transactionCostSavingsUsd?: number;
            minutesSavedBaseline?: number;
            bestCaseTimeSavedMinutes?: number;
          };
          audit?: { auditId?: string };
        };
      };

      for (const event of run.events) {
        if (seen.has(event.id)) continue;
        seen.add(event.id);
        console.log(eventLine(event));
      }

      const last = run.events[run.events.length - 1];
      if (
        last?.phase === "complete" ||
        last?.phase === "blocked" ||
        last?.status === "failed"
      ) {
        const submission = run.result.submission;
        const roi = run.result.roi;
        const audit = run.result.audit;

        console.log("");
        console.log("PriorAuth Passport result");
        console.log(`Status: ${last.phase === "complete" ? "submitted" : "not_submitted"}`);
        if (submission?.priorAuthId) {
          console.log(`PriorAuth ID: ${submission.priorAuthId}`);
        }
        if (submission?.decision) {
          console.log(`Decision: ${submission.decision}`);
        }
        if (roi?.transactionCostSavingsUsd !== undefined) {
          console.log(`Transaction savings: $${roi.transactionCostSavingsUsd.toFixed(2)}`);
        }
        if (roi?.minutesSavedBaseline !== undefined) {
          console.log(`Baseline time saved: ${roi.minutesSavedBaseline} min`);
        }
        if (roi?.bestCaseTimeSavedMinutes !== undefined) {
          console.log(`Best-case time saved: ${roi.bestCaseTimeSavedMinutes} min`);
        }
        if (audit?.auditId) {
          console.log(`Audit ID: ${audit.auditId}`);
        }
        return;
      }
    }

    await sleep(350);
  }
}

program
  .name("priorauth")
  .description("PriorAuth Passport CLI")
  .version("0.1.0");

program
  .command("init")
  .description("Create PriorAuth Passport config folders")
  .action(async () => {
    await writeJson(".priorauth/delegations/maya-priorauth-delegation.json", {
      id: "delegation-maya-priorauth",
      patientId: "maya-001",
      agentId: "trusted-priorauth-agent",
      purpose: "prior-authorization-administrative-workflow",
      status: "active",
      expiresAt: "2030-01-01T00:00:00.000Z",
      syntheticOnly: true
    });
    console.log("Created .priorauth demo config.");
  });

program
  .command("demo")
  .description("Print the local demo command")
  .action(() => {
    console.log("Run `pnpm demo` and open http://localhost:3000");
  });

program
  .command("submit")
  .option("--case <caseId>", "prior-auth case id", "pa-case-001")
  .option("--patient <patientId>", "synthetic patient id", "maya-001")
  .option("--service <serviceCode>", "service code", "93306")
  .option("--payer <payerId>", "payer id", "demo-health-plan")
  .option("--scenario <scenario>", "complete or incomplete", "complete")
  .option("--studio <url>", "Studio URL", "http://localhost:3000")
  .description("Trigger a synthetic electronic prior-auth run through Studio")
  .action(async (options) => {
    console.log("Running electronic prior authorization...");
    console.log(`Studio: ${options.studio}`);
    console.log(`Case: ${options.case}`);
    console.log("");

    const response = await fetch(new URL("/api/demo/run", options.studio), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenario: options.scenario === "incomplete" ? "incomplete" : "complete",
        caseId: options.case,
        patientId: options.patient,
        serviceCode: options.service,
        payerId: options.payer
      })
    });
    const json = (await response.json()) as { runId?: string; error?: string };

    if (!response.ok || !json.runId) {
      throw new Error(json.error || "Unable to start prior-auth run.");
    }

    await waitForRun(options.studio, json.runId);
  });

program
  .command("doctor")
  .description("Check local PriorAuth Passport demo services")
  .action(async () => {
    console.log("PriorAuth Passport doctor check");
    console.log("");
    console.log(`[ok] Node version: ${process.version}`);
    await checkFile("ROI config", "config/roi.yaml");
    await checkFile("Policy config", "config/priorauth-policy.yaml");
    await checkFile(
      "TrustedPriorAuthAgent key",
      ".priorauth/agents/trusted-priorauth-agent.json"
    );
    await checkUrl("Studio", "http://localhost:3000/api/health");
    await checkUrl("Sample EHR API", "http://localhost:4001/health");
    await checkUrl("Sample Payer API", "http://localhost:4002/health");
    await checkUrl(
      "Synthetic patient data",
      "http://localhost:4001/fhir/Patient/maya-001"
    );
    const roi = loadRoiConfig(fromUserCwd("config/roi.yaml"));
    console.log(`[ok] Annual demo volume: ${roi.input.authVolume}`);
    console.log("");
    console.log("Ready to run electronic prior authorization demo.");
  });

program
  .command("sign")
  .description("Create a demo signed administrative transaction token")
  .action(() => {
    const payload = {
      id: randomUUID(),
      caseId: getSeedCase("pa-case-001").caseId,
      purpose: "prior-auth-submit",
      ts: new Date().toISOString()
    };
    const demoPrivateKey =
      "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIC9rIBBz5mUezdJPOV+La284nat6bEdrFPS6v7zzCqbY\n-----END PRIVATE KEY-----\n";
    console.log(
      JSON.stringify(
        {
          payload,
          signature: signText(demoPrivateKey, JSON.stringify(payload))
        },
        null,
        2
      )
    );
  });

program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
