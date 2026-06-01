#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Command } from "commander";
import {
  getSeedCase,
  loadRoiConfig,
  signText
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
    console.log(`${label}: found ${path}`);
  } catch {
    console.log(`${label}: missing ${path}`);
  }
}

async function checkUrl(label: string, url: string) {
  try {
    const response = await fetch(url);
    console.log(`${label}: ${response.ok ? "online" : "unhealthy"} ${url}`);
  } catch {
    console.log(`${label}: offline ${url}`);
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
  .option("--studio <url>", "Studio URL", "http://localhost:3000")
  .description("Trigger a synthetic electronic prior-auth run through Studio")
  .action(async (options) => {
    const response = await fetch(new URL("/api/demo/run", options.studio), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario: "complete", caseId: options.case })
    });
    console.log(JSON.stringify(await response.json(), null, 2));
  });

program
  .command("doctor")
  .description("Check local PriorAuth Passport demo services")
  .action(async () => {
    console.log(`Node: ${process.version}`);
    await checkFile("ROI config", "config/roi.yaml");
    await checkFile("Policy config", "config/priorauth-policy.yaml");
    await checkFile("Trusted agent", ".priorauth/agents/trusted-priorauth-agent.json");
    await checkUrl("Studio", "http://localhost:3000/api/health");
    await checkUrl("EHR API", "http://localhost:4001/health");
    await checkUrl("Payer API", "http://localhost:4002/health");
    const roi = loadRoiConfig(fromUserCwd("config/roi.yaml"));
    console.log(`Annual demo volume: ${roi.input.authVolume}`);
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
    const demoPrivateKey = "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIC9rIBBz5mUezdJPOV+La284nat6bEdrFPS6v7zzCqbY\n-----END PRIVATE KEY-----\n";
    console.log(JSON.stringify({
      payload,
      signature: signText(demoPrivateKey, JSON.stringify(payload))
    }, null, 2));
  });

program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
