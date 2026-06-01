import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry"
  },
  webServer: {
    command:
      "pnpm exec concurrently -n EHR,PAYER,STUDIO -c cyan,yellow,magenta \"PORT=4101 pnpm --filter sample-ehr-api dev\" \"PORT=4102 pnpm --filter sample-payer-api dev\" \"EHR_API_URL=http://localhost:4101 PAYER_API_URL=http://localhost:4102 DEMO_STEP_DELAY_MS=10 DEMO_ALLOW_FAST_STEPS=true pnpm exec next dev -p 3100\"",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
