import fs from "node:fs";

const scenarioName = process.argv[2];

if (!scenarioName) {
  console.error(
    JSON.stringify({
      ok: false,
      error: "Missing scenario name"
    })
  );
  process.exit(1);
}

const allowed = new Set(["trusted-care-agent", "sketchy-scraper-agent"]);

if (!allowed.has(scenarioName)) {
  console.error(
    JSON.stringify({
      ok: false,
      error: "Unknown scenario"
    })
  );
  process.exit(1);
}

const path = `/app/scenarios/${scenarioName}.json`;
const scenario = JSON.parse(fs.readFileSync(path, "utf8"));
const startedAt = Date.now();

const report = {
  ok: true,
  agentId: scenario.agentId,
  scenario: scenario.scenario,
  runtime: "container",
  observedEvents: scenario.simulatedRuntimeEvents,
  stdout: [
    `Starting behavioral sandbox for ${scenario.agentId}`,
    `Loaded ${scenario.intendedActions.length} intended actions`,
    "Sandbox execution complete"
  ],
  stderr: [],
  durationMs: Date.now() - startedAt
};

console.log(JSON.stringify(report));
