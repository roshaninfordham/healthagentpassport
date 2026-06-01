const services = [
  {
    label: "EHR API",
    url: process.env.EHR_API_URL ?? "http://localhost:4001",
    health: `${process.env.EHR_API_URL ?? "http://localhost:4001"}/health`
  },
  {
    label: "Payer API",
    url: process.env.PAYER_API_URL ?? "http://localhost:4002",
    health: `${process.env.PAYER_API_URL ?? "http://localhost:4002"}/health`
  },
  {
    label: "Studio",
    url: process.env.APP_BASE_URL ?? "http://localhost:3000",
    health: `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/health`
  }
];

async function waitFor(url, timeoutMs = 45000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // Service is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

function line(label, url, status) {
  const content = `${label.padEnd(10)} ${url.padEnd(29)} ${status.padEnd(10)}`;
  return `| ${content.padEnd(width - 2)} |`;
}

const results = await Promise.all(
  services.map(async (service) => ({
    ...service,
    healthy: await waitFor(service.health)
  }))
);

const width = 62;
console.log("");
console.log(`+${"-".repeat(width)}+`);
console.log(`| ${"PriorAuth Passport Demo".padEnd(width - 2)} |`);
console.log(`+${"-".repeat(width)}+`);
for (const service of results) {
  console.log(line(service.label, service.url, service.healthy ? "healthy" : "offline"));
}
console.log(`+${"-".repeat(width)}+`);
console.log("");
console.log("Open Studio:");
console.log(process.env.APP_BASE_URL ?? "http://localhost:3000");
console.log("");
