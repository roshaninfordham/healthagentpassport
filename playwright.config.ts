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
      "pnpm exec concurrently -n API,GATEWAY,STUDIO -c blue,green,magenta \"PORT=4101 pnpm --filter sample-health-api dev\" \"pnpm --filter @healthagent/passport-cli dev gateway --policy ./healthagent.yaml --upstream http://localhost:4101 --port 8877 --studio http://localhost:3100 --demo-delay 10\" \"GATEWAY_URL=http://localhost:8877 SAMPLE_API_URL=http://localhost:4101/health SAMPLE_API_STATS_URL=http://localhost:4101/stats pnpm exec next dev -p 3100\"",
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
