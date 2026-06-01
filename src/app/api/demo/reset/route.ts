import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

export async function POST(request: Request) {
  const token = request.headers.get("x-demo-reset-token");

  if (token !== process.env.DEMO_RESET_TOKEN) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "Demo reset disabled in production." },
      { status: 403 }
    );
  }

  await execFileAsync("pnpm", ["demo:reset"], {
    timeout: 60_000,
    maxBuffer: 1024 * 1024
  });

  return Response.json({ ok: true });
}
