const DEFAULT_DEMO_STEP_DELAY_MS = 2000;
const MIN_VISIBLE_DEMO_STEP_DELAY_MS = 2000;

function parseDelayMs(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_DEMO_STEP_DELAY_MS;
}

export function getDemoStepDelayMs() {
  const requestedDelayMs = parseDelayMs(process.env.DEMO_STEP_DELAY_MS);

  if (process.env.DEMO_ALLOW_FAST_STEPS === "true") {
    return requestedDelayMs;
  }

  return Math.max(requestedDelayMs, MIN_VISIBLE_DEMO_STEP_DELAY_MS);
}

